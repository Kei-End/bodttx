# Boardroom TTX - Stateless Cloudflare Pages App

A static, mobile-friendly boardroom cyber crisis table-top exercise app built for GitHub Pages or Cloudflare Pages.

## Features
- No backend and no database
- Session-only storage using versioned `sessionStorage` keys
- Separate JSON scenario bank with backward-compatible schema extensions
- Separate models for:
  - Capability scoring (5-axis radar, 0-5)
  - Act 854 detriment scoring (existing pillar dashboard)
- Decision evidence drawer with validation flags and confidence explanations
- Team median and target benchmark overlays on the capability radar (max 3 series)
- Local JSON and CSV export for after-action review

## File structure
- `index.html` - app shell and dashboard containers
- `styles.css` - responsive UI styling
- `app.js` - UI orchestration and session flow
- `schema.js` - typed schema helpers, scenario validation, axis definitions
- `scoring.js` - pure capability scoring and confidence functions
- `storage.js` - versioned session storage and rebuild helper
- `chart-adapter.js` - radar rendering adapter and axis hit detection
- `scenarios/sample-scenario.json` - example scenario bank (extended schema)
- `tests/` - unit tests and fixtures

## Decision capability scoring pipeline (short)
1. User selects an answer at each inject.
2. App builds a typed decision record for that inject.
3. Pure scoring functions produce:
   - five axis scores (0-5)
   - confidence by axis and overall (0-1)
   - validation flags
4. Decision records are persisted in sessionStorage.
5. Dashboard aggregates records into participant capability, trend, and evidence outputs.
6. Act 854 detriment remains a separate panel and computation path.

## Test
```bash
npm test
```

## Notes
- Session reset removes all versioned `boardroomTTXSession:*` keys.
- This build is intended for executive training and facilitation, not regulated record retention.
