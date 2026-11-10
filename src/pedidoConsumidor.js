/**
 * pedidoConsumidor.js
 * "Botón de arrepentimiento" y "Botón de baja de servicio" (Disp. SSDCyLC 954/2025).
 * Entrada de /arrepentimiento/ y /baja/ (partials/pedido-consumidor.html).
 *
 * POST {VITE_API_URL}/public/pedidos-consumidor
 *   body: { tipo: 'arrepentimiento' | 'baja', email, nombre, negocio?, motivo?, turnstileToken? }
 *   201 → { codigo, tipo, recibidoEl (ISO-8601) }
 *   400 validación (el back rechaza campos de más) · 429 RATE_LIMITED / LIM-429 · Turnstile inválido (400)
 * Errores del back: { code, message, details? }, igual que /public/signup.
 *
 * No manda nada fuera del contrato: ni utm, ni vertical, ni versionTerminos. Los opcionales
 * vacíos se omiten. Turnstile usa la action "pedido-consumidor".
 */

import './style.css';
import { API_URL, TURNSTILE_SITE_KEY, EMAIL_RE, initTurnstile, recortar } from './registro.js';

const TIMEOUT_MS = 20000;
/** Si el script de Turnstile no cargó en este tiempo, se avisa con opción de reintentar. */
const TIMEOUT_TURNSTILE_MS = 10000;
const TIPOS = ['arrepentimiento', 'baja'];
const MAIL = 'contacto@getcoreup.com';

/** Mismos topes que los del back (y que los que tenía el maxlength del HTML). */
const MAX = { nombre: 120, email: 254, negocio: 120, motivo: 1000 };

const MSJ = {
    nombre: 'Ingresá tu nombre.',
    nombreLargo: `El nombre puede tener hasta ${MAX.nombre} caracteres.`,
    emailVacio: 'Ingresá tu email.',
    emailInvalido: 'Revisá el email: parece que le falta algo.',
    emailLargo: `El email puede tener hasta ${MAX.email} caracteres. Revisalo.`,
    negocioLargo: `El nombre del negocio puede tener hasta ${MAX.negocio} caracteres.`,
    motivoLargo: `El motivo puede tener hasta ${MAX.motivo} caracteres. Acortalo un poco.`,
    turnstileCargando: 'Todavía estamos verificando que no seas un robot. Probá de nuevo en unos segundos.',
    turnstileError: 'No pudimos cargar la verificación anti-robots. Puede ser un bloqueador de anuncios o la red en la que estás.',
    reintentar: 'Reintentar la verificación',
    red: 'No pudimos conectarnos con CoreUp. Revisá tu conexión e intentá de nuevo.',
    timeout: 'CoreUp está tardando en responder y no sabemos si tu pedido quedó registrado. Antes de reintentar, revisá tu mail: si te llegó un código, el pedido ya está hecho y no hace falta repetirlo. Si en unos minutos no te llegó nada, probá de nuevo o escribinos a ' + MAIL + '.',
    sinCodigo: 'Recibimos una respuesta incompleta y puede que tu pedido haya quedado registrado. Revisá tu mail: si te llega un código, no lo repitas. Si en unos minutos no te llegó nada, probá de nuevo o escribinos a ' + MAIL + '.',
    servidor: 'Algo salió mal de nuestro lado. Probá de nuevo en unos minutos.',
    validacion: 'Revisá los datos e intentá de nuevo.',
    limite: 'Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo.',
    respaldo: `Si sigue sin funcionar, escribinos a ${MAIL} y lo registramos igual.`,
    copiado: 'Código copiado.',
    copiarError: 'No pudimos copiarlo: seleccionalo y copialo a mano.',
};

document.addEventListener('DOMContentLoaded', initPedidoConsumidor);

