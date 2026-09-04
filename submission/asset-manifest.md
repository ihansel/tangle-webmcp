# Asset manifest

All image sizes and dimensions were measured on 4 September 2026. Every asset is
PNG, below 5 MB, free of credentials/personal data/browser chrome, and exactly
3:2.

| Filename                                         | Caption                                                                     | Purpose                                       | Dimensions  | Ratio | Size        | Source                                                                                       | Compliance |
| ------------------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------- | ----------- | ----- | ----------- | -------------------------------------------------------------------------------------------- | ---------- |
| `assets/thumbnail.png`                           | Original browser ML graph with agent permission and analytical outputs.     | Submission thumbnail.                         | 1800 × 1200 | 3:2   | 2,327,065 B | OpenAI ImageGen artwork, mechanically resized from source; no third-party assets/text/logos. | PASS       |
| `assets/thumbnail-source.png`                    | Editable high-resolution source artwork.                                    | Retained source.                              | 1536 × 1024 | 3:2   | 1,790,321 B | OpenAI ImageGen.                                                                             | PASS       |
| `assets/gallery/01-home.png`                     | Earlier Tangle-based commerce workspace and experiment catalogue.           | Pre-rebrand opening state and product story.  | 1800 × 1200 | 3:2   | 149,274 B   | Historical hosted-app screenshot; Strand refresh pending.                                    | PASS       |
| `assets/gallery/02-product2vec-pipeline.png`     | Three-node Product2Vec graph with “10 tools shared.”                        | Human workflow and WebMCP discovery signal.   | 1800 × 1200 | 3:2   | 105,029 B   | Real hosted-app screenshot.                                                                  | PASS       |
| `assets/gallery/03-agent-run-permission.png`     | Visible one-time run control after an agent run request.                    | Agent invocation and human approval boundary. | 1800 × 1200 | 3:2   | 105,228 B   | Real hosted-app screenshot.                                                                  | PASS       |
| `assets/gallery/04-product2vec-report.png`       | Training-loss curve, product embedding map, and nearest-neighbour explorer. | Completed embedding outcome.                  | 1800 × 1200 | 3:2   | 113,296 B   | Real hosted-app screenshot from run `browser-mtllwadc`.                                      | PASS       |
| `assets/gallery/05-churn-classifiers-report.png` | Confusion matrix, threshold curves, risk distribution, and churn drivers.   | Classification output and model review.       | 1800 × 1200 | 3:2   | 126,392 B   | Real hosted-app screenshot from run `browser-mtllz8g0`.                                      | PASS       |
| `assets/gallery/06-customer-clusters-report.png` | Customer map, segment sizes, and feature-centroid heatmap.                  | Clustering result and reporting breadth.      | 1800 × 1200 | 3:2   | 122,821 B   | Real hosted-app screenshot from run `browser-mtlm0lks`.                                      | PASS       |
| `assets/gallery/07-run-error-recovery.png`       | Missing-dataset 404 shown safely in the local runner panel.                 | Important error/recovery state.               | 1800 × 1200 | 3:2   | 107,972 B   | Real hosted-app screenshot; the path was restored by undo and rerun.                         | PASS       |

## Thumbnail generation record

- Mode: new image generation.
- Prompt intent: original dark commerce-admin visual; node graph, structured
  agent path, permission shield, clustering/model/embedding motifs; no text,
  logos, brands, watermarks, or third-party assets.
- Generated source:
  `/Users/ianhansel/.codex/generated_images/01a0614b-82d8-7c90-8d61-22bb70aac5cd/exec-139a04c3-6d80-4a94-a9b7-dccf78a2122c.png`
- Submission copies: `assets/thumbnail-source.png` and
  `assets/thumbnail.png`.

The source path is a local production record and is not required when the
submission folder is copied elsewhere.
