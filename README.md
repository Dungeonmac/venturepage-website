# VenturePage website

**Live:** https://venturepage-website.pages.dev
**Source:** https://github.com/Dungeonmac/venturepage-website (auto-deploys on every push to `main`)

Static site — no build step, no framework, no dependencies. Just `index.html` + CSS + JS.
That's intentional: it means it can be deployed to Cloudflare Pages by pointing at the repo
root, with nothing to configure.

```
David/
  index.html
  css/styles.css
  js/particles.js   ← the glowing dot-field / icon-morph engine
  js/main.js        ← nav, contact form
  assets/
    mark.png        ← cropped geometric mark, used as the header/footer icon
    logo.png         ← full logo art (chroma-keyed transparent), kept for reference
    SiteSmithlogo.png ← your original upload, unedited
```

## GitHub + Cloudflare Pages — done

Both are set up and live:

- Repo created at `github.com/Dungeonmac/venturepage-website` and the site files uploaded via
  GitHub's web uploader (this machine still has no Git installed, so that was done through the
  browser rather than `git push` — see below if you want the CLI workflow for future changes).
- A Cloudflare Pages project is connected to that repo (`main` branch, framework preset None,
  no build command, output directory `/`), so **every push to `main` auto-redeploys**.
- Live at **venturepage-website.pages.dev**.

### Making future changes without Git installed

Easiest path: edit files locally, then re-upload through GitHub's web UI — go to the repo,
open the folder you're changing, use **Add file → Upload files**, drop in the updated file(s),
and commit directly to `main`. Cloudflare picks up the push automatically within a few seconds.

### Or install Git for a normal workflow

1. Install [GitHub Desktop](https://desktop.github.com/) (no CLI) **or** [Git for
   Windows](https://git-scm.com/download/win).
2. **GitHub Desktop:** File → Clone repository → `Dungeonmac/venturepage-website` → point it at
   this `David` folder (or a fresh clone) → make changes → commit → push.
3. **Command line** (after installing Git):
   ```
   cd path\to\David
   git init
   git remote add origin https://github.com/Dungeonmac/venturepage-website.git
   git fetch origin
   git reset --soft origin/main
   git add .
   git commit -m "Update"
   git push origin main
   ```

### Custom domain

Once you register one, add it under the Pages project's **Custom domains** tab in the
Cloudflare dashboard — Cloudflare handles DNS and SSL automatically once the domain's
nameservers point to Cloudflare.

## What's still placeholder / needs your input

- **Domain for the site itself** — `venturepage.com` wasn't confirmed available or taken
  during the naming search, worth checking directly before registering. See "Custom domain"
  above for how to attach it once you have one.
- **Contact form** — currently client-side only: submitting opens the visitor's email app
  with the message pre-filled. No backend, no data stored — matches the GitHub + Cloudflare
  only setup. If you'd rather have submissions land in your inbox without the visitor's mail
  client popping up, that needs a small Cloudflare Pages Function plus an email-sending
  service (e.g. Resend) — happy to build that next if you want it.
- **Pricing numbers** — grounded in 2026 industry research on freelance/boutique web design
  pricing (see the footnote on the pricing section), each tier priced ~15% under the typical
  market starting point for that scope. Adjust freely once you know your real costs/margins.
- **Analytics** — nothing's wired up. Cloudflare has a free, privacy-friendly Web Analytics
  option (no cookie banner needed) that's a one-line script tag if you want visit data.
- **Social / portfolio links** — footer and about section don't reference any social
  profiles or past work yet since none were provided; easy to add once you have them.
- **Email address** — the contact email is `sitesmithmail@gmail.com`, which still has the old
  "SiteSmith" name in it. Works fine as-is, but worth deciding whether to keep it or set up a
  `@venturepage`-branded inbox later.

## Logo

Your uploaded file (`assets/SiteSmithlogo.png`) had the full "SITESMITH DESIGN" wordmark baked
into the image with a solid dark-gray background — not transparent, and the text no longer
matches the site's name. Two things were done to it:

1. `assets/logo.png` — the same art, background chroma-keyed out to real transparency (kept
   in case it's useful later, e.g. for a favicon or social-share image).
2. `assets/mark.png` — just the geometric `<•>//` symbol, cropped out on its own with the text
   removed, since that mark isn't tied to any particular name. This is what the site actually
   uses in the header/footer, paired with a live "VenturePage" text wordmark next to it.

If you'd rather have a proper new logo designed around "VenturePage," that's a separate task —
happy to take a pass at an SVG mark, or you can commission/design one and drop it in to replace
`mark.png`.

## The dot field, briefly

`js/particles.js` draws every dot on one full-screen canvas. At the top of the page they
ring the logo; scrolling makes them break off (staggered per-dot) into an ambient flowing
field. When a section heading's icon slot scrolls into view, nearby dots morph into that
section's icon (dollar sign, clock, code brackets, checkmark, chat bubble, arrow) — all
hand-drawn with the Canvas API, no icon library or external asset involved. It respects
`prefers-reduced-motion` (renders one calm static frame instead of animating).