function initPedidoConsumidor() {
    const form = document.getElementById('pedido-form');
    if (!form) return;

    const tipo = form.dataset.tipo;
    if (!TIPOS.includes(tipo)) {
        console.error(`[pedido] tipo inválido en la página: "${tipo}"`);
        return;
    }

    const alerta = document.getElementById('pedido-alerta');
    const btn = document.getElementById('pedido-submit');
    const btnText = document.getElementById('pedido-btn-text');
    const btnLoading = document.getElementById('pedido-btn-loading');
    const okPanel = document.getElementById('pedido-ok');

    if (!API_URL) console.warn('[pedido] Falta VITE_API_URL: el formulario no puede enviar.');

    const turnstile = initTurnstile(
        () => mostrarAlerta(`${MSJ.turnstileError} ${MSJ.respaldo}`, { reintentarTurnstile: true, sinFoco: true }),
        { contenedorId: 'pedido-turnstile', action: 'pedido-consumidor', timeoutCargaMs: TIMEOUT_TURNSTILE_MS },
    );

    btn.disabled = false;
    btn.removeAttribute('aria-disabled');

    form.addEventListener('input', (e) => {
        const name = e.target && e.target.name;
        if (name) limpiarError(name);
    });

    let enviando = false;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (enviando) return;
        limpiarTodo();

        const datos = leerDatos();
        const errores = validar(datos);
        const campos = Object.keys(errores);
        if (campos.length) {
            campos.forEach((c) => mostrarError(c, errores[c]));
            enfocarCampo(campos[0]);
            return;
        }

        if (TURNSTILE_SITE_KEY && !turnstile.token()) {
            if (turnstile.fallo()) {
                mostrarAlerta(`${MSJ.turnstileError} ${MSJ.respaldo}`, { reintentarTurnstile: true });
            } else {
                mostrarAlerta(`${MSJ.turnstileCargando} ${MSJ.respaldo}`);
            }
            return;
        }

        const body = armarBody(tipo, datos, turnstile.token());

        enviando = true;
        setLoading(true);

        let res;
        let json = null;
        const ctrl = new AbortController();
        try {
            if (!API_URL) throw new Error('Sin VITE_API_URL');
            const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
            try {
                res = await fetch(`${API_URL}/public/pedidos-consumidor`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(body),
                    signal: ctrl.signal,
                });
                let texto = '';
                try { texto = await res.text(); } catch (err) { if (ctrl.signal.aborted) throw err; }
                try { json = texto ? JSON.parse(texto) : null; } catch { json = null; }
            } finally {
                clearTimeout(timer);
            }
        } catch {
            // Timeout: el pedido pudo haber llegado. Se avisa para que no lo dupliquen.
            if (ctrl.signal.aborted) terminarConError(MSJ.timeout, { sinRespaldo: true });
            else terminarConError(MSJ.red);
            return;
        }

        if (res.ok) {
            const codigo = json && typeof json.codigo === 'string' ? json.codigo.trim() : '';
            if (!codigo) {
                // 2xx sin código: el pedido pudo haber quedado registrado.
                terminarConError(MSJ.sinCodigo, { sinRespaldo: true });
                return;
            }
            exito(codigo, json.recibidoEl);
            return;
        }

        const code = (json && json.code) || '';

        if (code === 'LIM-429' || code === 'RATE_LIMITED' || res.status === 429) {
            // Siempre el texto propio: el del rate limiter puede venir en inglés ("Too Many Requests").
            terminarConError(MSJ.limite);
            return;
        }
        const mensaje = mensajeServidor(json && json.message);
        if (code === 'VAL-400' || res.status === 400) {
            // Incluye el Turnstile inválido, que el back devuelve como 400 con su propio mensaje.
            const detalleEmail = detalleDeCampo(json && json.details, 'email');
            if (detalleEmail !== null) mostrarError('email', detalleEmail || MSJ.emailInvalido);
            terminarConError(mensaje || MSJ.validacion);
            return;
        }
        terminarConError(MSJ.servidor);
    });

    // ——— Envío ———

    function leerDatos() {
        return {
            nombre: form.nombre.value.trim().replace(/\s+/g, ' '),
            email: form.email.value.trim(),
            negocio: form.negocio.value.trim().replace(/\s+/g, ' '),
            motivo: form.motivo.value.trim(),
        };
    }

    function exito(codigo, recibidoEl) {
        form.classList.add('hidden');
        document.getElementById('pedido-codigo').textContent = codigo;
        const fecha = formatearFecha(recibidoEl);
        document.getElementById('pedido-fecha').textContent = fecha ? `Recibido el ${fecha} (hora de Argentina).` : '';
        okPanel.classList.remove('hidden');
        initCopiar(codigo);
        const titulo = document.getElementById('pedido-ok-titulo');
        titulo?.focus({ preventScroll: true });
        okPanel.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    function terminarConError(mensaje, { sinRespaldo = false } = {}) {
        enviando = false;
        setLoading(false);
        // El token de Turnstile es de un solo uso: después de cada intento hace falta otro.
        turnstile.reset();
        mostrarAlerta(sinRespaldo ? mensaje : `${mensaje} ${MSJ.respaldo}`);
    }

    function mostrarAlerta(mensaje, opciones = {}) {
        alerta.textContent = '';
        const texto = document.createElement('span');
        texto.textContent = mensaje + ' ';
        alerta.appendChild(texto);
        if (opciones.reintentarTurnstile) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'footer-legal-link cursor-pointer font-semibold underline';
            b.textContent = MSJ.reintentar;
            b.addEventListener('click', () => {
                alerta.textContent = '';
                alerta.classList.add('hidden');
                // Si el script nunca cargó, lo vuelve a inyectar (reset() solo no alcanza).
                turnstile.reintentar();
                document.getElementById('pedido-turnstile')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            });
            alerta.appendChild(b);
        }
        alerta.classList.remove('hidden');
        if (opciones.sinFoco) return;
        alerta.focus({ preventScroll: true });
        alerta.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    function setLoading(loading) {
        btn.disabled = loading;
        btn.setAttribute('aria-busy', loading ? 'true' : 'false');
        btnText.classList.toggle('hidden', loading);
        btnLoading.classList.toggle('hidden', !loading);
        btnLoading.classList.toggle('flex', loading);
        btnLoading.setAttribute('aria-hidden', loading ? 'false' : 'true');
    }

    // ——— Errores por campo ———

    function mostrarError(nombre, mensaje) {
        const el = form.querySelector(`[data-pedido-error="${nombre}"]`);
        if (el) {
            el.textContent = mensaje;
            el.classList.remove('hidden');
        }
        const input = form.querySelector(`[name="${nombre}"]`);
        if (input) {
            input.setAttribute('aria-invalid', 'true');
            input.classList.add('reg-invalido');
        }
    }

    function limpiarError(nombre) {
        const el = form.querySelector(`[data-pedido-error="${nombre}"]`);
        if (el) {
            el.textContent = '';
            el.classList.add('hidden');
        }
        const input = form.querySelector(`[name="${nombre}"]`);
        if (input) {
            input.removeAttribute('aria-invalid');
            input.classList.remove('reg-invalido');
        }
    }

    function limpiarTodo() {
        Object.keys(MAX).forEach(limpiarError);
        alerta.textContent = '';
        alerta.classList.add('hidden');
    }

    function enfocarCampo(nombre) {
        const input = form.querySelector(`[name="${nombre}"]`);
        if (input) {
            input.focus({ preventScroll: true });
            input.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }
}

/** Solo los campos del contrato; los opcionales vacíos no viajan (un "" no pasa la validación del back). */
export function armarBody(tipo, d, token) {
    const body = { tipo, email: d.email, nombre: d.nombre };
    if (d.negocio) body.negocio = d.negocio;
    if (d.motivo) body.motivo = d.motivo;
    if (token) body.turnstileToken = token;
    return body;
}

/**
 * Los inputs no tienen maxlength: el navegador cortaría en silencio lo que se pega
 * (un email cortado es un email equivocado). Los largos se validan acá, con mensaje.
 */
function validar(d) {
    const e = {};
    if (!d.nombre) e.nombre = MSJ.nombre;
    else if (d.nombre.length > MAX.nombre) e.nombre = MSJ.nombreLargo;
    if (!d.email) e.email = MSJ.emailVacio;
    else if (d.email.length > MAX.email) e.email = MSJ.emailLargo;
    else if (!EMAIL_RE.test(d.email)) e.email = MSJ.emailInvalido;
    if (d.negocio.length > MAX.negocio) e.negocio = MSJ.negocioLargo;
    if (d.motivo.length > MAX.motivo) e.motivo = MSJ.motivoLargo;
    return e;
}

/**
 * El `message` del back solo se muestra si parece castellano y no es un default de Nest
 * ("Bad Request", "Too Many Requests", "property x should not exist", ...). Si no, ''.
 */
const MENSAJE_GENERICO_RE = /^(bad request|too many requests|internal server error|forbidden|not found|unauthorized|unprocessable entity|service unavailable|throttlerexception)\b/i;
const MENSAJE_INGLES_RE = /\b(must|should|property|is not|are not|exist|request|error|invalid|failed|the)\b/i;
const MENSAJE_CASTELLANO_RE = /[áéíóúñ¿¡]|\b(el|la|los|las|de|que|no|tu|un|una|por|para|con|probá|revisá|intentá)\b/i;

function mensajeServidor(valor) {
    const m = recortar(valor);
    if (!m) return '';
    if (MENSAJE_GENERICO_RE.test(m) || MENSAJE_INGLES_RE.test(m)) return '';
    return MENSAJE_CASTELLANO_RE.test(m) ? m : '';
}

/** "10/11/2026 a las 14:03" en hora de Argentina; '' si no es una fecha válida. */
function formatearFecha(iso) {
    if (typeof iso !== 'string' || !iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const tz = 'America/Argentina/Buenos_Aires';
    try {
        const fecha = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: tz }).format(d);
        const hora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(d);
        return `${fecha} a las ${hora}`;
    } catch {
        return d.toLocaleString('es-AR');
    }
}

function initCopiar(codigo) {
    const btn = document.getElementById('pedido-copiar');
    const aviso = document.getElementById('pedido-copiado');
    if (!btn) return;
    btn.onclick = async () => {
        let ok = false;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(codigo);
                ok = true;
            }
        } catch {
            ok = false;
        }
        if (!ok) {
            // Respaldo: seleccionar el texto para que lo copien a mano (o con el menú del celular).
            const el = document.getElementById('pedido-codigo');
            const rango = document.createRange();
            rango.selectNodeContents(el);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(rango);
            try { ok = document.execCommand('copy'); } catch { ok = false; }
        }
        aviso.textContent = ok ? MSJ.copiado : MSJ.copiarError;
        aviso.classList.remove('hidden');
    };
}

/** Igual que en registro.js: busca en `details` del 400 algo sobre `campo`. */
function detalleDeCampo(details, campo) {
    if (!Array.isArray(details)) return null;
    const d = details.find((x) => typeof x === 'string' && x.toLowerCase().includes(campo));
    if (!d) return null;
    if (/\b(must|should|property|is not|are not)\b/.test(d)) return '';
    return recortar(d.replace(new RegExp(`^\\s*${campo}\\s*[:\\-–]\\s*`, 'i'), ''));
}
