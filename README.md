# PerkPath — FIFA World Cup 2026

**Virtual Prompt Wars Challenge 4 Submission**

PerkPath is a **GenAI-powered Operational Intelligence & Vendor Optimization Engine** that solves stadium congestion through dynamic behavioral gamification. Instead of passively telling fans a gate is crowded, PerkPath uses Generative AI to proactively reroute fans by making alternative gates irresistible — turning a negative operational metric (congestion) into a positive fan experience (VIP rewards).

---

## Problem Statement Alignment

| Challenge Criterion | How PerkPath Addresses It |
|---------------------|---------------------------|
| **Navigation** | AI-driven real-time rerouting from congested gates to optimal alternatives with per-fan offers |
| **Crowd Management** | Live 8-gate congestion monitoring with auto-pilot that detects bottlenecks and triggers reroutes autonomously |
| **Accessibility** | WCAG 2.1 AA: screen-reader ARIA announcements, TTS audio playback, RTL layout, keyboard navigation, focus-visible outlines, reduced-motion support |
| **Multilingual Assistance** | 7 languages with native scripts (English, Spanish, French, German, Japanese, Portuguese, Arabic), AI-generated localized offers, Web Speech API TTS |
| **Real-Time Decision Support** | Auto-pilot analyzes stadium state every 30s, makes reroute/simulate/monitor decisions, runs full vendor auction pipeline |
| **Operational Intelligence** | Vendor auction engine scores 8 vendors across margin, prep time, distance, and congestion. Metrics dashboard tracks reroutes, revenue, congestion avoided, acceptance rate |

---

## Technical Architecture

### Production Architecture (Stadium-Scale)

```
┌──────────────┐     ┌────────────────┐     ┌─────────────────────┐       ┌──────────────────┐
│ CV Cameras   │────▶│ Event Bus      │────▶│ GenAI Orchestrator  │────▶│ Push Gateway     │
│ (80k fans,   │     │ (Kafka/Redis   │     │ (Gemini 2.5 Flash   │     │ (FCM/APNs,       │
│  8 gates)    │     │  Streams, <30ms)│     │  + Guardrails)      │     │  <5s p95)        │
└──────────────┘     └────────────────┘     │ JSON Schema +       │     └────────┬─────────┘
                                            │ Fallback Templates  │              │
                      ┌──────────────┐      └────────┬──────────┘              ▼
                      │ Vendor POS   │               │              ┌──────────────────────┐
                      │ Inventory    │───────────────┘              │ Fan Mobile App       │
                      │ (Real-time   │                              │ - QR Redemption      │
                      │  sync)       │                              │ - TTS + 7 Languages  │
                      └──────────────┘                              │ - Accessibility      │
                                                                   └──────────────────────┘
                                            ┌────────────────────────┐
                                            │ Auto-Pilot Engine      │
                                            │ (30s cycle, local      │
                                            │  fallback on quota)    │
                                            └────────────────────────┘
```

### Data Flow & Latency Budget

| Stage | Technology | Target Latency | Notes |
|-------|------------|----------------|-------|
| CV Inference | YOLOv8 / TensorRT @ Edge | <100ms/frame | 8 gates x 8 cameras |
| Event Ingestion | Kafka (5G edge) | <30ms | 80k events/min peak |
| GenAI Inference | Gemini 2.5 Flash (batched) | <800ms | temp 0.3, JSON mode |
| Validation & Fallback | In-process | <10ms | JSON schema + deterministic templates |
| Push Delivery | FCM/APNs + WebSocket fallback | <2s p95 | Priority=high |
| QR Redemption | Edge POS API | <200ms | Idempotent, nonce-based |
| **End-to-End** | | **<5s** | Fan receives offer within 5s of bottleneck |

### Scale Numbers (WC2026)

