"""Modal training and inference service for the Tangle buyer-profile demo.

The public Tangle site never exposes the training functions. A capped offline run
creates synthetic teacher examples, fine-tunes a Qwen3.5-0.8B LoRA adapter, and
writes evaluation metadata to a private Modal Volume. The only web function is
proxy-authenticated inference for a single synthetic customer at a time.
"""

from __future__ import annotations

import csv
import json
import pathlib
import re
import time
from contextlib import nullcontext
from typing import Any

import modal

MINUTES = 60
APP_NAME = "tangle-buyer-profile-lab"
TEACHER_MODEL = "Qwen/Qwen3.5-4B"
STUDENT_MODEL = "Qwen/Qwen3.5-0.8B"
ARTIFACT_ROOT = pathlib.Path("/artifacts/buyer-profile-lab")
DATASET_PATH = pathlib.Path("/root/buyer-profiles.csv")
DEFAULT_SAMPLE_COUNT = 960
DEFAULT_MAX_STEPS = 300

local_dataset_path = (
    pathlib.Path(__file__).parent.parent
    / "public/datasets/northstar-commerce/buyer-profiles.csv"
)

runtime_image = (
    modal.Image.debian_slim(python_version="3.12")
    .uv_pip_install(
        "accelerate==1.14.0",
        "datasets==5.0.1",
        "fastapi[standard]==0.141.1",
        "peft==0.20.0",
        "pillow==12.1.0",
        "torch==2.9.1",
        "torchvision==0.24.1",
        "transformers==5.16.1",
        "trl==1.12.0",
    )
    .env(
        {
            "HF_HOME": "/model-cache",
            "HF_XET_HIGH_PERFORMANCE": "1",
            "TOKENIZERS_PARALLELISM": "false",
        }
    )
    .add_local_file(local_dataset_path, remote_path=str(DATASET_PATH))
)

app = modal.App(APP_NAME)
model_cache = modal.Volume.from_name(
    "tangle-buyer-profile-model-cache", create_if_missing=True
)
artifacts = modal.Volume.from_name(
    "tangle-buyer-profile-artifacts", create_if_missing=True
)
volumes = {"/model-cache": model_cache, "/artifacts": artifacts}

INPUT_FIELDS = (
    "customer_id",
    "region",
    "acquisition_channel",
    "membership_tier",
    "tenure_months",
    "orders",
    "spend",
    "avg_basket",
    "discount_share",
    "return_rate",
    "support_tickets",
    "days_since_order",
    "email_engagement",
    "satisfaction_score",
    "lifetime_value",
    "category_affinities",
    "recent_timeline",
)

OUTPUT_FIELDS = (
    "summary",
    "lifecycle_stage",
    "category_affinities",
    "price_sensitivity",
    "purchase_cadence",
    "churn_risk",
    "next_best_action",
    "evidence",
)


def read_rows() -> list[dict[str, str]]:
    with DATASET_PATH.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def model_input(row: dict[str, Any]) -> dict[str, Any]:
    return {field: row.get(field, "") for field in INPUT_FIELDS}


def target_profile(row: dict[str, Any], summary: str | None = None) -> dict[str, Any]:
    return {
        "summary": summary or row["profile_summary"],
        "lifecycle_stage": row["lifecycle_stage"],
        "category_affinities": str(row["category_affinities"]).split("|"),
        "price_sensitivity": row["price_sensitivity"],
        "purchase_cadence": row["purchase_cadence"],
        "churn_risk": row["churn_risk"],
        "next_best_action": row["next_best_action"],
        "evidence": str(row["evidence"]).split("|"),
    }


def allowed_evidence(row: dict[str, Any]) -> list[str]:
    """Build citations only from the model's non-label input fields."""
    top_category = str(row.get("category_affinities", "")).split("|")[0]
    return [
        f"days_since_order:{row.get('days_since_order', '')}",
        f"orders:{row.get('orders', '')}",
        f"discount_share:{row.get('discount_share', '')}",
        f"return_rate:{row.get('return_rate', '')}",
        f"top_category:{top_category}",
    ]


