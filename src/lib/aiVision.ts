/**
 * AI Vision Inspector & Multimodal Computer Vision Utility (SIH-26001 Aligned)
 * Connects directly to Google Gemini Multimodal Vision Gateway to analyze
 * citizen field evidence, detect authentic landslide morphology, and flag irrelevant media.
 */

export interface AiVisionResult {
  isValidTerrain: boolean;
  statusBadge: 'FIELD FAILURE VERIFIED' | 'IRRELEVANT MEDIA DETECTED';
  assessmentText: string;
}

export async function analyzeFieldImage(imageBase64: string): Promise<{
  isValidTerrain: boolean;
  statusBadge: 'FIELD FAILURE VERIFIED' | 'IRRELEVANT MEDIA DETECTED';
  assessmentText: string;
}> {
  // Read ONLY from environment variables (never hardcode the secret string here)
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY ||
    (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && (process.env?.VITE_GEMINI_API_KEY || process.env?.GEMINI_API_KEY));

  if (!apiKey) {
    return {
      isValidTerrain: false,
      statusBadge: 'IRRELEVANT MEDIA DETECTED',
      assessmentText: 'Configuration Error: VITE_GEMINI_API_KEY not found in environment. Set it in .env to run vision audits.'
    };
  }

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9.+_-]+;base64,/, '');
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a geotechnical computer vision inspector for the Geological Survey of India (GSI) / NDMA.
Examine this citizen-uploaded disaster report photo.

RULES:
1. If the photo depicts a selfie, human portrait, vehicle interior, screenshot, document, animal, or indoor room:
Return ONLY this JSON:
{
  "isValidTerrain": false,
  "statusBadge": "IRRELEVANT MEDIA DETECTED",
  "assessmentText": "AI VISION AUDIT: The uploaded imagery contains non-geotechnical subject matter (human subject / indoor vehicle scene) rather than outdoor terrain. Unable to verify slope displacement or soil erosion. Recommended Action: Reject submission or request genuine field slope capture."
}

2. If the photo genuinely shows outdoor mountain slopes, cracks, mud, boulders, or landslide hazards:
Return ONLY this JSON:
{
  "isValidTerrain": true,
  "statusBadge": "FIELD FAILURE VERIFIED",
  "assessmentText": "AI VISION AUDIT: Authentic terrain failure confirmed. Visible mass movement, debris displacement, and unstable slope conditions detected. Threat Level: CRITICAL. Recommended Action: Clear drainage and initiate slope revetment."
}

Output strictly valid JSON with no backticks, Markdown formatting, or commentary.`
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: cleanBase64
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const cleanJson = rawText.replace(/```json|```/g, '').trim();

    let parsed: any = null;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {}
      }
    }

    if (parsed) {
      return {
        isValidTerrain: Boolean(parsed.isValidTerrain),
        statusBadge: (parsed.statusBadge === 'FIELD FAILURE VERIFIED' || parsed.isValidTerrain)
          ? 'FIELD FAILURE VERIFIED'
          : 'IRRELEVANT MEDIA DETECTED',
        assessmentText: parsed.assessmentText || rawText
      };
    }

    return JSON.parse(cleanJson);
  } catch (err: any) {
    console.error('Vision inspection error:', err);
    return {
      isValidTerrain: false,
      statusBadge: 'IRRELEVANT MEDIA DETECTED',
      assessmentText: 'AI Vision inspection encountered an error communicating with the model gateway.'
    };
  }
}
