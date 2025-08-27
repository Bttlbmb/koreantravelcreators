# Influencer Bridge – Pelican Starter

This repo contains a minimal Pelican site + a custom theme and mock data.

## What's inside
- `content/extra/data/creators.json` – mock dataset powering the pages
- `content/pages/index.html` – main dashboard page (uses template `home`)
- `content/pages/creators.html` – creators directory page (template `creators`)
- `content/pages/creator.html` – single-creator renderer (template `creator`, reads `?id=`)
- `themes/bridge/` – custom theme (Jinja templates + CSS/JS)
- `.github/workflows/publish.yml` – GitHub Actions to build & publish to GitHub Pages

## How to deploy on GitHub Pages (recommended)
1. Create a new empty GitHub repo and push these files.
2. Ensure GitHub Pages is set to deploy from **GitHub Actions**.
3. The included workflow will build the site and publish `output/`.

## Local build
```bash
pip install pelican markdown jinja2
pelican content -o output -s pelicanconf.py
python -m http.server -d output 8000
```
