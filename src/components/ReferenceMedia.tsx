import { useRef, useState } from 'react'

function PrimaryMedia({ letter }: { letter: string }) {
  const [imageError, setImageError] = useState(false)
  const [imageExt, setImageExt] = useState<'svg' | 'png'>('png')
  const [videoError, setVideoError] = useState(false)
  const base = `/references/${letter}`


  if (!imageError) {
    return (
      <img
        src={`${base}.${imageExt}`}
        alt={`ASL reference for letter ${letter}`}
        className={`h-48 w-full rounded-lg border border-slate-700 object-contain ${imageExt === 'svg' ? 'bg-white p-2' : 'bg-slate-900'}`}
        onError={() => (imageExt === 'svg' ? setImageExt('png') : setImageError(true))}
      />
    )
  }
  if (!videoError) {
    return (
      <video
        src={`${base}.mp4`}
        className="h-48 w-full rounded-lg border border-slate-700 bg-slate-900 object-contain"
        controls
        playsInline
        muted
        loop
        onError={() => setVideoError(true)}
      />
    )
  }
  return (
    <div className="flex h-48 w-full items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-4 text-center text-sm text-slate-400">
      No reference media found at <code className="mx-1 text-slate-300">public/references/{letter}.png</code> or <code className="mx-1 text-slate-300">.mp4</code>. Use the guidance below.
    </div>
  )
}

/** Remounts per letter so slider position and load errors reset without effects. */
export function ReferenceMedia({ letter }: { letter: string }) {
  return <ReferenceSlider key={letter} letter={letter} />
}

function ReferenceSlider({ letter }: { letter: string }) {
  const [gifError, setGifError] = useState(false)
  const [index, setIndex] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const slides = gifError ? 1 : 2


  const goTo = (i: number) => {
    const el = scroller.current
    if (!el) return
    const next = Math.max(0, Math.min(slides - 1, i))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setIndex(next)
  }

  return (
    <div>
      <div
        ref={scroller}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget
          setIndex(Math.round(el.scrollLeft / el.clientWidth))
        }}
      >
        <div className="w-full shrink-0 snap-center">
          <PrimaryMedia letter={letter} />
        </div>
        {!gifError && (
          <figure className="w-full shrink-0 snap-center">
            <img
              src={`/references/secondary/${letter}.gif`}
              alt={`Animated fingerspelling of ${letter}`}
              className="h-48 w-full rounded-lg border border-slate-700 bg-black object-contain"
              onError={() => setGifError(true)}
            />
            <figcaption className="mt-1 text-center text-xs text-slate-500">Animated example · asl.gs (Dr. Bill Vicars)</figcaption>
          </figure>
        )}
      </div>
      {slides > 1 && (
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous reference"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            className="rounded-full border border-slate-700 px-2 text-slate-300 disabled:opacity-30"
          >
            ‹
          </button>
          {Array.from({ length: slides }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show reference ${i + 1} of ${slides}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={`h-2.5 rounded-full transition-all ${i === index ? 'w-6 bg-slate-200' : 'w-2.5 bg-slate-600'}`}
            />
          ))}
          <button
            type="button"
            aria-label="Next reference"
            disabled={index === slides - 1}
            onClick={() => goTo(index + 1)}
            className="rounded-full border border-slate-700 px-2 text-slate-300 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