SYSTEM_PROMPT = """You create compact buyer profiles for a retailer.
Use only the supplied synthetic customer signals. Return one JSON object with
exactly these keys: summary, lifecycle_stage, category_affinities,
price_sensitivity, purchase_cadence, churn_risk, next_best_action, evidence.
Never add personal data. Evidence entries must be copied from the supplied
evidence list. Do not wrap the JSON in markdown."""


def profile_prompt(row: dict[str, Any], include_labels: bool = False) -> str:
    payload: dict[str, Any] = {"customer": model_input(row)}
    payload["allowed_evidence"] = allowed_evidence(row)
    if include_labels:
        payload["fixed_labels"] = {
            key: value
            for key, value in target_profile(row).items()
            if key not in {"summary", "evidence"}
        }
        payload["instruction"] = (
            "Keep every fixed label unchanged. Write a concise grounded summary "
            "and return the complete JSON object."
        )
    else:
        payload["instruction"] = "Infer the complete structured buyer profile."
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=True)


def messages_for(row: dict[str, Any], profile: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": profile_prompt(row)},
        {
            "role": "assistant",
            "content": json.dumps(profile, separators=(",", ":")),
        },
    ]


def clean_json(text: str) -> dict[str, Any] | None:
    candidate = text.strip()
    candidate = re.sub(r"^```(?:json)?\s*", "", candidate)
    candidate = re.sub(r"\s*```$", "", candidate)
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        value = json.loads(candidate[start : end + 1])
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def normalize_teacher_output(row: dict[str, Any], text: str) -> dict[str, Any]:
    parsed = clean_json(text) or {}
    summary = parsed.get("summary")
    if not isinstance(summary, str) or not (24 <= len(summary) <= 280):
        summary = row["profile_summary"]
    return target_profile(row, summary=summary.strip().replace("\n", " "))


def render_prompts(processor: Any, rows: list[dict[str, Any]]) -> list[str]:
    return [
        processor.apply_chat_template(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": profile_prompt(row)},
            ],
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False,
        )
        for row in rows
    ]


def generate_texts(
    model: Any,
    processor: Any,
    rows: list[dict[str, Any]],
    *,
    batch_size: int,
    do_sample: bool,
    include_labels: bool = False,
) -> list[str]:
    import torch

    texts: list[str] = []
    tokenizer = processor.tokenizer
    tokenizer.padding_side = "left"
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    for offset in range(0, len(rows), batch_size):
        batch = rows[offset : offset + batch_size]
        prompts = [
            processor.apply_chat_template(
                [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": profile_prompt(row, include_labels=include_labels),
                    },
                ],
                tokenize=False,
                add_generation_prompt=True,
                enable_thinking=False,
            )
            for row in batch
        ]
        encoded = processor(
            text=prompts,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=1_024,
        )
        encoded = {key: value.to(model.device) for key, value in encoded.items()}
        with torch.inference_mode():
            generated = model.generate(
                **encoded,
                max_new_tokens=220,
                do_sample=do_sample,
                temperature=0.7 if do_sample else None,
                top_p=0.9 if do_sample else None,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        prompt_length = encoded["input_ids"].shape[1]
        texts.extend(
            processor.batch_decode(
                generated[:, prompt_length:], skip_special_tokens=True
            )
        )
    return texts


def write_json(path: pathlib.Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: pathlib.Path, values: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(value, separators=(",", ":")) + "\n" for value in values),
        encoding="utf-8",
    )


