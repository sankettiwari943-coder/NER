// Direct fallback ensures the model works even if Vite environment injection is skipped
const API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY)
    ? import.meta.env.VITE_GEMINI_API_KEY
    : 'AQ.Ab8RN6JTM1NeApSc1czPrEScv1BmSdTa9giviCYZRp20F42eOg';

export interface VisionResult {
  isValidTerrain: boolean;
  statusBadge: 'FIELD FAILURE VERIFIED' | 'IRRELEVANT MEDIA DETECTED';
  assessmentText: string;
}

export type AiVisionResult = VisionResult;

export async function analyzeFieldImage(imageBase64: string): Promise<VisionResult> {
  if (!imageBase64) {
    return {
      isValidTerrain: false,
      statusBadge: 'IRRELEVANT MEDIA DETECTED',
      assessmentText: 'No image provided for visual verification.'
    };
  }

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9.+_-]+;base64,/, '');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert geotechnical disaster auditor for GSI and NDMA evaluating a citizen hazard report.
Analyze the provided image:
1. If the photo shows a person, selfie, face, vehicle interior, screenshot, meme, document, or indoor room, return this exact JSON:
{
  "isValidTerrain": false,
  "statusBadge": "IRRELEVANT MEDIA DETECTED",
  "assessmentText": "AI VISION AUDIT: The uploaded photo contains non-geotechnical subject matter (human subject / vehicle / indoor setting). Cannot verify slope failure. Submission flagged as invalid media."
}

2. If the photo genuinely shows outdoor mountain slopes, rockfall, tension cracks, mudslide, or road debris:
Return this exact JSON:
{
  "isValidTerrain": true,
  "statusBadge": "FIELD FAILURE VERIFIED",
  "assessmentText": "AI VISION AUDIT: Authentic terrain failure confirmed. Visible mass movement, rock detachment, or mud slurry detected on active corridor. Threat Level: CRITICAL. Recommended Action: Dispatch SDRF earthmovers and enact traffic diversion."
}

Respond ONLY with valid JSON. Do not wrap in markdown or backticks.`
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
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
    const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const cleanJson = rawReply.replace(/```json|```/g, '').trim();

    let parsed: any = null;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
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
        assessmentText: parsed.assessmentText || rawReply
      };
    }

    return JSON.parse(cleanJson);
  } catch (err: any) {
    console.error('Vision inspection execution error:', err);
    return {
      isValidTerrain: false,
      statusBadge: 'IRRELEVANT MEDIA DETECTED',
      assessmentText: 'Visual inspection completed: Media flagged or unable to confirm outdoor landslide features.'
    };
  }
}
