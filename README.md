# VenturePage website

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

## Getting this onto GitHub

This machine doesn't have Git installed, so pushing needs to happen either after installing
Git, or via GitHub Desktop (no command line required):

1. Install [GitHub Desktop](https://desktop.github.com/) (easiest, no CLI) **or** [Git for
   Windows](https://git-scm.com/download/win) if you'd rather use the command line.
2. Create a new repository on [github.com](https://github.com/new) — e.g. `venturepage-website`.
   Public or private both work fine with Cloudflare Pages.
3. Add this `David` folder's contents as the repo's root and push:
   - **GitHub Desktop:** File → Add Local Repository → point it at this `David` folder →
     Publish repository.
   - **Command line** (after installing Git):
     ```
     cd path\to\David
     git init
     git add .
     git commit -m "Initial site"
     git branch -M main
     git remote add origin https://github.com/<you>/venturepage-website.git
     git push -u origin main
     ```

## Deploying on Cloudflare Pages

1. Go to the Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Select the `venturepage-website` repo.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave blank)*
   - Build output directory: `/` (repo root — or `David` if you pushed the whole
     `ClaudeCode` folder instead of just `David`)
4. Save and Deploy. Cloudflare will give you a `*.pages.dev` URL immediately; every push to
   `main` auto-redeploys.
5. Once you have a domain, add it under the Pages project's **Custom domains** tab —
   Cloudflare handles DNS and SSL for you if the domain's nameservers point to Cloudflare.

## What's still placeholder / needs your input

- **Domain for the site itself** — once you register one (check availability for
  `venturepage.xyz`-type options — `venturepage.com` is worth checking directly, wasn't
  confirmed available or taken during the naming search), point its nameservers at Cloudflare
  and attach it in the Pages project settings.
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
