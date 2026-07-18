import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FAQ_ITEMS } from '../lib/faq'

function LogoMark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/35">
        <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px_#c5e063]" />
      </span>
      <span className="text-sm font-semibold tracking-[0.2em] text-white">
        EPOCHÉ
      </span>
    </span>
  )
}

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-sand font-sans text-[#12141a] antialiased">
      <header className="border-b border-black/10 bg-black">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-8">
          <Link to="/">
            <LogoMark />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-white/70 transition hover:text-white">
              Home
            </Link>
            <Link
              to="/app"
              className="rounded-sm bg-white px-4 py-2 font-semibold text-black transition hover:bg-accent-soft"
            >
              Open app
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-forest">
          Help
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#12141a]/65 sm:text-base">
          How Safety Mode works, what Epoché is not, and how to demo a hold on
          Monad. Still stuck? Open the app and try a small testnet send.
        </p>

        <div className="mt-12 divide-y divide-black/10 border-t border-black/10">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} className="py-1">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-base font-medium text-forest sm:text-lg">
                    {item.q}
                  </span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/15 text-lg leading-none transition ${
                      isOpen ? 'rotate-45 bg-black text-white' : ''
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p className="pb-5 pr-4 text-sm leading-relaxed text-[#12141a]/70 sm:pr-12 sm:text-[15px]">
                    {item.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-4 border-t border-black/10 pt-8">
          <Link
            to="/app"
            className="rounded-sm bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-soft"
          >
            Open command center
          </Link>
          <Link
            to="/"
            className="text-sm text-[#12141a]/50 transition hover:text-[#12141a]"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}
