# 🛡️ VayuShield — Urban Air Quality & Low-Emission Assistant

**VayuShield** is a climate-tech GenAI web application built for **Virtual: PromptWars (Challenge 6: Urban Air Quality Assistant)**. It empowers families and urban communities to navigate severe winter smog and air pollution through personalized low-emission daily routines, indoor air quality optimizations, sustainable lifestyle swaps, and quantified health and carbon impact analytics.

---

## ✨ Key Features

- **AQI-Adaptive Telemetry & UI:** Dynamic severity theming (Good, Moderate, Severe Smog) with an interactive SVG radial AQI gauge and city presets (Delhi NCR, Guwahati, Mumbai, Bengaluru, or custom input).
- **Personalized GenAI Action Plans:** Tailors recommendations based on **Household Profile** (kids, elderly, commuters, pets), **Indoor Setup** (HEPA purifier, cross-ventilation, indoor plants, gas stove), and **Commute Mode**.
- **Interactive Daily Routine Timeline:** Time-blocked schedule (Morning, Afternoon, Evening) with exposure risk indicators and expandable scientific explanations.
- **Live Direct Impact Scorecard:** Checkable habit cards that dynamically recalculate **PM2.5 Exposure Reduction (%)**, **Weekly CO₂ Saved (kg)**, and **Clean Air Score** in real time.
- **Zero-Downtime Hybrid Engine:** Powered by `gemini-2.5-flash` with structured JSON schema outputs, `localStorage` input-hash caching (0 repeat token cost), and a deterministic client-side fallback engine for offline reliability.

---

## 🏗️ Architecture & Engineering Standards

- **Frontend:** React 18, TypeScript (strict mode, zero `any`), Vite, Tailwind CSS
- **AI & Token Efficiency:** Structured JSON responses (`responseMimeType: "application/json"`) paired with client-side hash caching to minimize API token overhead.
- **Security:** XSS input sanitization (`src/utils/sanitize.ts`), strict Content Security Policy (CSP) headers, schema validation, and environment-isolated API keys (`.env.example`).
- **Accessibility (WCAG AAA):** Semantic HTML5 landmarks, ARIA live regions (`role="status"`), keyboard-navigable controls, and high-contrast typography (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono`).
- **Automated Testing:** Unit and integration test suite powered by **Vitest** and **React Testing Library**.

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone [https://github.com/](https://github.com/)riyandas66/VayuShield.git
cd VayuShield
npm install
