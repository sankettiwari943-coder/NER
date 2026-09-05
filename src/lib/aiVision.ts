const GEMINI_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) ||
  '';

export interface VisionResult {
  isValidTerrain: boolean;
  statusBadge: 'FIELD FAILURE VERIFIED' | 'IRRELEVANT MEDIA DETECTED';
  assessmentText: string;
}

export type AiVisionResult = VisionResult;

// Convert any image URL, Blob, or path into a base64 string
async function urlToBase64(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:image')) {
    return imageUrl.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/i, '');
  }

  // If it is not a remote URL, blob URL, or relative path, assume raw base64
  if (
    !imageUrl.startsWith('http://') &&
    !imageUrl.startsWith('https://') &&
    !imageUrl.startsWith('blob:') &&
    !imageUrl.startsWith('/')
  ) {
    return imageUrl.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/i, '');
  }

  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/i, ''));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function analyzeFieldImage(imageUrlOrBase64: string): Promise<VisionResult> {
  if (!imageUrlOrBase64) {
    return {
      isValidTerrain: false,
      statusBadge: 'IRRELEVANT MEDIA DETECTED',
      assessmentText: 'No image evidence provided.'
    };
  }

  try {
    const cleanBase64 = await urlToBase64(imageUrlOrBase64);

    const promptText = `You are an expert geotechnical disaster auditor for the Geological Survey of India (GSI) and NDMA.
Analyze this citizen-submitted field report photo.

STRICT CLASSIFICATION RULES:
1. "IRRELEVANT MEDIA DETECTED":
   - The photo contains a human face, portrait, selfie, indoor setting, vehicle cabin, furniture, screenshot, document, or non-disaster scene.
   - Return this exact JSON:
   {
     "isValidTerrain": false,
     "statusBadge": "IRRELEVANT MEDIA DETECTED",
     "assessmentText": "AI VISION AUDIT: Non-geotechnical media detected (human subject / indoor / personal photo). No terrain displacement or rockfall identified. Submission rejected."
   }

2. "FIELD FAILURE VERIFIED":
   - The photo shows genuine outdoor geological failure: rockslide, slope scarp, mudflow, road debris washout, or emergency crews working on landslide debris.
   - Return this exact JSON:
   {
     "isValidTerrain": true,
     "statusBadge": "FIELD FAILURE VERIFIED",
     "assessmentText": "AI VISION AUDIT: Authentic terrain failure confirmed. Visible mass movement and slope destabilization detected. Threat Level: CRITICAL. Recommended Action: Coordinate immediate corridor clearance."
   }

Output ONLY valid JSON. Do not include markdown ticks, notes, or backticks.`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_KEY.trim()
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
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
      throw new Error(data.error.message);
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const cleanJson = rawText.replace(/```json|```/gi, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Failed to parse JSON response from Gemini');
      }
    }

    return {
      isValidTerrain: Boolean(parsed.isValidTerrain),
      statusBadge:
        parsed.statusBadge === 'FIELD FAILURE VERIFIED'
          ? 'FIELD FAILURE VERIFIED'
          : 'IRRELEVANT MEDIA DETECTED',
      assessmentText:
        parsed.assessmentText ||
        'AI VISION AUDIT: Processed field imagery.'
    };
  } catch (err: any) {
    console.error('Vision inspection execution error:', err);
    // Safe fallback defaults to rejecting suspicious or unverified media
    return {
      isValidTerrain: false,
      statusBadge: 'IRRELEVANT MEDIA DETECTED',
      assessmentText:
        'AI VISION AUDIT: Unable to verify geological failure. Submission flagged for manual inspector review.'
    };
  }
}
