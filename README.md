# PerkPath — FIFA World Cup 2026

**Submission for Virtual Prompt Wars Challenge 4**

PerkPath is a GenAI-enabled **Operational Intelligence & Vendor Optimization Engine** designed to solve stadium congestion through dynamic behavioral gamification.

Instead of passively telling fans that a gate or transit hub is congested (which often leads to frustration), PerkPath uses Generative AI to proactively change fan behavior by making alternative routes highly rewarding.

## The Concept

When stadium operations detect a bottleneck forming at a specific gate, PerkPath instantly generates a hyper-targeted, localized campaign for fans walking in that direction.

It pings their phones in their native language with a dynamically generated offer (e.g., *"Gate C is packed! Reroute to Gate A in the next 5 minutes and scan this barcode for 50% off a cold drink."*). The AI negotiates these offers on the fly based on which concession stands have surplus inventory and zero lines, turning a negative operational metric (congestion) into a positive fan experience (a VIP reward).

### Key Features Demonstrated
1. **Dynamic Vendor Revenue Optimization:** Connects crowd control to concession inventory, pushing surplus items to fans in real-time.
2. **Multilingual Assistance:** Uses the Gemini LLM to instantly translate and localize high-priority operational push notifications into the fan's native language (7 languages, native scripts).
3. **Real-Time Operational Intelligence:** Synthesizes multiple data streams (congestion heatmaps + vendor inventory + fan location) to make optimal routing decisions in <5s.
4. **Accessibility-First:** Screen-reader announcements, audio playback (Web Speech API), high-contrast QR codes, RTL layout support.
5. **Guardrailed GenAI:** JSON schema enforcement, temperature=0.3, structured validation, deterministic fallback templates.

---

## Technical Architecture

### Production Architecture (Stadium-Scale)

```
┌──────────────┐     ┌────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│ CV Cameras   │────▶│ Event Bus      │────▶│ GenAI Orchestrator  │────▶│ Push Gateway     │
│ (80k fans,   │     │ (Kafka/Redis   │     │ (Gemini 2.5 Flash  │     │ (FCM/APNs,       │
│  10+ gates)  │     │  Streams, <30ms)│    │  + RAG + Guardrails)│    │  <5s p95)      │
└──────────────┘     └────────────────┘     │ JSON Schema +     │     └────────┬─────────┘
                                             │ Fallback Templates│              │
                      ┌──────────────┐       └────────┬────────┘              ▼
                      │ Vendor POS   │                │         ┌──────────────────────┐
                      │ Inventory    │────────────────┘         │ Fan Mobile App       │
                      │ (Real-time   │                          │ - QR Redemption      │
                      │  sync)       │                          │ - Accessibility      │
                      └──────────────┘                          │ - Offline Cache      │
                                                               └──────────────────────┘
                                            ┌────────────────────────┐
                                            │ Observability Stack    │
                                            │ (Metrics, Logs, Traces,│
                                            │  Alerts, SLOs)         │
                                            └────────────────────────┘
```

### Data Flow & Latency Budget

| Stage | Technology | Target Latency | Notes |
|-------|------------|----------------|-------|
| CV Inference | YOLOv8 / TensorRT @ Edge | <100ms/frame | 10 gates × 8 cameras |
| Event Ingestion | Kafka (5G edge) | <30ms | 80k events/min peak |
| GenAI Inference | Gemini 2.5 Flash (batched) | <800ms | 100 req/s, temp 0.3 |
| Validation & Fallback | In-process | <10ms | JSON schema + regex |
| Push Delivery | FCM/APNs + WebSocket fallback | <2s p95 | Priority=high |
| QR Redemption | Edge POS API | <200ms | Idempotent, nonce-based |
| **End-to-End** | | **<5s** | Fan receives offer within 5s of bottleneck |

### Scale Numbers (WC2026)

- **Fans:** 80,000 per match × 64 matches
- **Gates:** 12 primary + 8 emergency
- **Concession Points:** 200+ per stadium
- **Languages:** 16 official FIFA languages + 50+ regional
- **Concurrent Push:** 15k/s peak (gate surge)
- **GenAI Throughput:** 500 req/s (batched, async)
- **Data Retention:** 30 days operational, 1 year anonymized analytics

---

## GenAI Implementation Details

### Prompt Engineering (`src/services/aiService.js`)

```javascript
const SYSTEM_PROMPT = `
You are the 'PerkPath' AI engine for FIFA World Cup 2026.
Generate a SINGLE push notification (max 160 chars) to reroute a fan.
RULES:
- Output MUST be valid JSON matching schema.
- Language: {{LANGUAGE}} (full native script, NO English unless language IS English).
- Tone: Urgent, VIP, exclusive, action-oriented.
- Include: target gate, alternative gate, specific perk, urgency (time limit).
- NO markdown, NO commentary, NO extra keys.
- Temperature: 0.3

SCHEMA:
{
  "offer": "string",
  "gate_from": "string",
  "gate_to": "string", 
  "perk": "string",
  "expires_min": "integer"
}
`;
```

### Guardrails & Validation

