# AI Log

Record of changes made with Claude Code.

## 1. Setup and hosting

- Node 22 (`.nvmrc`, `engines`) and an exact MediaPipe version, with its wasm and hand model copied into `public/mediapipe/` on install, so nothing is loaded from a CDN. The loader falls back from GPU to CPU.
- `vercel.json` sets a camera-only Permissions-Policy and a strict CSP.

## 2. New scorer

- Replaced the rule-based scorer with joint-angle features compared against a template per letter, plus a margin check against look-alikes (A/S/E/T/M/N, U/V/R, K/V/P, G/H, I/Y, O/C). Messages say what to change, for example "curl your index finger more".
- Templates come from the ASL-Now dataset (MIT) via `tools/evaluate.ts`. On a proxy split it passes 86.6% of correct signs (target 90%) and 2.4% of look-alikes (limit 10%). The old scorer got 20.4% and 10.0%.
- The numbers are optimistic: the dataset has no signer IDs, and settings were chosen on the same data. Templates use image coordinates but the app scores MediaPipe world coordinates. Not tested with a real hand.

## 3. Reference media

- Letter images are cropped from a chart you supplied; its source and license are unchecked. The animated GIFs from asl.gs (Dr. Bill Vicars) have no stated license, so keep `public/references/` out of any public repo or deploy.
- Each letter shows a swipeable slider: image, then the GIF on a black background.

## 4. v1.1 features

- J and Z are practice-only (self-graded); no motion scoring.
- Review mode (ts-fsrs, 15 cards per session), look-alike drills, ghost overlay, left-hand setting, progress download and restore, About page.
- Progress is versioned (v2) and old saves are migrated.
- Tests pass and the build works. Not tried with a camera; the left-hand setting is a manual toggle and MediaPipe's handedness label was not checked.

## 5. Cleanup

- Removed the old scorer, unused geometry helpers, per-letter finger and palm data, and unused files. Simplified the README.

## Still to do

- Try it on a real camera and tune the failing letters.
- Record your own templates and a second signer's test set.
- J and Z motion scoring.
- Demo GIF, and the optional 3-letter word mode.
