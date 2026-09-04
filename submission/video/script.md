# Strand demo script

**Target runtime:** 2:38 (158 seconds)  
**Hard limit:** 2:59 after the final edit  
**Format:** 16:9 screen recording with separately recorded narration

## 0:00–0:14 — Hook and problem (14 s)

**On screen:** Begin on the clean Strand home page. Slowly move the cursor
across “A commerce story agents can build, run and explain.”

**Narration:**

> Machine-learning pipelines are visual for a reason: people need to see what
> changed. But an agent that only clicks pixels has to guess at nodes, ports, and
> state. Strand gives both of us one trustworthy canvas, built on Tangle.

## 0:14–0:30 — Product introduction (16 s)

**On screen:** Scroll just enough to reveal the four experiment rows, then pause
on churn, customer segments, and SKU embeddings.

**Narration:**

> We extended the open-source Tangle editor with ten structured browser tools and
> a local ML runner. These demos use one synthetic retailer to predict churn,
> discover customer segments, and learn product relationships without a backend
> or API key.

## 0:30–0:50 — Human-facing workflow (20 s)

**On screen:** Open **Embed a product catalogue**. Fit the graph in view. Point
to the loader, Product2Vec task, neighbour task, and the WebMCP runner panel.

**Narration:**

> This is still a real Tangle graph. I can inspect the dataset path, dimensions,
> epochs, and connections, edit any setting, or undo changes normally. The panel
> confirms that data stays local and that ten WebMCP tools are shared.

## 0:50–1:25 — Agent discovery, invocation, and permission (35 s)

**On screen:** In the agent conversation, enter: “Inspect this pipeline, validate
it, then run it and explain the strongest learned SKU groups.” Briefly show the
tool discovery or tool activity. Let inspection and validation complete. Show
the first run refusal. Click **Allow the next agent-triggered run**, then repeat
the run request.

**Narration:**

> The agent discovers named tools with JSON schemas—no coordinate guessing and
> no canvas scraping. It reads a bounded summary, validates the live graph, and
> requests a browser run. That request is refused until I grant this one-time
> permission. I approve it once, and the same tool now starts a cancellable Web
> Worker.

## 1:25–2:03 — Shared result and human review (38 s)

**On screen:** Open the Product Intelligence Report. Pause on the falling loss
curve and similarity comparison, then the embedding map and neighbour explorer.
Change the selected SKU once. Scroll to one unexpected similarity opportunity.

**Narration:**

> In this run, Product2Vec trained sixteen-dimensional vectors for one hundred
> and sixty products in about seventy milliseconds. Loss fell from point six
> nine three to point three two four, while co-purchase context similarity
> reached ninety-five percent against a four-percent random baseline. I can
> explore the learned map and neighbours myself, then use the agent's bounded
> summary to discuss a bundle—without sending the source rows through the tool.

## 2:03–2:25 — Implementation and breadth (22 s)

**On screen:** Cut between the churn classifier report and customer clustering
report. End on the visible runner status.

**Narration:**

> Under the hood, the page calls document dot modelContext dot registerTool. A
> thin adapter reuses Tangle's live state, validation, and undo; the Worker runs
> deterministic TypeScript models. The same boundary compares classifier recall
> and profiles four customer clusters with human-readable reports.

## 2:25–2:38 — Outcome and close (13 s)

**On screen:** Return to the home hero, then finish on the generated submission
thumbnail or Tangle graph.

**Narration:**

> Strand turns agent automation into visible collaboration: structured
> tools for the agent, one-run control and normal undo for the person, and useful
> machine learning that stays in the browser.

## Runtime check

14 + 16 + 20 + 35 + 38 + 22 + 13 = **158 seconds (2:38)**. This leaves 21
seconds below 2:59 for editing variance. Do not add an intro sting, sponsor card,
or long end slate.