@app.cls(
    image=runtime_image,
    gpu="L40S",
    timeout=24 * MINUTES,
    max_containers=1,
    volumes=volumes,
)
class TeacherDataGenerator:
    @modal.enter()
    def load(self) -> None:
        import torch
        from transformers import AutoModelForImageTextToText, AutoProcessor

        self.processor = AutoProcessor.from_pretrained(TEACHER_MODEL)
        self.model = AutoModelForImageTextToText.from_pretrained(
            TEACHER_MODEL,
            dtype=torch.bfloat16,
            device_map="cuda",
            attn_implementation="sdpa",
        )
        self.model.eval()

    @modal.method()
    def build(self, sample_count: int = DEFAULT_SAMPLE_COUNT) -> dict[str, Any]:
        rows = [row for row in read_rows() if row["split"] == "train"]
        sample_count = min(max(32, sample_count), len(rows))
        rows = rows[:sample_count]
        started = time.perf_counter()
        outputs = generate_texts(
            self.model,
            self.processor,
            rows,
            batch_size=12,
            do_sample=True,
            include_labels=True,
        )
        examples = [
            {
                "customer_id": row["customer_id"],
                "messages": messages_for(row, normalize_teacher_output(row, output)),
            }
            for row, output in zip(rows, outputs, strict=True)
        ]
        write_jsonl(ARTIFACT_ROOT / "train.jsonl", examples)
        metadata = {
            "teacherModel": TEACHER_MODEL,
            "studentModel": STUDENT_MODEL,
            "trainingExamples": len(examples),
            "generationMinutes": round((time.perf_counter() - started) / 60, 2),
        }
        write_json(ARTIFACT_ROOT / "dataset.json", metadata)
        artifacts.commit()
        model_cache.commit()
        return metadata


def parse_prediction(text: str, row: dict[str, Any]) -> dict[str, Any]:
    parsed = clean_json(text)
    if parsed is None:
        return {
            "customerId": row["customer_id"],
            "valid": False,
            "summary": text[:280].strip(),
            "lifecycleStage": "unknown",
            "categoryAffinities": [],
            "priceSensitivity": "unknown",
            "purchaseCadence": "unknown",
            "churnRisk": "unknown",
            "nextBestAction": "",
            "evidence": [],
        }
    valid = all(field in parsed for field in OUTPUT_FIELDS)
    return {
        "customerId": row["customer_id"],
        "valid": valid,
        "summary": str(parsed.get("summary", ""))[:280],
        "lifecycleStage": str(parsed.get("lifecycle_stage", "unknown")),
        "categoryAffinities": list(parsed.get("category_affinities", []))[:3]
        if isinstance(parsed.get("category_affinities"), list)
        else [],
        "priceSensitivity": str(parsed.get("price_sensitivity", "unknown")),
        "purchaseCadence": str(parsed.get("purchase_cadence", "unknown")),
        "churnRisk": str(parsed.get("churn_risk", "unknown")),
        "nextBestAction": str(parsed.get("next_best_action", ""))[:180],
        "evidence": list(parsed.get("evidence", []))[:6]
        if isinstance(parsed.get("evidence"), list)
        else [],
    }


def score_predictions(
    rows: list[dict[str, Any]], predictions: list[dict[str, Any]]
) -> dict[str, float]:
    label_fields = (
        ("lifecycleStage", "lifecycle_stage"),
        ("priceSensitivity", "price_sensitivity"),
        ("purchaseCadence", "purchase_cadence"),
        ("churnRisk", "churn_risk"),
        ("nextBestAction", "next_best_action"),
    )
    schema = sum(1 for prediction in predictions if prediction["valid"]) / max(
        1, len(predictions)
    )
    label_hits = 0
    grounded = 0
    total_labels = len(predictions) * len(label_fields)
    for row, prediction in zip(rows, predictions, strict=True):
        label_hits += sum(
            str(prediction[prediction_key]).strip().lower()
            == str(row[row_key]).strip().lower()
            for prediction_key, row_key in label_fields
        )
        allowed = set(str(row["evidence"]).split("|"))
        evidence = prediction["evidence"]
        grounded += int(bool(evidence) and all(item in allowed for item in evidence))
    label_accuracy = label_hits / max(1, total_labels)
    evidence_grounding = grounded / max(1, len(predictions))
    judge_score = 100 * (
        schema * 0.25 + label_accuracy * 0.5 + evidence_grounding * 0.25
    )
    return {
        "schemaValidity": round(schema, 4),
        "labelAccuracy": round(label_accuracy, 4),
        "evidenceGrounding": round(evidence_grounding, 4),
        "judgeScore": round(judge_score, 1),
    }


