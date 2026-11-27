# VayuShield — Urban Air Quality & Low-Emission Assistant

VayuShield is an environmental intelligence dashboard built with **React 19, Vite, TypeScript, Tailwind CSS v4, Express, and `@google/genai` (`gemini-2.5-flash`)**. It translates ambient AQI readings and household context into time-blocked daily protective routines, indoor air filtration guidance, and measurable low-emission habits.

---

## UI/UX Design System ("Modern Climate-Tech Editorial")

- **Surface & Elevation Palette**: Soft off-white canvas (`#F8FAFC`), crisp white Bento containers (`#FFFFFF`), `1px` hairline borders (`#E2E8F0`), and single-level layered elevation shadows.
- **Dynamic AQI-Adaptive Theming** (WCAG AAA/AA verified contrast ratios `>= 5:1` on controls and `>= 7:1` on tinted callouts):
  - **Good (`0–100`)**: Emerald (`#059669` gauge stroke, `#047857` action surface).
  - **Moderate (`101–200`)**: Amber (`#D97706` gauge stroke, `#B45309` action surface).
  - **Severe Smog (`201–500`)**: Crimson (`#DC2626` gauge stroke, `#B91C1C` action surface).
- **Typography**:
  - `Plus Jakarta Sans` (`-0.02em` tracking) for editorial hierarchy and headings.
  - `Inter` for clean UI controls and explanatory copy.
  - `JetBrains Mono` with `tabular-nums` for AQI figures, PM2.5/PM10 estimates, CO2 savings, and Clean Air Score.
- **Spatial Architecture**:
  - **Sticky Glass Header** (`backdrop-blur-md`): Brand mark, live AQI telemetry indicator, city quick-switcher (`Delhi NCR`, `Guwahati`, `Mumbai`, `Bengaluru`, `Custom`), and interactive Impact Summary trigger.
  - **Sticky Left Control Rail** (Desktop) / **Collapsible Drawer** (Mobile): AQI range slider (`0–500`), Household Profile toggles, Indoor Setup chips, and Commute Mode radio selector.
  - **Asymmetric 12-Column Bento Workspace (`24px` gaps)**:
    - Hero Telemetry Card (`8 cols`) with radial SVG AQI gauge, smog advisory banner, and shimmer primary CTA.
    - Direct Impact Scorecard (`4 cols`) with live animated counters that recalculate immediately as actions are toggled.
    - Time-Blocked Daily Routine (`6 cols`) covering Morning, Afternoon, and Evening with expandable atmospheric-science rationale drawers.
    - Indoor Air Quality & Sustainable Swaps Matrix (`6 cols`) with WAI-ARIA keyboard-navigable tabs and checkable impact cards.

---

## Token-Efficient GenAI & Prompt Architecture

1. **Server-Side Gemini Proxy (`server.ts` -> `POST /api/plan`)**:
   - Uses `@google/genai` with `gemini-2.5-flash`, `responseMimeType: "application/json"`, and a strict `responseSchema` to eliminate conversational prose and minimize output tokens.
   - `GEMINI_API_KEY` stays strictly on the server via `process.env.GEMINI_API_KEY` and is never exposed to the browser bundle.
2. **Real-Time OpenWeather Dispersion Proxy (`server.ts` -> `GET /api/weather`)**:
   - Reads `OPENWEATHER_API_KEY` exclusively on the server and queries `api.openweathermap.org/data/2.5/weather` with a 5-minute TTL cache on both server and client.
   - Surfaces real-time temperature (°C), humidity (%), wind speed (km/h), and computed particulate dispersion status directly inside `HeroTelemetryCard`, and forwards live meteorology to `/api/plan` when available.
2. **Zero-Token `localStorage` Hash Caching (`src/utils/sanitize.ts`, `src/services/geminiService.ts`)**:
   - Each configuration is normalized (sorted arrays, sanitized custom city, 5-point AQI buckets) and hashed via deterministic FNV-1a (`createConfigHash`).
   - Identical profiles resolve instantaneously from `localStorage` with **0 API tokens**.
3. **Deterministic Offline Fallback Engine (`src/services/fallbackEngine.ts`)**:
   - Generates scientifically grounded routines and action checklists tailored to city, AQI tier, household vulnerabilities, indoor setup, and commute mode so the app works instantaneously offline or without an API key.
4. **Strict Runtime Schema Validation (`src/utils/schemaValidator.ts`)**:
   - Every response from `/api/plan` or `localStorage` is validated field-by-field and text-sanitized before rendering.

---

## Security & Accessibility Safeguards

- **Strict CSP**: Enforced via `<meta http-equiv="Content-Security-Policy">` in `index.html` with `connect-src 'self'`, `object-src 'none'`, and `base-uri 'self'`.
- **Input Sanitization**: Custom location inputs are sanitized via `sanitizeLocation()` on both client and server (stripping HTML tags, script/style blocks, URI schemes, control characters, and enforcing max length).
- **WCAG AAA / Keyboard Accessibility**: Semantic landmarks (`<header>`, `<aside>`, `<main>`, `<section>`, `<footer>`), skip-to-content link, ARIA `meter`, `progressbar`, `tablist`/`tab`/`tabpanel`, `radiogroup`, `checkbox`, `aria-expanded` drawers, `role="status"` live regions, and `prefers-reduced-motion` compliance.

---

## Scripts

```bash
npm run dev     # Start Express + Vite dev server on http://localhost:3000
npm test        # Run Vitest + React Testing Library unit & integration suite
npm run lint    # Run strict TypeScript type-checking (tsc --noEmit)
npm run build   # Build production client bundle to dist/
```
