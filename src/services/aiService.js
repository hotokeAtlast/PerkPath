import { GoogleGenAI } from '@google/genai';

const FALLBACK_OFFERS = {
  English: 'VIP ALERT: {targetGate} is at capacity. Reroute to {optimalGate} NOW for {optimalPerk} — exclusive offer expires in 5 minutes!',
  Spanish: 'ALERTA VIP: {targetGate} está saturado. Redirígete a {optimalGate} AHORA por {optimalPerk} — oferta exclusiva expira en 5 minutos!',
  French: 'ALERTE VIP : {targetGate} est saturé. Redirigez-vous vers {optimalGate} MAINTENANT pour {optimalPerk} — offre exclusive expire dans 5 minutes !',
  German: 'VIP-ALARM: {targetGate} ist überfüllt. Sofort zu {optimalGate} umleiten für {optimalPerk} — exklusives Angebot läuft in 5 Minuten ab!',
  Japanese: 'VIPアラート: {targetGate}は満員です。{optimalGate}へ今すぐ経路変更で{optimalPerk}を獲得 — 限定オファーは5分で期限切れ！',
  Portuguese: 'ALERTA VIP: {targetGate} está lotado. Redirecione para {optimalGate} AGORA para {optimalPerk} — oferta exclusiva expira em 5 minutos!',
};

const SYSTEM_PROMPT = `
You are the "PerkPath" AI engine for FIFA World Cup 2026.
Generate a SINGLE push notification (max 160 chars) to reroute a fan from a congested gate.

RULES:
- Output MUST be valid JSON matching the schema below.
- Language: {{LANGUAGE}} (full native script, NO English unless language IS English).
- Tone: Urgent, VIP, exclusive, action-oriented.
- Must include: target gate, alternative gate, specific perk, urgency (time limit).
- NO markdown, NO commentary, NO extra keys.
- Temperature: 0.3 (low creativity, high consistency).

SCHEMA:
{
  "offer": "string",
  "gate_from": "string",
  "gate_to": "string",
  "perk": "string",
  "expires_min": "integer"
}
`;

/**
 * Validates AI response against schema and sanitizes output.
 */
function validateAndSanitize(responseText, targetGate, optimalGate, _optimalPerk, _language) {
  let parsed;
  try {
    parsed = JSON.parse(responseText.trim());
  } catch {
    return null;
  }

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
 * Service to handle Gemini API generation logic for PerkPath.
 */
export const generateOffer = async (apiKey, targetGate, optimalGate, optimalPerk, fanLanguage) => {
  const finalKey = import.meta.env.VITE_GEMINI_API_KEY || apiKey;

  if (!finalKey) {
    throw new Error('API_KEY_MISSING');
  }

  const ai = new GoogleGenAI({ apiKey: finalKey });

  const prompt = SYSTEM_PROMPT.replace('{{LANGUAGE}}', fanLanguage) + `
CONTEXT:
- Fan is walking toward: ${targetGate} (congested)
- Reroute to: ${optimalGate}
- Perk: ${optimalPerk}
- Language: ${fanLanguage}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 120,
        responseMimeType: 'application/json',
      },
    });

    const validated = validateAndSanitize(response.text, targetGate, optimalGate, optimalPerk, fanLanguage);
    if (validated) return validated;
  } catch (err) {
    console.warn('[PerkPath] GenAI failed, using fallback:', err.message);
  }

  return generateFallback(fanLanguage, targetGate, optimalGate, optimalPerk);
};