import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '.'), '');
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const geminiKey =
    env.VITE_GEMINI_API_KEY ||
    rootEnv.VITE_GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    '';

  return {
    envDir: path.resolve(__dirname, '.'),
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-sms-api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/send-sms', async (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.end();
              return;
            }

            let body: any = {};
            if (req.method === 'POST') {
              const buffers: any[] = [];
              for await (const chunk of req) {
                buffers.push(chunk);
              }
              const raw = Buffer.concat(buffers).toString();
              try {
                body = JSON.parse(raw);
              } catch {}
            }

            const urlObj = new URL(req.url || '', 'http://localhost');
            const queryPhone = urlObj.searchParams.get('phone');
            const queryToken = urlObj.searchParams.get('token');

            const targetPhone = (body.phone || queryPhone || '7881132006').toString().replace(/\D/g, '').slice(-10);
            const authKey = process.env.VITE_FAST2SMS_API_KEY || 'hUOlRGmQd0zDLvKMCFqNnJ36eiAgoT2wbV4BWZypt9X8kfsa17d7veIRuziGFhwDbcTNWpYynEPktxLj';
            const otpValue = body.token || queryToken || Math.floor(100000 + Math.random() * 900000).toString();
            const fast2smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${authKey}&route=otp&variables_values=${otpValue}&numbers=${targetPhone}`;

            try {
              const response = await fetch(fast2smsUrl, {
                method: 'GET',
                headers: { 'cache-control': 'no-cache' }
              });
              const data = await response.json();
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data,
                phone: targetPhone,
                otp: otpValue
              }));
            } catch (error: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                error: error.message
              }));
            }
          });
        }
      }
    ],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      exclude: ['maplibre-gl'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/data/**', '**/uploads/**', '**/.git/**']
      },
    },
  };
});
