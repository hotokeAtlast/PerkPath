import { GoogleGenAI } from '@google/genai';

const DAILY_LIMIT = 20;
const today = new Date().toISOString().slice(0, 10);
const stored = JSON.parse(localStorage.getItem('perkpath_api_usage') || '{}');
let apiUsage = stored.date === today ? stored : { date: today, count: 0 };

function trackUsage() {
  apiUsage.count++;
  localStorage.setItem('perkpath_api_usage', JSON.stringify(apiUsage));
}

function hasQuota() {
  return apiUsage.count < DAILY_LIMIT;
}

function getQuotaRemaining() {
  return Math.max(0, DAILY_LIMIT - apiUsage.count);
}

const FALLBACK_OFFERS = {
  English: 'VIP ALERT: {targetGate} is at capacity. Reroute to {optimalGate} NOW for {optimalPerk} — exclusive offer expires in 5 minutes!',
  Spanish: 'ALERTA VIP: {targetGate} está saturado. Redirígete a {optimalGate} AHORA por {optimalPerk} — oferta exclusiva expira en 5 minutos!',
  French: 'ALERTE VIP : {targetGate} est saturé. Redirigez-vous vers {optimalGate} MAINTENANT pour {optimalPerk} — offre exclusive expire dans 5 minutes !',
  German: 'VIP-ALARM: {targetGate} ist überfüllt. Sofort zu {optimalGate} umleiten für {optimalPerk} — exklusives Angebot läuft in 5 Minuten ab!',
  Japanese: 'VIPアラート: {targetGate}は満員です。{optimalGate}へ今すぐ経路変更で{optimalPerk}を獲得 — 限定オファーは5分で期限切れ！',
  Portuguese: 'ALERTA VIP: {targetGate} está lotado. Redirecione para {optimalGate} AGORA para {optimalPerk} — oferta exclusiva expira em 5 minutos!',
  Arabic: '!تنبيه VIP: {targetGate} ممتلئ. أعد التوجيه إلى {optimalGate} الآن لـ {optimalPerk} — العرض الحصري ينتهي خلال 5 دقائق',
};

function getClient(apiKey) {
  const key = import.meta.env.VITE_GEMINI_API_KEY || apiKey;
  if (!key) throw new Error('API_KEY_MISSING');
  return { ai: new GoogleGenAI({ apiKey: key }), key };
}

/**
 * Retries an async function with exponential backoff.
 * Used to handle transient 503 errors from Gemini API.
 */
