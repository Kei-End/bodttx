# Boardroom TTX - Stateless Cloudflare Pages App

A static, mobile-friendly boardroom cyber crisis table-top exercise app built for GitHub Pages or Cloudflare Pages.

## Features
- No backend and no database
- Session-only storage using versioned `sessionStorage` keys
- Separate JSON scenario bank
- Keeps Act 854 detriment scoring model separate from participant capability scoring
- Five-axis decision-capability radar (0-5): situational awareness, principles alignment, ethical/safety impact, decisiveness, transparency
- Axis confidence model (0-1) independent from score
- Validation flags and evidence drawer per axis
- Team median and target benchmark overlays (max 3 radar series)
- Trend and board metrics across injects
- Local JSON/CSV export for after-action review

## File structure
- `index.html` - app shell
- `styles.css` - responsive UI styling
- `app.js` - orchestration and UI wiring
- `decision-schema.js` - capability schema and anchors
- `capability-scoring.js` - pure capability scoring + confidence logic
- `chart-adapter.js` - radar chart rendering adapter
- `session-store.js` - versioned session storage + export builders
- `scenarios/sample-scenario.json` - example scenario bank with optional capability fields
- `tests/*.test.mjs` - scoring and storage tests
- `demos/gold-path-session.json` - manual review demo session

## Run tests
```bash
node --test tests/*.test.mjs
```

## Notes
- The app does not save participant data after the browser tab is closed.
- Reset Session clears both legacy and v2 session keys.
- This build is intended for executive training and facilitation, not regulated record retention.
