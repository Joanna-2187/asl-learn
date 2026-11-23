# AI Log

Record of changes made with Claude Code.

## 1. Setup and hosting

- Node 22 (`.nvmrc`, `engines`) and an exact MediaPipe version, with its wasm and hand model copied into `public/mediapipe/` on install, so nothing is loaded from a CDN. The loader falls back from GPU to CPU.
- `vercel.json` sets a camera-only Permissions-Policy and a strict CSP.
- Assests made automatically. 

## 2. New scorer

- Replaced the rule-based scorer with joint-angle features compared against a template per letter, plus a margin check against look-alikes (A/S/E/T/M/N, U/V/R, K/V/P, G/H, I/Y, O/C). Messages say what to change, for example "curl your index finger more".
- Templates come from the ASL-Now dataset (MIT) via `tools/evaluate.ts`. On a proxy split it passes 86.6% of correct signs (target 90%) and 2.4% of look-alikes (limit 10%). 


## 3. Reference media
- Each letter shows a swipeable slider: image, then the GIF on a black background.

## 4. v1.1 features

- J and Z are practice-only (self-graded); no motion scoring.
- Review mode (ts-fsrs, 15 cards per session), look-alike drills, ghost overlay, left-hand setting, progress download and restore, About page.
- Progress is versioned (v2) and old saves are migrated.
- Tests pass and the build works. Not tried with a camera; the left-hand setting is a manual toggle and MediaPipe's handedness label was not checked.

## 5. Cleanup

- Removed the old scorer, unused geometry helpers, per-letter finger and palm data, and unused files. Simplified the README.


