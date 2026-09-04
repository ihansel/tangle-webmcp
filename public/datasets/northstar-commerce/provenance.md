# Northstar Commerce synthetic dataset

- Generated locally with deterministic JavaScript; no external model or private source records were used.
- Seed: 347727
- Anchor date: 2026-06-30
- Customers: 1800
- Orders: 19840
- Line items: 41626
- Products: 160
- Daily sales records: 730
- Buyer profile examples: 1800 (1,440 train / 180 validation / 180 test)
- Scenario: fictional Australian outdoor retailer with intentionally overlapping customer behaviours, probabilistic churn, and two years of daily demand.
- Validation: row counts, primary keys, foreign keys, numeric ranges, chronological dates, deterministic regeneration, and product co-purchase references.

The latent_segment field is retained for demo evaluation but is not used as a clustering feature. Daily sales include known retail demand drivers for comparing univariate and multivariate forecasts. Buyer profiles add compact purchase timelines and evidence-grounded structured targets for teacher generation, fine-tuning, and held-out evaluation. All names and identifiers are synthetic.