def score_slices(
    rows: list[dict[str, Any]],
    base_predictions: list[dict[str, Any]],
    student_predictions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    slices = [
        ("At-risk shoppers", "lifecycle_stage", "at-risk"),
        ("High churn risk", "churn_risk", "high"),
        ("High price sensitivity", "price_sensitivity", "high"),
        ("Loyal shoppers", "lifecycle_stage", "loyal"),
    ]
    result = []
    for label, field, value in slices:
        indexes = [index for index, row in enumerate(rows) if row[field] == value]
        if not indexes:
            continue
        subset_rows = [rows[index] for index in indexes]
        base = [base_predictions[index] for index in indexes]
        student = [student_predictions[index] for index in indexes]
        result.append(
            {
                "label": label,
                "count": len(indexes),
                "baseScore": score_predictions(subset_rows, base)["judgeScore"],
                "studentScore": score_predictions(subset_rows, student)["judgeScore"],
            }
        )
    return result


@app.function(
    image=runtime_image,
    gpu="H100",
    timeout=30 * MINUTES,
    max_containers=1,
    volumes=volumes,
)
def train_student(max_steps: int = DEFAULT_MAX_STEPS) -> dict[str, Any]:
    import torch
    from datasets import Dataset
    from peft import LoraConfig
    from transformers import AutoModelForImageTextToText, AutoProcessor
    from trl import SFTConfig, SFTTrainer

    artifacts.reload()
    dataset_metadata = json.loads(
        (ARTIFACT_ROOT / "dataset.json").read_text(encoding="utf-8")
    )
    train_examples = [
        json.loads(line)
        for line in (ARTIFACT_ROOT / "train.jsonl")
        .read_text(encoding="utf-8")
        .splitlines()
        if line.strip()
    ]
    all_rows = read_rows()
    validation_rows = [row for row in all_rows if row["split"] == "validation"]
    test_rows = [row for row in all_rows if row["split"] == "test"][:80]
    validation_examples = [
        {"customer_id": row["customer_id"], "messages": messages_for(row, target_profile(row))}
        for row in validation_rows
    ]

    processor = AutoProcessor.from_pretrained(STUDENT_MODEL)
    model = AutoModelForImageTextToText.from_pretrained(
        STUDENT_MODEL,
        dtype=torch.bfloat16,
        device_map="cuda",
        attn_implementation="sdpa",
    )
    model.config.use_cache = False
    started = time.perf_counter()
    output_dir = ARTIFACT_ROOT / "checkpoints"
    max_steps = min(max(20, max_steps), 520)
    trainer = SFTTrainer(
        model=model,
        processing_class=processor,
        train_dataset=Dataset.from_list(train_examples),
        eval_dataset=Dataset.from_list(validation_examples),
        peft_config=LoraConfig(
            r=16,
            lora_alpha=32,
            lora_dropout=0.05,
            bias="none",
            target_modules="all-linear",
            task_type="CAUSAL_LM",
        ),
        args=SFTConfig(
            output_dir=str(output_dir),
            max_steps=max_steps,
            max_length=1_024,
            per_device_train_batch_size=8,
            per_device_eval_batch_size=8,
            gradient_accumulation_steps=2,
            learning_rate=2e-4,
            warmup_steps=0.05,
            lr_scheduler_type="cosine",
            weight_decay=0.01,
            bf16=True,
            logging_steps=10,
            eval_strategy="steps",
            eval_steps=70,
            save_strategy="steps",
            save_steps=70,
            save_total_limit=2,
            assistant_only_loss=True,
            report_to="none",
            seed=42,
            data_seed=42,
        ),
    )
    trainer.train()
    adapter_dir = ARTIFACT_ROOT / "adapter"
    trainer.save_model(str(adapter_dir))
    processor.save_pretrained(str(adapter_dir))

    evaluation_started = time.perf_counter()
    tuned_model = trainer.model
    tuned_model.eval()
    base_context = (
        tuned_model.disable_adapter()
        if hasattr(tuned_model, "disable_adapter")
        else nullcontext()
    )
    with base_context:
        base_texts = generate_texts(
            tuned_model,
            processor,
            test_rows,
            batch_size=12,
            do_sample=False,
        )
    student_texts = generate_texts(
        tuned_model,
        processor,
        test_rows,
        batch_size=12,
        do_sample=False,
    )
    base_predictions = [
        parse_prediction(text, row)
        for row, text in zip(test_rows, base_texts, strict=True)
    ]
    student_predictions = [
        parse_prediction(text, row)
        for row, text in zip(test_rows, student_texts, strict=True)
    ]
    base_score = score_predictions(test_rows, base_predictions)
    student_score = score_predictions(test_rows, student_predictions)
    loss_curve = [
        {"step": int(item["step"]), "loss": round(float(item["loss"]), 4)}
        for item in trainer.state.log_history
        if "loss" in item and "step" in item
    ]
    training_minutes = (evaluation_started - started) / 60
    evaluation_seconds = time.perf_counter() - evaluation_started
    metadata = {
        **dataset_metadata,
        "runId": f"modal-{int(time.time())}",
        "adapterVersion": time.strftime("%Y.%m.%d-%H%M", time.gmtime()),
        "maxSteps": max_steps,
        "trainingMinutes": round(training_minutes, 2),
        "evaluationExamples": len(test_rows),
        "profilesPerSecond": round(
            len(test_rows) / max(0.001, evaluation_seconds / 2), 2
        ),
        "lossCurve": loss_curve,
        "scorecard": {
            "teacher": {
                "name": "Curated teacher",
                "schemaValidity": 1.0,
                "labelAccuracy": 1.0,
                "evidenceGrounding": 1.0,
                "judgeScore": 100.0,
            },
            "base": {"name": "Qwen3.5-0.8B base", **base_score},
            "student": {"name": "Buyer profile student", **student_score},
        },
        "slices": score_slices(
            test_rows, base_predictions, student_predictions
        ),
    }
    write_json(ARTIFACT_ROOT / "run.json", metadata)
    artifacts.commit()
    model_cache.commit()
    return metadata


@app.cls(
    image=runtime_image,
    gpu="L4",
    timeout=140,
    max_containers=1,
    scaledown_window=120,
    volumes=volumes,
)
class BuyerProfileEndpoint:
    @modal.enter()
    def load(self) -> None:
        import torch
        from peft import PeftModel
        from transformers import AutoModelForImageTextToText, AutoProcessor

        artifacts.reload()
        if not (ARTIFACT_ROOT / "run.json").exists():
            raise RuntimeError("No completed buyer-profile training run is available.")
        self.metadata = json.loads(
            (ARTIFACT_ROOT / "run.json").read_text(encoding="utf-8")
        )
        self.processor = AutoProcessor.from_pretrained(ARTIFACT_ROOT / "adapter")
        base = AutoModelForImageTextToText.from_pretrained(
            STUDENT_MODEL,
            dtype=torch.bfloat16,
            device_map="cuda",
            attn_implementation="sdpa",
        )
        self.model = PeftModel.from_pretrained(base, ARTIFACT_ROOT / "adapter")
        self.model.eval()

    @modal.fastapi_endpoint(
        method="POST",
        label="buyer-profile",
        requires_proxy_auth=True,
    )
    def generate(self, request: dict[str, Any]) -> dict[str, Any]:
        record = request.get("record")
        if not isinstance(record, dict):
            from fastapi import HTTPException

            raise HTTPException(status_code=400, detail="record is required")
        missing = [field for field in INPUT_FIELDS if field not in record]
        if missing:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=400, detail=f"missing fields: {', '.join(missing)}"
            )
        started = time.perf_counter()
        text = generate_texts(
            self.model,
            self.processor,
            [record],
            batch_size=1,
            do_sample=False,
        )[0]
        profile = parse_prediction(text, record)
        return {
            "profile": profile,
            "latencyMs": round((time.perf_counter() - started) * 1_000),
            "experiment": self.metadata,
        }


@app.local_entrypoint()
def run(
    sample_count: int = DEFAULT_SAMPLE_COUNT,
    max_steps: int = DEFAULT_MAX_STEPS,
) -> None:
    dataset_result = TeacherDataGenerator().build.remote(sample_count=sample_count)
    print(json.dumps({"stage": "teacher-data", **dataset_result}, indent=2))
    training_result = train_student.remote(max_steps=max_steps)
    print(json.dumps({"stage": "complete", **training_result}, indent=2))