async function withRetry(fn, maxRetries = 2, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is503 = err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE') || err?.message?.includes('high demand');
      if (is503 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[PerkPath] API 503, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Safely parses JSON from Gemini API responses.
 * Handles markdown code blocks, double-encoded strings, and extra text.
 */
function safeParseJson(text) {
  if (!text) return null;

  let cleaned = String(text).trim();

  // Strip markdown code blocks: ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

  // Try parsing as-is first
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue to fallback strategies
  }

  // Handle double-encoded: the entire response is a JSON string containing JSON
  // e.g. '{"description":"..."}' wrapped in extra quotes
  try {
    const decoded = JSON.parse(cleaned);
    if (typeof decoded === 'string') {
      return JSON.parse(decoded);
    }
    // If decoded is already an object, return it
    if (typeof decoded === 'object' && decoded !== null) {
      return decoded;
    }
  } catch {
    // continue
  }

  // Extract JSON object by finding first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonStr);
    } catch {
      // continue
    }
  }

  // Last resort: try to fix common issues like trailing commas
  try {
    const fixed = cleaned.replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

/**
 * Validates AI response against schema and sanitizes output.
 */
function validateAndSanitize(responseText, targetGate, optimalGate) {
  const parsed = safeParseJson(responseText);
  if (!parsed) return null;

  if (
    !parsed.offer ||
    typeof parsed.offer !== 'string' ||
    parsed.offer.length > 200 ||
    parsed.gate_from !== targetGate ||
    parsed.gate_to !== optimalGate ||
    !parsed.perk ||
    typeof parsed.expires_min !== 'number' ||
    parsed.expires_min < 1 ||
    parsed.expires_min > 15
  ) {
    return null;
  }

  return parsed.offer;
}

/**
 * Generates a localized fallback offer using template.
 */
function generateFallback(language, targetGate, optimalGate, optimalPerk) {
  const template = FALLBACK_OFFERS[language] || FALLBACK_OFFERS.English;
  return template
    .replace('{targetGate}', targetGate)
    .replace('{optimalGate}', optimalGate)
    .replace('{optimalPerk}', optimalPerk);
}

/**
 * Generates a localized offer via Gemini.
 */
export const generateOffer = async (apiKey, targetGate, optimalGate, optimalPerk, fanLanguage) => {
  if (!hasQuota()) {
    console.warn('[PerkPath] Quota exhausted, using fallback offer');
    return generateFallback(fanLanguage, targetGate, optimalGate, optimalPerk);
  }

  const { ai } = getClient(apiKey);

  const prompt = `You are the "PerkPath" AI engine for FIFA World Cup 2026.
Generate a SINGLE push notification (max 160 chars) to reroute a fan from a congested gate.

RULES:
- Output MUST be valid JSON matching the schema below.
- Language: ${fanLanguage} (full native script, NO English unless language IS English).
- Tone: Urgent, VIP, exclusive, action-oriented.
- Must include: target gate, alternative gate, specific perk, urgency (time limit).
- NO markdown, NO commentary, NO extra keys.

SCHEMA:
{
  "offer": "string",
  "gate_from": "string",
  "gate_to": "string",
  "perk": "string",
  "expires_min": "integer"
}

CONTEXT:
- Fan is walking toward: ${targetGate} (congested)
- Reroute to: ${optimalGate}
- Perk: ${optimalPerk}
- Language: ${fanLanguage}`;

  try {
    trackUsage();
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 120,
        responseMimeType: 'application/json',
      },
    }));

    const validated = validateAndSanitize(response.text, targetGate, optimalGate);
    if (validated) return validated;
  } catch (err) {
    console.warn('[PerkPath] GenAI offer failed, using fallback:', err.message);
  }

  return generateFallback(fanLanguage, targetGate, optimalGate, optimalPerk);
};

/**
 * Local fallback auto-pilot decision when quota is exhausted.
 */
function makeLocalDecision(gates) {
  const entries = Object.entries(gates);
  const mostCongested = entries.reduce((worst, [id, g]) =>
    g.congestion > (worst?.[1]?.congestion || 0) ? [id, g] : worst, entries[0]);

  if (mostCongested[1].congestion > 70) {
    const alt = entries
      .filter(([id, g]) => id !== mostCongested[0] && g.congestion < 50 && g.surplus)
      .sort((a, b) => a[1].congestion - b[1].congestion);

    if (alt.length > 0) {
      return {
        action: 'reroute',
        congestedGate: mostCongested[0],
        gateId: null, newLevel: null,
        reasoning: `Auto-pilot (local): ${mostCongested[0]} at ${mostCongested[1].congestion}%, rerouting to ${alt[0][0]}`
      };
    }
  }

  if (mostCongested[1].congestion < 60) {
    const candidates = entries.filter(([, g]) => g.congestion > 30 && g.congestion < 65);
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      return {
        action: 'simulate_congestion',
        congestedGate: null,
        gateId: pick[0], newLevel: 80 + Math.floor(Math.random() * 15),
        reasoning: `Auto-pilot (local): Simulating congestion spike at ${pick[0]}`
      };
    }
  }

  return {
    action: 'monitor',
    congestedGate: null, gateId: null, newLevel: null,
    reasoning: `Auto-pilot (local): Stadium nominal — max ${mostCongested[0]} at ${mostCongested[1].congestion}%`
  };
}

/**
 * Auto-pilot: analyzes stadium state and decides what action to take.
 */
