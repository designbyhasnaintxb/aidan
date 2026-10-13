# Bellingham Soccer Training: content audit & handoff

## Status of the audit

The redesign brief names **bellinghamsoccertraining.com** as the source of truth for copy, packages, curriculum, media and booking links. **That site could not be reached from the build environment** (network policy blocked it, and the Wayback Machine was blocked too). So nothing in this build was copied from the live site.

What this build uses comes **only from the brief**:

| Fact | Source |
| --- | --- |
| Prices $35 / $100 / $135 / $250 | Brief ("preserve exactly") |
| Coaching started summer 2023; got more serious summer 2026 | Brief |
| Currently attending college, sessions not running consistently | Brief |
| Curriculum layers: Technical, Tactical, Positioning, Athletic development, Mental performance | Brief ("current site includes curriculum around…") |
| International + collegiate playing background (no specifics) | Brief ("reportedly") |
| Email `AdamMaguireo6@gmail.com` | Brief (**suspect, see below**) |

Everything else is a clearly marked slot. Each one carries a `data-verify="…"` attribute, and the "items to verify" pill (bottom-left) outlines all of them. Open the page with `?audit` to start with the outlines on.

## Must verify before launch

1. **Email.** The brief gives `AdamMaguireo6@gmail.com`, which has "Adam", not "Aidan", and a letter **o** before the 6 where a zero might be meant. It appears in 4 places in `index.html` (search `data-email`). The inquiry form sends to whichever address is in the first `[data-email]` element.
2. **Package names, session counts, who-it's-for and inclusions** (`pk1-*` … `pk4-*`). The form's package options pick up names from `.pk__name` automatically.
3. **Bio / philosophy** (`bio`), **timeline specifics** (`timeline-youth`, `timeline-intl`), **credential tiles** (`cred-intl`, `cred-college`), **hero background line** (`hero-background`).
4. **Curriculum wording** (`curr-*`). The one-line descriptors ("Ball control and execution", etc.) paraphrase the brief's pitch metaphors. Replace them with the current site's exact terms.
5. **Media**: portrait, hero image (commented slot in the hero), main video (`video-main`: set `data-video-mp4` / `data-video-webm` or `data-video-embed`), three supporting clips.
6. **Booking links.** Not shown. Re-add them in the contact section **only** if they're confirmed active. The form is a request, not a booking.
7. **Location / service area / socials.** Not stated anywhere on the page. "Bellingham" appears only as part of the business name. Add details to the copy and JSON-LD once confirmed.
8. **Form delivery.** With `data-endpoint` empty, submitting opens the visitor's email app pre-filled. To receive submissions directly, set `data-endpoint` on `#inquiry` to a form backend URL (e.g. Formspree).

## Section classification (from the brief's description of the current site)

| Current element | Call | Where it lives now |
| --- | --- | --- |
| Logo | REDESIGN | New BST mark: field box, passing lane, player marker (6s loop) |
| Colour / type | REDESIGN | New palette tokens in `css/main.css`; Archivo (display + condensed) and Instrument Sans, self-hosted |
| Hero | REDESIGN | "Train with a plan." + quick-facts strip (since, prices, curriculum, availability) |
| About / bio | KEEP + RESTYLE | 02 About (slot for exact bio) + timeline |
| Playing background | KEEP + REPOSITION | 06 credential tiles + timeline; specifics are VERIFY |
| Packages + pricing | KEEP content, REDESIGN presentation | 03: selector + active panel (desktop), accordion (mobile); prices always visible |
| Curriculum | KEEP content, REDESIGN presentation | 04: one pitch, five layers, scroll-driven (desktop) / step-through (mobile) |
| Video / images | KEEP (once sourced) | 05 media slots; no stock or AI footage used |
| Booking links | VERIFY | Hidden until confirmed active; "Request availability" inquiry instead |
| Contact | KEEP + VERIFY | 07 status panel + 3-step inquiry form |
| Footer | RESTYLE | 08 |

## Repo housekeeping

`assets/img/psh-*` and `assets/favicon.png` belong to a different business (Private Soccer Hawaii / Coach Robert) carried over from the template. **Nothing references them any more.** Delete them before deploying so they can't be published by mistake.

Fonts (Archivo, Instrument Sans) are SIL Open Font License, self-hosted from `@fontsource-variable`. GSAP 3.12.5, ScrollTrigger and Lenis 1.1.14 are vendored in `js/vendor/`.
