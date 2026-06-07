# Marathon Coach — Lisbon 2026

Personal marathon training dashboard for the EDP Lisbon Marathon, Oct 10 2026. Sub-4:00 goal.

Dark mission-control aesthetic. Single-page, client-side only. Tracks daily sessions, readiness, and an 18-week plan.

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Production Build

```bash
npm run build
npm run preview   # preview the built output locally
```

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. Framework Preset: **Vite** (auto-detected).
4. No environment variables needed.
5. Click **Deploy**.

`vercel.json` handles client-side routing so page refreshes don't 404.

---

## Architecture

```
src/
  constants/plan.ts     Full 18-week plan data
  types/index.ts        TypeScript types
  lib/storage.ts        window.storage → localStorage adapter
  lib/logic.ts          Pure business logic functions
  hooks/                React hooks (storage, date, plan, completion, readiness)
  components/           UI components
    ui/                 Primitives: Pill, SecLabel, Check, TrendArrow
    Header.tsx
    TodayCard.tsx
    ReadinessBand.tsx
    WeekStrip.tsx
    Timeline.tsx
    PacingZones.tsx
    SessionModal.tsx
    ReadinessModal.tsx
  App.tsx               Root: state + layout
  index.css             CSS custom properties (design tokens)
```

## Storage

State persists via `window.storage` when available (Claude Code / artifact environment), otherwise falls back to `localStorage`. Three keys:

| Key | Contents |
|---|---|
| `marathon-completion` | `Record<weekId-dayAbbr, CompletionEntry>` |
| `marathon-readiness` | `Record<YYYY-MM-DD, ReadinessEntry>` |
| `marathon-settings` | `{ dateOverride?: string }` |

### Debug date override

To simulate a different date (useful for testing future weeks):

```js
// In DevTools console:
localStorage.setItem('marathon-settings', JSON.stringify({ dateOverride: '2026-08-17' }));
// Then refresh. To reset:
localStorage.removeItem('marathon-settings');
```

If running in the Claude Code artifact environment with `window.storage`:
```js
await window.storage.set('marathon-settings', JSON.stringify({ dateOverride: '2026-08-17' }));
```

---

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Inter + JetBrains Mono (Google Fonts)
- No backend — all client-side
