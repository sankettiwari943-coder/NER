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
      assessmentText: 'No image evidence provided.'
    };
  }

  const apiKey =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY)
      ? import.meta.env.VITE_GEMINI_API_KEY
      : (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_GEMINI_API_KEY)
      ? (window as any).__ENV__.VITE_GEMINI_API_KEY
      : (typeof process !== 'undefined' && (process.env?.VITE_GEMINI_API_KEY || process.env?.GEMINI_API_KEY))
      ? (process.env?.VITE_GEMINI_API_KEY || process.env?.GEMINI_API_KEY)
      : '';

  if (!apiKey || apiKey.trim() === '') {
    return {
      isValidTerrain: false,
      statusBadge: 'IRRELEVANT MEDIA DETECTED',
      assessmentText: 'API Key Missing: VITE_GEMINI_API_KEY is required for vision audits. Please configure in .env.'
    };
  }

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9.+_-]+;base64,/, '');

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey.trim()
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert geotechnical computer vision auditor for the Geological Survey of India (GSI) and NDMA.
Analyze this citizen-submitted field hazard photo.

EVALUATION RULES:
1. "IRRELEVANT MEDIA DETECTED":
   - Human portraits, selfies, close-ups of faces, vehicle interiors, dashboards, pets, food, memes, indoor rooms, screenshots, or documents.
   - Return this exact JSON:
   {
     "isValidTerrain": false,
     "statusBadge": "IRRELEVANT MEDIA DETECTED",
     "assessmentText": "AI VISION AUDIT: The uploaded image contains non-geotechnical subject matter (human subject / vehicle interior / indoor scene). Zero geological slope failure detected. Submission flagged as invalid."
   }

2. "FIELD FAILURE VERIFIED":
   - Outdoor mountain slopes, rockfalls, mudslides, debris flow runouts, soil liquefaction, slope scarps, or rescue operations at an outdoor landslide site.
   - Return this exact JSON:
   {
     "isValidTerrain": true,
     "statusBadge": "FIELD FAILURE VERIFIED",
     "assessmentText": "AI VISION AUDIT: Authentic terrain failure confirmed. Visible mass movement, rock detachment, or mudflow across corridor. Threat Level: CRITICAL. Recommended Action: Coordinate immediate SDRF clearance and road diversion."
   }

Return ONLY clean, raw JSON. Do not wrap in markdown or backticks.`
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

    if (data.error) {
      console.error('Gemini API Error:', data.error);
      return {
        isValidTerrain: false,
        statusBadge: 'IRRELEVANT MEDIA DETECTED',
        assessmentText: `Gemini API Error: ${data.error.message}`
      };
    }

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

    if (parsed && typeof parsed === 'object') {
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
    console.error('Vision inspection pipeline error:', err);
    return {
      isValidTerrain: false,
      statusBadge: 'IRRELEVANT MEDIA DETECTED',
      assessmentText: 'AI Vision analysis could not complete. Image flagged for manual inspector review.'
    };
  }
}