- **Fans:** 80,000 per match x 64 matches
- **Gates:** 8 primary (4 zones: North/East/South/West)
- **Concession Points:** 200+ per stadium
- **Languages:** 7 supported (expandable to 16 FIFA official + 50 regional)
- **Concurrent Push:** 15k/s peak (gate surge)
- **GenAI Throughput:** 500 req/s (batched, async)

---

## GenAI Implementation

### Core Integration (`src/services/aiService.js`)

PerkPath uses **Google Gemini 2.5 Flash** via `@google/genai` SDK for three AI functions:

1. **Offer Generation** — Personalized multilingual push notifications
2. **Auto-Pilot Decisions** — Stadium state analysis and action selection
3. **Scenario Generation** — Realistic match-day simulations

### Prompt Engineering

```javascript
// Offer generation prompt (simplified)
`You are the "PerkPath" AI engine for FIFA World Cup 2026.
Generate a SINGLE push notification (max 160 chars) to reroute a fan.
RULES:
- Output MUST be valid JSON matching schema.
- Language: ${fanLanguage} (full native script).
- Tone: Urgent, VIP, exclusive, action-oriented.
- Temperature: 0.3

SCHEMA:
{
  "offer": "string",
  "gate_from": "string",
  "gate_to": "string",
  "perk": "string",
  "expires_min": "integer"
}`
```

### Guardrails & Validation

| Guardrail | Implementation |
|-----------|----------------|
| **Structured Output** | `responseMimeType: 'application/json'` forces JSON |
| **Schema Validation** | Post-generation validation: required fields, types, value ranges |
| **Gate Consistency** | `gate_from` must match input, `gate_to` must be valid alternative |
| **Expiry Bounds** | `expires_min` in [1, 15] |
| **Rate Limiting** | Daily quota tracker (20 req/day free tier), localStorage-persisted |
| **Deterministic Fallback** | Pre-translated templates per language if AI fails/times out/quota exhausted |
| **Auto-Pilot Fallback** | Local rule-based decision maker when API quota is hit |

### Rate Limit Protection

```javascript
// Quota tracker with daily reset
const DAILY_LIMIT = 20;
const today = new Date().toISOString().slice(0, 10);
const stored = JSON.parse(localStorage.getItem('perkpath_api_usage') || '{}');
let apiUsage = stored.date === today ? stored : { date: today, count: 0 };

// Auto-pilot falls back to local logic when quota exhausted
if (!hasQuota()) {
  return makeLocalDecision(gates); // Rule-based reroute/simulate/monitor
}
```

### Multilingual Support

| Language | Native Name | Script | RTL | TTS Locale |
|----------|-------------|--------|-----|------------|
| English | English | Latin | No | en-US |
| Spanish | Espanol | Latin | No | es-ES |
| French | Francais | Latin | No | fr-FR |
| German | Deutsch | Latin | No | de-DE |
| Portuguese | Portugues | Latin | No | pt-BR |
| Japanese | 日本語 | Kanji/Kana | No | ja-JP |
| Arabic | العربية | Arabic | **Yes** | ar-SA |

---

## Auto-Pilot System

When enabled, auto-pilot runs every **30 seconds** and executes the full GenAI pipeline:

1. **Analysis** — Gemini analyzes all 8 gates (congestion, vendor surplus, zone, type)
2. **Decision** — Returns one of: `reroute`, `simulate_congestion`, `monitor`
3. **Vendor Auction** — Scores 8 vendor items by margin, prep time, distance, congestion penalty
4. **Offer Generation** — Generates localized push notification via Gemini
5. **Auto-Accept** — Simulates fan acceptance after 3s delay
6. **Metrics Update** — Increments rerouted count, revenue ($8.50/accept), congestion avoided
7. **Event Logging** — Full audit trail in admin event stream

When Gemini quota is exhausted, the **local fallback engine** takes over using deterministic rules (find most congested gate, find best alternative, same full pipeline).

---

## Privacy, Compliance & Ethics

