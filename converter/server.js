/**
 * 99ML Converter Server
 * Converts modern webpages to TI-99/4A 99ML markup
 */

import express from 'express';
import cors from 'cors';
import localtunnel from 'localtunnel';
import { convertUrlTo99ML, convertHtmlTo99ML } from './dom-to-99ml.js';

const app = express();
const PORT = process.env.PORT || 7198;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

// Store tunnel info globally
let tunnelPassword = 'Loading...';
let tunnelUrl = 'Loading...';
let localIp = 'Unknown';

// Get Local IP
import os from 'os';
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if ('IPv4' !== iface.family || iface.internal) {
                continue;
            }
            return iface.address;
        }
    }
    return 'localhost';
}
localIp = getLocalIp();

// Root route - Serve HTML Dashboard
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>99ML Converter Server</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; background: #f0f2f5; color: #1a1a1a; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 2rem; }
            h1 { color: #2563eb; margin-top: 0; }
            h2 { font-size: 1.25rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
            .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 500; font-size: 0.875rem; background: #dcfce7; color: #166534; }
            .info-grid { display: grid; grid-template-columns: auto 1fr; gap: 1rem; margin-top: 1rem; align-items: center; }
            .label { font-weight: 600; color: #4b5563; }
            .value { font-family: monospace; background: #f3f4f6; padding: 0.5rem; border-radius: 6px; word-break: break-all; }
            .password-group { display: flex; gap: 0.5rem; }
            button { background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background 0.2s; white-space: nowrap; }
            button:hover { background: #1d4ed8; }
            button:active { transform: translateY(1px); }
            .secondary { background: #4b5563; }
            .secondary:hover { background: #374151; }
            code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; }
            .alert { margin-top: 1.5rem; padding: 1rem; background: #eff6ff; border-radius: 8px; border-left: 4px solid #2563eb; }
            .warning { margin-top: 1rem; padding: 1rem; background: #fff7ed; border-radius: 8px; border-left: 4px solid #f97316; }
        </style>
    </head>
    <body>
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h1>99ML Converter Server</h1>
                <span class="status-badge">● Running</span>
            </div>
            
            <h2>Connection Options</h2>
            
            <div class="info-grid">
                <!-- Option 1: Local Network -->
                <div class="label" style="grid-column: 1/-1; border-bottom: 1px dashed #e5e7eb; padding-bottom: 0.5rem; margin-top: 0.5rem; color: #166534;">Option 1: Same WiFi/Network (Best)</div>
                <div class="label">Local URL:</div>
                <div class="password-group">
                    <div class="value" id="localUrl">http://${localIp}:${PORT}</div>
                    <button class="secondary" onclick="copyId('localUrl')">Copy</button>
                </div>

                <!-- Option 2: Public Tunnel -->
                <div class="label" style="grid-column: 1/-1; border-bottom: 1px dashed #e5e7eb; padding-bottom: 0.5rem; margin-top: 1.5rem; color: #c2410c;">Option 2: Different Networks (Tunnel)</div>
                <div class="label">Public URL:</div>
                <div class="value"><a href="${tunnelUrl}" target="_blank">${tunnelUrl}</a></div>
                
                <div class="label">Password:</div>
                <div class="password-group">
                    <div class="value" id="pwd">${tunnelPassword}</div>
                    <button onclick="copyId('pwd')">Copy</button>
                    <button onclick="window.open('${tunnelUrl}', '_blank')">Open Tunnel</button>
                </div>
            </div>

            <div class="warning">
                <strong>Tunnel Troubleshooting:</strong> If the Public URL gives a 503/408 error, try refreshing the server or use the Local URL option if possible.
            </div>
        </div>

        <div class="card">
            <h2>Endpoints</h2>
            <ul>
                <li><code>GET /convert?url=...</code> - Convert URL to 99ML</li>
                <li><code>POST /convert</code> - Convert HTML body</li>
                <li><code>GET /health</code> - Server health check</li>
            </ul>
        </div>

        <script>
            function copyId(id) {
                const text = document.getElementById(id).innerText;
                navigator.clipboard.writeText(text).then(() => {
                    const btn = document.activeElement;
                    const orig = btn.innerText;
                    btn.innerText = 'Copied!';
                    setTimeout(() => btn.innerText = orig, 2000);
                });
            }
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /convert?url=<URL>
 * Fetch and convert a webpage to 99ML
 */
app.get('/convert', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({
            error: 'Missing url parameter',
            usage: '/convert?url=https://example.com'
        });
    }

    try {
        console.log(`Converting URL: ${url}`);
        const result = await convertUrlTo99ML(url);

        res.json({
            success: true,
            sourceUrl: url,
            content: result.content,
            metadata: result.metadata
        });

    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({
            error: error.message,
            sourceUrl: url
        });
    }
});

/**
 * POST /convert
 * Convert posted HTML content to 99ML
 */
app.post('/convert', async (req, res) => {
    const html = req.body;

    if (!html) {
        return res.status(400).json({
            error: 'Missing HTML content in request body'
        });
    }

    try {
        console.log('Converting posted HTML...');
        const result = await convertHtmlTo99ML(html);

        res.json({
            success: true,
            content: result.content,
            metadata: result.metadata
        });

    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Start server
const server = app.listen(PORT, async () => {
    console.log(`
╔════════════════════════════════════════╗
║     99ML Converter Server Running      ║
║                                        ║
║  Local: http://localhost:${PORT}        ║
╚════════════════════════════════════════╝
  `);

    try {
        console.log('Starting public tunnel...');
        const tunnel = await localtunnel({ port: PORT });
        tunnelUrl = tunnel.url;

        // Fetch tunnel password (public IP)
        try {
            const response = await fetch('https://loca.lt/mytunnelpassword');
            tunnelPassword = await response.text();
            tunnelPassword = tunnelPassword.trim();
        } catch (e) {
            console.error('Could not fetch tunnel password:', e);
            tunnelPassword = 'Error fetching password';
        }

        console.log(`
╔════════════════════════════════════════╗
║  🌍 PUBLIC TUNNEL URL AVAILABLE        ║
║                                        ║
║  URL:      ${tunnelUrl}    ║
║  PASSWORD: ${tunnelPassword}               ║
║                                        ║
║  1. Open URL in browser                ║
║  2. Enter PASSWORD to authorize        ║
║  3. Then use URL in Simulator          ║
╚════════════════════════════════════════╝
    `);

        tunnel.on('close', () => {
            console.log('Public tunnel closed');
        });
    } catch (err) {
        console.error('Failed to start tunnel:', err);
    }
});
