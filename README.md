# asl-learn

Learn ASL fingerspelling with your webcam. Hand tracking and scoring run in your browser, so your video never leaves your device.

## Features

- Practice all 26 letters with live feedback (J and Z are motion letters, so you grade yourself)
- Review mode with spaced repetition, and drills for look-alike letters
- Optional ghost overlay and a left-hand setting
- Progress saved in your browser, with download and restore

## Run it

Needs Node 22 (`nvm use`).

```bash
npm install
npm run dev
```

`npm install` also copies the MediaPipe files into `public/mediapipe/`. Camera access needs `https://` or `localhost`.

## Scripts

- `npm run build`: type-check and build
- `npm test`: run the tests
- `npm run lint`: lint
- `node tools/evaluate.ts <aslnow-dir>`: test the scorer on the [ASL-Now dataset](https://huggingface.co/datasets/sid220/asl-now-fingerspelling). Add `--export src/data/templates/aslnow.json` to rebuild the templates.

## Reference images

Put one image per letter in `public/references/` (`A.png` to `Z.png`) and optional animations in `public/references/secondary/` (`A.gif` to `Z.gif`). Check the license of anything you add before sharing the app publicly. See [AILog.md](AILog.md) for what has been built and what is left.
