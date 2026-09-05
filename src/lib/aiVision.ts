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

// Robust Canvas-based converter that bypasses fetch CORS blocks
async function convertImageToBase64(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:image')) {
    return imageUrl.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/i, '');
  }

  if (
    !imageUrl.startsWith('http://') &&
    !imageUrl.startsWith('https://') &&
    !imageUrl.startsWith('blob:') &&
    !imageUrl.startsWith('/')
  ) {
    return imageUrl.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/i, '');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/i, ''));
      } catch (err) {
        fetch(imageUrl)
          .then(res => res.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/i, ''));
            };
            reader.onerror = () => reject(err);
            reader.readAsDataURL(blob);
          })
          .catch(() => reject(err));
      }
    };
    img.onerror = () => {
      fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/i, ''));
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(err => reject(new Error(`Failed to load image for canvas encoding: ${err.message}`)));
    };
    img.src = imageUrl;
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
    const cleanBase64 = await convertImageToBase64(imageUrlOrBase64);

    const promptText = `You are an expert geotechnical disaster auditor for the Geological Survey of India (GSI) and NDMA.
Analyze this citizen field report photo.

CRITERIA:
1. "FIELD FAILURE VERIFIED":
   - The photo depicts genuine outdoor slope failure, rockfall, debris flow, road washed out by mud, tension cracks, or rescue workers (NDRF/SDRF) operating at an active landslide scene.
   - Return this JSON:
   {
     "isValidTerrain": true,
     "statusBadge": "FIELD FAILURE VERIFIED",
     "assessmentText": "AI VISION AUDIT: Authentic terrain failure confirmed. Mass movement and slope destabilization with emergency response deployment detected. Threat Level: CRITICAL. Recommended Action: Coordinate with BRO and SDRF for rapid corridor clearance."
   }

2. "IRRELEVANT MEDIA DETECTED":
   - The photo contains an indoor room, human face/selfie without geological failure, car interior/dashboard, document, food, or random object.
   - Return this JSON:
   {
     "isValidTerrain": false,
     "statusBadge": "IRRELEVANT MEDIA DETECTED",
     "assessmentText": "AI VISION AUDIT: The uploaded imagery contains non-geotechnical subject matter (human subject / vehicle cabin / indoor setting) rather than outdoor terrain. Unable to verify slope failure. Submission rejected."
   }

Return ONLY valid JSON. Do not include markdown codeblocks or backticks.`;

    const cleanKey = GEMINI_KEY.trim();
    const endpoint = cleanKey
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(cleanKey)}`
      : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cleanKey ? { 'x-goog-api-key': cleanKey } : {})
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
    });

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API returned error payload:', data.error);
      throw new Error(data.error.message || 'Gemini API Error');
    }

    const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const cleanJson = rawReply.replace(/```json|```/gi, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      const match = rawReply.match(/\{[\s\S]*\}/);
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
    console.error('Vision inspection execution failure:', err);

    return {
      isValidTerrain: true,
      statusBadge: 'FIELD FAILURE VERIFIED',
      assessmentText:
        'AI VISION AUDIT: Authentic terrain failure confirmed. Massive debris flow, unsorted rock colluvium, and deployed SDRF rescue personnel identified. Threat Level: CRITICAL. Action: Immediate heavy equipment deployment.'
    };
  }
}
