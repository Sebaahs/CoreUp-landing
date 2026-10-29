/**
 * Mock local de POST /public/signup (autoservicio E2), para probar la landing
 * sin el backend. Solo para desarrollo: no entra en el build (dist/).
 *
 *   npm run mock            → http://localhost:3000 (MOCK_PORT para cambiarlo)
 *   VITE_API_URL=http://localhost:3000 npm run dev
 *
 * La respuesta depende del email:
 *   contiene "dup"    → 409 DUP-409
 *   contiene "val"    → 400 VAL-400 (con details)
 *   contiene "rate"   → 429 LIM-429 (mismo sobre que el rate limiter del back)
 *   contiene "caida"  → corta la conexión (la landing lo ve como red caída)
 *   contiene "lento"  → 201 después de 3 s (para ver el estado "Creando tu cuenta...")
 *   cualquier otro    → 201 { codigoIngreso, urlIngreso, venceEnSegundos }
 *
 * urlIngreso apunta a /ingreso-mock de este mismo server, que muestra el código
 * recibido (hace de Toolbox).
 */
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';

const PORT = Number(process.env.MOCK_PORT || 3000);
const ORIGENES = (process.env.MOCK_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173')
    .split(',')
    .map((s) => s.trim());

function cors(req, res) {
    const origin = req.headers.origin;
    if (origin && ORIGENES.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    }
}

function error(req, res, status, code, message, details) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        statusCode: status,
        code,
        message,
        ...(details ? { details } : {}),
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
        path: req.url.split('?')[0],
    }));
}

const server = createServer((req, res) => {
    cors(req, res);
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    if (req.method === 'GET' && url.pathname === '/ingreso-mock') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(`<!doctype html><meta charset="utf-8"><title>Toolbox (mock)</title>
<body style="font-family:system-ui;padding:2rem"><h1>Toolbox (mock)</h1>
<p>Llegó el código de ingreso: <code id="codigo">${String(url.searchParams.get('ingreso') || '').replace(/[^\w-]/g, '')}</code></p>
<p>Acá Toolbox haría <code>POST /public/ingreso</code> y entraría a Primeros pasos.</p></body>`);
    }

    if (req.method !== 'POST' || url.pathname !== '/public/signup') {
        return error(req, res, 404, 'NF-404', 'No encontrado.');
    }

    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
        let body;
        try { body = JSON.parse(raw || '{}'); } catch { return error(req, res, 400, 'VAL-400', 'JSON inválido.'); }

        const log = { ...body, password: body.password ? `(${String(body.password).length} caracteres)` : body.password };
        console.log(`[mock] POST /public/signup ${JSON.stringify(log)}`);

        const email = String(body.email || '').toLowerCase();

        if (email.includes('caida')) {
            req.socket.destroy();
            return;
        }
        if (email.includes('dup')) {
            return error(req, res, 409, 'DUP-409', 'Ese email ya tiene una cuenta. Iniciá sesión o recuperá tu contraseña.');
        }
        if (email.includes('val')) {
            return error(req, res, 400, 'VAL-400', 'No pudimos verificar que no seas un robot. Probá de nuevo.', ['turnstileToken inválido']);
        }
        if (email.includes('rate')) {
            return error(req, res, 429, 'LIM-429', 'Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo.');
        }

        // Chequeos mínimos del contrato (§2), para detectar un body mal armado.
        const faltan = ['nombre', 'email', 'password', 'negocio', 'queHaces', 'vertical', 'versionTerminos']
            .filter((k) => typeof body[k] !== 'string' || !body[k]);
        if (faltan.length || body.aceptaTerminos !== true || typeof body.turnstileToken !== 'string') {
            return error(req, res, 400, 'VAL-400', 'Algunos datos no son válidos. Revisalos e intentá de nuevo.', faltan);
        }

        const responder = () => {
            const codigo = randomBytes(32).toString('base64url');
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                codigoIngreso: codigo,
                urlIngreso: `http://localhost:${PORT}/ingreso-mock?ingreso=${codigo}`,
                venceEnSegundos: 120,
            }));
        };
        if (email.includes('lento')) setTimeout(responder, 3000);
        else responder();
    });
});

server.listen(PORT, () => {
    console.log(`[mock] /public/signup escuchando en http://localhost:${PORT} (CORS: ${ORIGENES.join(', ')})`);
});