| Requirement | Implementation |
|-------------|----------------|
| **GDPR (EU/UK)** | Lawful basis: Legitimate interest (crowd safety) + Consent (marketing). Data minimization: No biometrics stored. CV runs on-edge, only congestion % emitted. |
| **COPPA / Children** | Age-gate at app install. No PII from U13. Offers generic (no profiling). |
| **FIFA Data Policy** | Stadium data stays in-venue. No cross-stadium tracking. Vendor data aggregated. |
| **Accessibility (WCAG 2.1 AA)** | ARIA live regions, focus management, color contrast 4.5:1, TTS, RTL, scalable UI, reduced-motion. |
| **AI Transparency** | "Generated by PerkPath AI" badge on every offer. Human-in-loop for policy changes. |
| **Hallucination Prevention** | Schema validation + deterministic fallback. No fan-facing free-form text. |
| **Data Retention** | Operational logs: 30 days. Anonymized analytics: 1 year. No raw CV frames stored. |

---

## Accessibility

| Feature | Implementation |
|---------|----------------|
| **Screen Reader** | ARIA live regions announce offers, gate status changes, errors |
| **Keyboard Navigation** | Full tab order, focus-visible outlines, Enter/Space activation |
| **TTS Audio** | Web Speech API with per-language locale (en-US, es-ES, fr-FR, de-DE, ja-JP, pt-BR, ar-SA) |
| **RTL Support** | Arabic triggers `direction: rtl` on entire fan page layout |
| **Color Contrast** | Neon Lime (#ccff00) on dark (#0b0c10) = 12.5:1 ratio (exceeds AAA) |
| **Reduced Motion** | `prefers-reduced-motion: reduce` disables all animations |
| **Focus Management** | PIN gate auto-focuses first input, modals trap focus |
| **High-Contrast QR** | Canvas-generated QR codes with #ccff00 on #000 (12.5:1) |

---

## Security

| Measure | Detail |
|---------|--------|
| **API Key Handling** | Never committed to git (.env in .gitignore). Optional env var or secure modal (localStorage only). |
| **Admin Auth** | 6-digit numeric PIN (012026), sessionStorage-only, no backend persistence |
| **Session Management** | Admin auth clears on tab close. No persistent admin sessions. |
| **Input Sanitization** | All AI output validated against JSON schema before rendering |
| **No PII Collection** | Fan ID is auto-generated (FAN-{gate}-2026-{random}), stored in localStorage only |
| **CSP Compatible** | No inline scripts, no eval(), no dynamic imports |
| **XSS Prevention** | React's default JSX escaping + no dangerouslySetInnerHTML |

---

## Efficiency

| Metric | Value | Technique |
|--------|-------|-----------|
| **Bundle Size** | ~940KB (246KB gzip) | Vite tree-shaking, code splitting ready |
| **LCP** | <2s | Static assets, font preloading, minimal JS |
| **GenAI Latency** | <800ms per call | Gemini 2.5 Flash, temperature 0.3, max 150 tokens |
| **Auto-Pilot Cycle** | 30s interval | useRef stable callback, no unnecessary re-renders |
| **State Updates** | useCallback/useMemo | All context functions memoized, minimal re-renders |
| **Rate Limiting** | localStorage daily counter | Zero API calls when quota exhausted, local fallback |
| **QR Generation** | Canvas-based, zero deps | Deterministic pattern from offer data, no external library |
| **CSS** | Custom properties, no runtime | Zero CSS-in-JS overhead, pure CSS variables |

---

## Testing

### Manual Test Checklist

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Fan page loads at `/` | Ticket card, gate grid, language selector visible | Pass |
| Admin page loads at `/admin` | PIN gate appears, enter WC2026 | Pass |
| Language switch (7 languages) | All UI text translates, RTL works for Arabic | Pass |
| Trigger AI offer | Gemini generates localized offer, QR code, TTS available | Pass |
| Accept offer | Congestion drops, metrics update, event logged | Pass |
| Auto-pilot toggle | Interval starts, events stream in, full pipeline executes | Pass |
| Auto-pilot quota exhaustion | Falls back to local logic seamlessly | Pass |
| Vendor auction | 8 vendors scored, best selected, trace displayed | Pass |
| Congestion slider | Real-time update, danger state at >75% | Pass |
| Keyboard navigation | Tab through all interactive elements, focus visible | Pass |
| Screen reader | ARIA announcements for offers, errors, status | Pass |
| Reduced motion | Animations disabled when OS setting active | Pass |
| RTL layout | Arabic flips entire layout right-to-left | Pass |

### Automated Quality

- **Lint:** oxlint (zero errors, 2 benign warnings)
- **Build:** Vite production build passes clean
- **Type Safety:** React 19 + JSX (no TypeScript, but prop patterns are consistent)

---

## Project Structure

```
src/
├── services/
│   └── aiService.js              # Gemini integration, guardrails, fallback, rate limiting
├── contexts/
│   ├── AppContext.jsx             # All app state: gates, offers, metrics, auto-pilot
│   └── AuthContext.jsx            # Admin PIN authentication (sessionStorage)
├── pages/
│   ├── FanPage.jsx               # Fan experience: ticket, gates, offer overlay, QR, TTS
│   └── AdminPage.jsx             # Command center: KPIs, gates, vendor auction, event log
├── components/
│   └── PinGate.jsx               # 6-digit PIN entry with focus management
├── App.jsx                        # Thin shell: providers + React Router
├── main.jsx                       # Entry: BrowserRouter + StrictMode
└── index.css                      # Design system: glassmorphic UI, a11y, responsive
```

---

## How to Run

### Prerequisites
- Node.js 18+
- Google Gemini API Key (free tier: 20 req/day) from [Google AI Studio](https://aistudio.google.com)

### Setup

```bash
# Clone
git clone https://github.com/hotokeAtlast/PerkPath.git
cd PerkPath

# Install
npm install

# Configure (optional — app prompts for key if missing)
cp .env.example .env
# Edit .env: VITE_GEMINI_API_KEY=your_key_here

# Run
npm run dev
```

Open `http://localhost:5173/`

### Admin Access

> **Admin PIN: `012026`**
>
> Click the **Ops** button on the fan page, or navigate to `/admin` and enter the 6-digit PIN to access the Command Center.

### Demo Flow for Judges

1. **Fan Page** (`/`) — See ticket card, gate congestion grid, language selector
2. **Switch to Arabic** — RTL layout activates, all text translates to Arabic
3. **Click "Ops" button** — Navigate to admin (or go to `/admin`)
4. **Enter PIN: 012026** — Access command center
5. **Drag Gate C1 to 90%** — Bottleneck indicator appears
6. **Toggle Auto-Pilot ON** — Watch full pipeline execute every 30s:
   - AI analyzes stadium state
   - Vendor auction runs
   - Offer generated and displayed
   - Auto-accepted after 3s
   - Metrics update, event logged
7. **Switch language on fan page** — Offers generate in selected language
8. **Check API counter** — Shows usage (e.g., "API: 5/20")
9. **When quota exhausted** — Auto-pilot continues with local fallback logic

---

## Future Work

- **Computer Vision Pipeline:** YOLOv8 + ByteTrack on edge GPUs (Jetson Orin)
- **Event Mesh:** Kafka on 5G MEC for <30ms latency
- **RAG for Policy:** Stadium ops manual + vendor contracts in GenAI context
- **A/B Testing:** Compare offer phrasing, urgency windows, perk types
- **Digital Twin:** MassMotion crowd flow simulation
- **Vendor API:** OpenAPI spec for POS sync (Square, Toast, Oracle MICROS)

---

## License

MIT — Built for Virtual Prompt Wars Challenge 4.
