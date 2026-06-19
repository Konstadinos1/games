# Pluie de Poutine — Bellepros Laval 🍟

A high-fidelity, **single-file** HTML5 catching game built to bridge virtual play with
brick-and-mortar store traffic. Scan a QR code, catch the falling poutine ingredients,
hit **100 points**, and unlock a real in-store coupon.

> Catch the fries, gravy, cheese curds and premium steamies — dodge the rain — and win
> a **FREE DOUBLE CHEESE** upgrade at Bellepros Laval.

## Run it

It's one self-contained file. Just open it:

```bash
# any static server works; from the repo root:
python3 -m http.server 8080
# then visit http://localhost:8080/bellepros-poutine-catch/
```

Or open `index.html` directly in a browser. To deploy for a QR campaign, host the folder
anywhere static (Netlify, GitHub Pages, S3, …) and point the QR at the URL.

## Controls

- **Touch / mouse** — drag anywhere to slide the basket.
- **Keyboard** — hold **←/→** to glide the basket smoothly, **Space** or **P** to pause/resume,
  **Enter** to start from the menu.

## Tests

Zero-dependency Node suite (no browser needed) covering the keyboard steering math:

```bash
node tests/controls.test.js
```


## What's inside (zero external game assets)

| Requirement | Implementation |
|---|---|
| **Single file** | All HTML + CSS + JS in `index.html` |
| **Zero image/audio assets** | Every sprite (storefront, awning, brick, neon "OUVERT/OPEN" sign, steel counter, fries/gravy/curds/steamie/raindrop, tray) is drawn with the Canvas 2D API |
| **Synthesized audio** | Web Audio `OscillatorNode`/`GainNode` engine: ascending sweep (standard catch), arpeggiated major chord (premium), descending sawtooth (hazard/miss), 4-note chime (reward) |
| **Bilingual FR/EN** | Full dictionary with Québec slang (*Steamie, Fromage squic-squic, Pointage*); persistent in-header language switcher, no progress reset |
| **Particle splash engine** | Gravity-driven, size-decaying, `globalAlpha`-fading bursts coloured per item (golden sparks for fries, white star sparkles for curds, blue splash for rain) |
| **Coupon reward loop** | Pauses at 100 pts → ticket modal with a **deterministic mock QR** (pure-JS grid algorithm seeded from a random `BP-LVL-XXXXXX` code) |
| **Ad-revive engine** | At 0 lives, "Save my streak" plays a simulated 5s spinning-combo ad, then restores 3 lives with **score intact** — once per run |
| **Responsive frame** | Fixed 9:16 logical stage uniformly scaled to any screen; styled as an arcade cabinet / storefront on desktop |

## Tech notes

- Only external dependencies are the spec-mandated CDNs (Tailwind, Google Fonts
  *Fredoka One*/*Outfit*, Font Awesome). The game logic is pure vanilla JS and runs even
  if those are blocked (critical layout CSS is inlined as a fallback).
- State machine: `menu → playing → (coupon) → playing → gameover → (ad) → playing`.
- High score, language and mute preference persist via `localStorage`.

## Brand variables

Brand **Bellepros** · Location **Laval** · Genre **2D catching** · Target **100 pts** ·
Reward **FREE DOUBLE CHEESE with any regular combo**.
