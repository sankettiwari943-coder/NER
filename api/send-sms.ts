export default async function handler(req: any, res: any) {
  // Allow CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {}
  }

  const { phone, message, token } = req.method === 'POST' ? (body || {}) : (req.query || {});

  const targetPhone = (phone || '7881132006').toString().replace(/\D/g, '').slice(-10);
  const authKey = process.env.VITE_FAST2SMS_API_KEY || 'hUOlRGmQd0zDLvKMCFqNnJ36eiAgoT2wbV4BWZypt9X8kfsa17d7veIRuziGFhwDbcTNWpYynEPktxLj';

  // Fast2SMS OTP route (guaranteed delivery across Indian carriers)
  const otpValue = token || Math.floor(100000 + Math.random() * 900000).toString();
  const fast2smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${authKey}&route=otp&variables_values=${otpValue}&numbers=${targetPhone}`;

  try {
    const response = await fetch(fast2smsUrl, {
      method: 'GET',
      headers: {
        'cache-control': 'no-cache'
      }
    });

    const data = await response.json();
    return res.status(200).json({
      success: true,
      data,
      phone: targetPhone,
      otp: otpValue
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
