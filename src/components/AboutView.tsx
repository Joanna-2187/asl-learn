export function AboutView() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-sm text-slate-300">
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">About</h1>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-2 text-base font-medium text-white">Privacy</h2>
        <p>
          Your camera video never leaves your device. Hand tracking and scoring run in your browser, the tracking model is served by this app
          itself, and your progress is stored only in this browser’s local storage. Use “Download progress” to keep a copy.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-2 text-base font-medium text-white">How scoring works</h2>
        <p className="mb-2">
          MediaPipe finds 21 points on your hand. The app turns them into joint angles, finger spread and fingertip distances, and compares
          those with a template for each letter. A pass also needs the sign to be clearly closer to the target than to its look-alikes
          (for example A, S, E, T, M and N).
        </p>
        <p>J and Z involve movement and are not scored automatically yet; you grade yourself against the animated example.</p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-2 text-base font-medium text-white">Credits</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Hand tracking: <a className="text-cyan-300 underline" href="https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker">MediaPipe Hand Landmarker</a> (Apache 2.0).
          </li>
          <li>
            Letter templates were built from the <a className="text-cyan-300 underline" href="https://huggingface.co/datasets/sid220/asl-now-fingerspelling">ASL-Now fingerspelling dataset</a> (MIT).
          </li>
          <li>
            Review scheduling: <a className="text-cyan-300 underline" href="https://github.com/open-spaced-repetition/ts-fsrs">ts-fsrs</a> (MIT), an implementation of the FSRS algorithm.
          </li>
          <li>
            Animated examples: <a className="text-cyan-300 underline" href="https://asl.gs/">asl.gs</a> by Dr. Bill Vicars (see also{' '}
            <a className="text-cyan-300 underline" href="https://www.lifeprint.com/">Lifeprint</a>). Shown for this local school project only; they are not licensed for redistribution.
          </li>
          <li>Letter chart images: hand-drawn alphabet chart supplied by the project author. Check its source and license before sharing this app publicly.</li>
        </ul>
      </section>
    </div>
  )
}
