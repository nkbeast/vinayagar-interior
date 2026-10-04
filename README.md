# Vinayagar Interior — Website

A single-page, 3D scrollytelling website for **Vinayagar Interior** (Mettupalayam, Coimbatore).
Theme: *Modern Tamil Luxe* — teal × brushed brass × walnut × ivory marble.

## Run it

```bash
cd site
python3 -m http.server 8907
# open http://localhost:8907
```

Any static server works (Netlify, Vercel, cPanel — just upload the `site/` folder).
No build step. All libraries are vendored locally (`site/assets/vendor/`), so it also works offline
(except Google Fonts and the embedded Google Map, which need internet).

## Where to edit things

| What | File |
|---|---|
| **Phone / WhatsApp / Maps pin / social links** | `site/js/config.js` → `SITE_CONFIG` (single source of truth) |
| Gallery photos & captions | `site/js/config.js` → `WORKS` |
| Process timeline steps & photos | `site/js/config.js` → `PROCESS` |
| Services list, copy & WhatsApp tags | `site/js/config.js` → `SERVICES` |
| Tamil translations | `site/js/config.js` → `I18N` |
| Colors & fonts | `site/css/style.css` → `:root` variables |
| 3D scenes (hero doors, service morphs, furniture turntable, floor-plan morph) | `site/js/world.js` |
| Scroll choreography & section builds | `site/js/sections.js` |
| Preloader, cursor, nav, form, i18n toggle | `site/js/main.js` |

## When social accounts go live

In `config.js`, set e.g. `socials.instagram = "https://instagram.com/…"`, then in
`site/index.html` replace each `<button class="social" data-soon>` with an `<a href="…">`.
(The buttons currently show a "Launching soon" toast.)

When the Google Business listing is registered, swap the iframe `src` in `index.html`
(marked with a `TODO` comment) and update `SITE_CONFIG.mapsPin`.

## Photo credits & structure

- All 51 project photos live in `site/assets/img/work/img-01.jpg … img-51.jpg`
  (`mapping.json` there maps each back to the original WhatsApp filename).
- Logo (background removed) in `site/assets/logo/`.
- Re-run the asset pipeline anytime: `python3 tools/process_assets.py` (from the project root).

## Tech

Three.js (persistent WebGL canvas behind the DOM) · GSAP + ScrollTrigger · Lenis smooth scroll ·
procedural PBR materials · zero backend (the enquiry form opens WhatsApp with a pre-filled message).

`prefers-reduced-motion` is respected: the 3D layer disables and all content stays readable.
