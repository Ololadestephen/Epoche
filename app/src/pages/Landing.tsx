import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollHero } from '../components/landing/ScrollHero'
import { SphereVisual } from '../components/landing/SphereVisual'

const STEPS = [
  {
    id: 'safety',
    label: 'Sm',
    title: 'Safety Mode',
    body: 'First payment to an address, a paste from clipboard, or an unusual amount — protection activates automatically. No checkbox.',
    color: 'bg-accent text-black',
  },
  {
    id: 'hold',
    label: 'Hd',
    title: 'Hold window',
    body: 'Funds sit suspended for 5, 15, or 30 minutes. You can still cancel. The clock is onchain, not a soft warning.',
    color: 'bg-teal text-black',
  },
  {
    id: 'cancel',
    label: 'Cn',
    title: 'Cancel',
    body: 'Wrong address? Phishing paste? Reclaim before unlock. One click, full refund of the held amount.',
    color: 'bg-accent-soft text-black',
  },
  {
    id: 'release',
    label: 'Rl',
    title: 'Release',
    body: 'When the window ends, release finalizes to the recipient. Auto-requested if your wallet is open — or release manually.',
    color: 'bg-cyan text-black',
  },
  {
    id: 'trust',
    label: 'Tr',
    title: 'Trust',
    body: 'Mark a recipient as trusted. Next send is instant — no hold, no undo. Friction only where risk is real.',
    color: 'bg-white text-black',
  },
] as const

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/35">
        <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px_#c5e063]" />
      </span>
      <span className="text-sm font-semibold tracking-[0.2em] text-white">
        EPOCHÉ
      </span>
    </span>
  )
}

export default function Landing() {
  const [stepIdx, setStepIdx] = useState(0)
  const step = STEPS[stepIdx]

  const prev = () => setStepIdx((i) => (i - 1 + STEPS.length) % STEPS.length)
  const next = () => setStepIdx((i) => (i + 1) % STEPS.length)

  return (
    <div className="landing bg-black font-sans text-white antialiased">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/35 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="#top" className="shrink-0">
            <LogoMark />
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
            <a href="#how" className="transition hover:text-white">
              How it works
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#steps" className="transition hover:text-white">
              Flow
            </a>
            <Link to="/faq" className="transition hover:text-white">
              FAQ
            </Link>
          </nav>
          <Link
            to="/app"
            className="rounded-sm bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent-soft"
          >
            Open app
          </Link>
        </div>
      </header>

      <ScrollHero />

      {/* Light sand section */}
      <section id="how" className="relative overflow-hidden bg-sand text-[#12141a]">
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              A send that
              <br />
              operates with care
            </h2>
            <ul className="mt-8 space-y-3 text-sm text-[#12141a]/70 sm:text-base">
              {[
                'catch phishing pastes before they’re final',
                'undo a fat-finger to the wrong address',
                'hold first payments automatically',
                'choose 5 / 15 / 30 minute windows',
                'trust people you already know — go instant',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-black/10 bg-white/75 p-6 shadow-xl backdrop-blur">
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-forest">
                Epoché core
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-center text-xs">
                {[
                  ['Safety Mode', 'auto on risk'],
                  ['Hold', '≤ 30 min'],
                  ['Cancel', 'before unlock'],
                  ['Release', 'after unlock'],
                ].map(([t, s]) => (
                  <div
                    key={t}
                    className="rounded-xl border border-black/8 bg-sand/90 px-3 py-4"
                  >
                    <p className="font-semibold text-[#12141a]">{t}</p>
                    <p className="mt-1 text-[#12141a]/50">{s}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-black px-4 py-3 text-center">
                <p className="font-mono text-[11px] text-accent">
                  suspension → judgment → finality
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white text-[#12141a]">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for the moment
            <br className="hidden sm:block" /> before regret
          </h2>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              {
                title: 'Personal problem first',
                body: 'Not another swap UI. Epoché exists because hot sends have no undo — and soft “are you sure?” modals get clicked through.',
              },
              {
                title: 'Onchain, not vibes',
                body: 'Caps, holds, and cancel rights live in the contract. The app just makes the path honest: send → hold → cancel or release.',
              },
              {
                title: 'Elegant by subtraction',
                body: 'Native MON. One threat model. No multi-feature safety suite. Optional hold time. Automatic Safety Mode.',
              },
            ].map((f) => (
              <div key={f.title} className="text-center md:text-left">
                <h3 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#12141a]/60">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Mode — compact two-column; live dancing sphere */}
      <section
        id="steps"
        className="relative overflow-hidden bg-black py-20 sm:py-28"
      >
        <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="mx-auto flex w-full max-w-[min(92vw,720px)] items-center justify-center sm:max-w-[min(90vw,800px)] lg:max-w-[min(48vw,880px)]">
              <SphereVisual
                className="h-full w-full"
                animate
                preload="metadata"
                alt="Safety Mode particle field"
              />
            </div>

            <div className="text-center lg:text-left">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-accent">
                Safety Mode
              </p>
              <div className="mt-3 flex items-center justify-center gap-3 lg:justify-start">
                <button
                  type="button"
                  onClick={prev}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:text-white"
                  aria-label="Previous"
                >
                  ←
                </button>
                <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {step.title}
                </h2>
                <button
                  type="button"
                  onClick={next}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:text-white"
                  aria-label="Next"
                >
                  →
                </button>
              </div>

              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/55 lg:mx-0">
                {step.body}
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStepIdx(i)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition ${
                      i === stepIdx
                        ? `${s.color} scale-110 shadow-lg`
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }`}
                    aria-label={s.title}
                    aria-current={i === stepIdx ? 'step' : undefined}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <Link
                to="/app"
                className="mt-8 inline-block rounded-sm bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-accent-soft"
              >
                Try it on Monad
              </Link>
              <p className="mt-6 text-sm text-white/50">
                Questions?{' '}
                <Link
                  to="/faq"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  Read the FAQ
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative overflow-hidden border-t border-white/5 bg-black">
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <LogoMark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/45">
              Suspension before finality. Personal onchain hold windows for
              first-contact sends on Monad.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-white/45">
              <li>
                <a href="#how" className="hover:text-white">
                  How it works
                </a>
              </li>
              <li>
                <a href="#steps" className="hover:text-white">
                  Flow
                </a>
              </li>
              <li>
                <Link to="/app" className="hover:text-white">
                  Open app
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Learn</p>
            <ul className="mt-3 space-y-2 text-sm text-white/45">
              <li>
                <Link to="/faq" className="hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-white">
                  Features
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Network</p>
            <ul className="mt-3 space-y-2 text-sm text-white/45">
              <li>Monad</li>
              <li>Native MON</li>
              <li>Testnet-ready</li>
            </ul>
          </div>
        </div>
        <div className="relative border-t border-white/5 px-5 py-5 text-center text-xs text-white/30 sm:px-8 sm:text-left">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:justify-between">
            <span>
              © {new Date().getFullYear()} Epoché. Built for Spark · Monad.
            </span>
            <span className="tracking-wide text-white/40">
              ἐποχή — suspension of judgment
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
