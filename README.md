# Boardroom TTX - Stateless Cloudflare Pages App

A static, mobile-friendly boardroom cyber crisis table-top exercise app built for GitHub Pages or Cloudflare Pages.

## Features
- No backend and no database
- Session-only storage using `sessionStorage`
- Separate JSON scenario bank
- Supports 2 to 10 questions per scenario
- Dashboard centred on Act 854 detriment pillars
- Secondary impact monitor for reputation, monetary pressure, market share, public trust, and foreign investment
- Bring-your-own scenario JSON upload

## File structure
- `index.html` - app shell
- `styles.css` - responsive UI styling
- `app.js` - exercise logic, scoring, and dashboard
- `scenarios/sample-scenario.json` - example scenario bank

## Deploy to Cloudflare Pages
1. Create a GitHub repository.
2. Upload all files while keeping the same folder structure.
3. In Cloudflare Pages, connect the repository.
4. Framework preset: `None`
5. Build command: leave empty
6. Build output directory: `/`
7. Deploy.

## Deploy to GitHub Pages
1. Push the files to a repository.
2. In repository settings, enable GitHub Pages.
3. Set source to the root branch.
4. Wait for the site URL to be published.

## Scenario format
Each scenario JSON must include:
- `meta.id`
- `meta.title`
- `meta.summary`
- `questions[]`

Each question must include:
- `id`
- `text`
- `answers[]`

Each answer should include:
- `id`
- `label`
- `description`
- `consequence`
- `boardReading`
- `confidence`
- `weights.pillars`
- `weights.secondary`

## Notes
- The app does not save participant data after the browser tab is closed.
- Reset Session clears the current exercise state.
- This build is intended for executive training and facilitation, not regulated record retention.