1. **Structured Output:** `responseMimeType: 'application/json'` forces JSON.
2. **Schema Validation:** Post-generation validation checks all required fields, types, value ranges.
3. **Gate Consistency:** `gate_from` must match input, `gate_to` must be valid alternative.
4. **Perk Grounding:** Perk text must contain the negotiated item name.
5. **Expiry Bounds:** `expires_min` ∈ [1, 15].
6. **Deterministic Fallback:** Pre-translated templates per language (7 languages) if AI fails/times out.

### Multilingual Support

| Language | Native Name | Script | RTL | TTS Locale |
|----------|-------------|--------|-----|------------|
| English | English | Latin | No | en-US |
| Spanish | Español | Latin | No | es-ES |
| French | Français | Latin | No | fr-FR |
| German | Deutsch | Latin | No | de-DE |
| Portuguese | Português | Latin | No | pt-BR |
| Japanese | 日本語 | Kanji/Kana | No | ja-JP |
| Arabic | العربية | Arabic | **Yes** | ar-SA |

---

## Privacy, Compliance & Ethics

| Requirement | Implementation |
|-------------|----------------|
| **GDPR (EU/UK)** | Lawful basis: Legitimate interest (crowd safety) + Consent (marketing offers). Data minimization: No biometrics stored. CV runs on-edge, only congestion % emitted. |
| **COPPA / Children** | Age-gate at app install. No PII from U13. Offers generic (no profiling). |
| **FIFA Data Policy** | Stadium data stays in-venue. No cross-stadium tracking. Vendor data aggregated. |
| **Accessibility (WCAG 2.1 AA)** | ARIA live regions, focus management, color contrast 4.5:1, TTS, RTL, scalable UI. |
| **AI Transparency** | "Generated by PerkPath AI" badge on every offer. Human-in-loop for policy changes. |
| **Hallucination Prevention** | Schema validation + deterministic fallback. No fan-facing free-form text. |
| **Data Retention** | Operational logs: 30 days. Anonymized analytics: 1 year. No raw CV frames stored. |

---

## Prototype Demo

This prototype is a React application built with Vite and designed with a premium, glassmorphic UI. It features a Dual-View Interface:
- **Command Center (Admin):** Simulates operational view. Live inventory states, adjustable gate congestion, real-time vendor auction engine, event stream terminal, production architecture diagram.
- **Fan Mobile Simulator:** Shows digital ticket, navigation target, dynamically generated push notification with QR code, audio playback, accessibility banner.

### GenAI Integration (`@google/genai`)
PerkPath leverages the **Google Gemini API (`gemini-2.5-flash`)** as its core engine. The AI dynamically synthesizes stadium congestion, vendor surplus, and fan language to generate a contextual VIP offer on the fly.

---

## How to Run the Prototype Locally

### Prerequisites
- Node.js 18+
- Google Gemini API Key (get from [Google AI Studio](https://aistudio.google.com))

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your key:
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
   *(If skipped, app prompts for key via secure modal on first load.)*

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **View the App**
   Open `http://localhost:5173/`

---

### Recommended Demo Flow for Judges

1. In **Fan Mobile Simulator**, change language to **Arabic** (tests RTL) or **Japanese** (tests CJK).
2. On **Command Center Map**, click **Gate C** to set fan target.
3. Drag Gate C congestion slider to **90%** (triggers bottleneck badge).
4. In Vendor panel, set **Gate A (Cold Drinks)** to **High Surplus**.
5. Click **Run Auction & Trigger AI** → watch negotiation trace appear.
6. Click **Trigger PerkPath AI Engine** → offer generated in selected language.
7. On Fan view: observe **QR code**, press **audio button** (TTS), see **accessibility banner**.
8. Click **Accept Offer** → gate congestion drops, KPIs update, event log records redemption.

---

## Project Structure

```
src/
├── services/
│   └── aiService.js          # Gemini integration, guardrails, fallback templates
├── components/
│   ├── AdminDashboard.jsx    # Command center: gates, vendor auction, event log, architecture
│   ├── FanMobileView.jsx     # Fan simulator: ticket, map, offer, QR, TTS, a11y
│   └── ApiKeyModal.jsx       # Secure API key entry (localStorage only)
├── App.jsx                   # State orchestration, event logging, offer flow
├── index.css                 # Glassmorphic design system, animations
└── main.jsx                  # Entry point
```

---

## Future Work / Production Hardening

- **Computer Vision Pipeline:** Deploy YOLOv8 + ByteTrack on edge GPUs (Jetson Orin) per gate.
- **Event Mesh:** Kafka on 5G MEC for <30ms fan-to-orchestrator latency.
- **RAG for Policy:** Inject stadium ops manual, vendor contracts, safety rules into GenAI context.
- **A/B Testing Framework:** Compare offer phrasing, urgency windows, perk types per demographic.
- **Digital Twin Integration:** Simulate crowd flows (MassMotion) to pre-position offers.
- **Vendor API Standardization:** OpenAPI spec for POS inventory sync (Square, Toast, Oracle MICROS).
- **Chaos Engineering:** Simulate network partitions, CV failures, GenAI quota exhaustion.

---

## License

MIT — Built for Virtual Prompt Wars Challenge 4.