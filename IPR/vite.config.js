import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  server: { host: true },
  plugins: [
    react(),
    {
      name: 'medx-sync-registry-plugin',
      configureServer(server) {
        // 1. Endpoint to SYNC (POST)
        server.middlewares.use('/api/sync-registry', (req, res) => {
          // Add CORS Headers for all requests to this endpoint
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const dbPath = path.resolve(process.cwd(), 'medx_shared_db.json');
                fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

                console.log(`\n[MEDX SERVER] Registry SYNC Successful!`);
                console.log(`- Hospitals: ${data.hospitals?.length || 0}`);
                console.log(`- Patients: ${data.patients?.length || 0}`);
                console.log(`- Overviews: ${Object.keys(data.patientOverviews || {}).length}`);
                console.log(`- Last Updated: ${new Date().toLocaleTimeString()}\n`);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          }
        });

        // 2. Endpoint to FETCH (GET) with CORS
        server.middlewares.use('/api/get-registry', (req, res) => {
          if (req.method === 'GET') {
            try {
              const dbPath = path.resolve(process.cwd(), 'medx_shared_db.json');
              const data = fs.readFileSync(dbPath, 'utf8');

              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          }
        });

        // Current QR Save Logic (maintained)
        server.middlewares.use('/api/save-patient-data', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const { id, qrDataUrl } = JSON.parse(body);
                const baseDir = path.resolve(process.cwd(), 'qr_code');
                
                if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

                // Save QR Code (PNG)
                const qrBase64 = qrDataUrl.split(';base64,').pop();
                fs.writeFileSync(path.join(baseDir, `${id}.png`), qrBase64, 'base64');

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          }
        });
      }
    }
  ],
})