export const generateAutoPilotDecision = async (apiKey, gates) => {
  if (!hasQuota()) {
    console.warn('[PerkPath] Quota exhausted, using local auto-pilot');
    return makeLocalDecision(gates);
  }

  const { ai } = getClient(apiKey);

  const gateSummary = Object.entries(gates)
    .map(([id, g]) => `${id}: ${g.congestion}% congestion, ${g.vendorItem} (surplus: ${g.surplus}), zone: ${g.zone}, type: ${g.type}`)
    .join('\n');

  const prompt = `You are the PerkPath auto-pilot AI for FIFA World Cup 2026.
Analyze this stadium state and decide the BEST single action:

${gateSummary}

RULES:
- Output ONLY valid JSON, no markdown.
- If ANY gate is above 70% congestion AND a surplus vendor exists at another gate: action="reroute", provide congestedGate and reasoning.
- If no urgent action needed but congestion is building: action="simulate_congestion", pick a gate and set newLevel between 80-95.
- If everything is fine: action="monitor", reasoning explains why.
- Keep reasoning under 120 chars.

SCHEMA:
{
  "action": "reroute" | "simulate_congestion" | "monitor",
  "congestedGate": "string | null",
  "gateId": "string | null",
  "newLevel": "number | null",
  "reasoning": "string"
}`;

  try {
    trackUsage();
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 150,
        responseMimeType: 'application/json',
      },
    }));

    const parsed = safeParseJson(response.text);
    if (parsed && parsed.action && parsed.reasoning) return parsed;
  } catch (err) {
    console.warn('[PerkPath] Auto-pilot error:', err.message);
  }

  return makeLocalDecision(gates);
};

export const getApiQuota = () => ({ used: apiUsage.count, limit: DAILY_LIMIT, remaining: getQuotaRemaining() });

/**
 * Generates a realistic match-day scenario via Gemini.
 */
export const generateMockScenario = async (apiKey) => {
  const { ai } = getClient(apiKey);

  const prompt = `Generate a realistic FIFA World Cup 2026 match-day scenario for a stadium with 8 gates.
Each gate has: id, congestion (0-100), vendorItem (string), surplus (boolean).

Gate IDs: A1, A2, B1, B2, C1, C2, D1, D2
Zones: A=North, B=East, C=South, D=West
Types: A1=Public Entry, A2=VIP Entry, B1=Transit Hub, B2=Accessible, C1=Parking Entry, C2=Premium, D1=Media/VIP, D2=General

Vendor items to use: Cold Drinks, Hot Dogs, Team Jerseys, Premium Snacks, Coffee, Nachos, Bottled Water, Popcorn.

Return exactly this JSON structure, nothing else:
{"description":"your description","gates":{"A1":{"congestion":85,"vendorItem":"Cold Drinks","surplus":false},"A2":{"congestion":10,"vendorItem":"Premium Snacks","surplus":true},"B1":{"congestion":40,"vendorItem":"Hot Dogs","surplus":false},"B2":{"congestion":15,"vendorItem":"Coffee","surplus":true},"C1":{"congestion":92,"vendorItem":"Team Jerseys","surplus":false},"C2":{"congestion":25,"vendorItem":"Nachos","surplus":true},"D1":{"congestion":60,"vendorItem":"Bottled Water","surplus":false},"D2":{"congestion":50,"vendorItem":"Popcorn","surplus":true}}}

Rules: At least 2 gates above 75%, at least 3 with surplus=true. Output ONLY the JSON object.`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 800,
        responseMimeType: 'application/json',
      },
    }));

    const parsed = safeParseJson(response.text);
    if (parsed && parsed.gates) return parsed;

    // Try to extract gates if nested differently
    if (parsed) {
      const keys = Object.keys(parsed);
      console.warn('[PerkPath] Scenario parsed but no gates. Keys:', keys, 'Full:', JSON.stringify(parsed).slice(0, 300));
      // Check if gates is nested under a different key
      for (const key of keys) {
        if (parsed[key] && typeof parsed[key] === 'object' && parsed[key].A1) {
          return { description: parsed.description || 'Match day simulation', gates: parsed[key] };
        }
      }
    }
  } catch (err) {
    console.warn('[PerkPath] Scenario generation error:', err.message);
  }

  return null;
};
