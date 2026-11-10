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
const TIPOS = ['arrepentimiento', 'baja'];
const MAIL = 'contacto@getcoreup.com';

const MSJ = {
    nombre: 'Ingresá tu nombre.',
    emailVacio: 'Ingresá tu email.',
    emailInvalido: 'Revisá el email: parece que le falta algo.',
    turnstile: 'Esperá un segundo a que terminemos de verificar que no seas un robot.',
    turnstileError: 'No pudimos cargar la verificación anti-robots.',
    reintentar: 'Reintentar',
    red: 'No pudimos conectarnos con CoreUp. Revisá tu conexión e intentá de nuevo.',
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
        () => mostrarAlerta(MSJ.turnstileError, { reintentarTurnstile: true, sinFoco: true }),
        { contenedorId: 'pedido-turnstile', action: 'pedido-consumidor' },
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
            mostrarAlerta(MSJ.turnstile, { reintentarTurnstile: turnstile.fallo() });
            return;
        }

        const body = armarBody(tipo, datos, turnstile.token());

        enviando = true;
        setLoading(true);

        let res;
        let json = null;
        try {
            if (!API_URL) throw new Error('Sin VITE_API_URL');
            const ctrl = new AbortController();
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
            terminarConError(MSJ.red);
            return;
        }

        if (res.ok) {
            const codigo = json && typeof json.codigo === 'string' ? json.codigo.trim() : '';
            if (!codigo) {
                // 2xx sin código: no se puede mostrar nada confiable. Que reintente o escriba.
                terminarConError(MSJ.servidor);
                return;
            }
            exito(codigo, json.recibidoEl);
            return;
        }

        const code = (json && json.code) || '';
        const mensaje = recortar(json && json.message);

        if (code === 'LIM-429' || code === 'RATE_LIMITED' || res.status === 429) {
            terminarConError(mensaje || MSJ.limite);
            return;
        }
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

    function terminarConError(mensaje) {
        enviando = false;
        setLoading(false);
        // El token de Turnstile es de un solo uso: después de cada intento hace falta otro.
        turnstile.reset();
        mostrarAlerta(`${mensaje} ${MSJ.respaldo}`);
    }

    function mostrarAlerta(mensaje, opciones = {}) {
        alerta.textContent = '';
        const texto = document.createElement('span');
        texto.textContent = mensaje + ' ';
        alerta.appendChild(texto);
        if (opciones.reintentarTurnstile) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'reg-link cursor-pointer font-semibold underline';
            b.textContent = MSJ.reintentar;
            b.addEventListener('click', () => {
                alerta.textContent = '';
                alerta.classList.add('hidden');
                turnstile.reset();
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
        ['nombre', 'email'].forEach(limpiarError);
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

function validar(d) {
    const e = {};
    if (!d.nombre) e.nombre = MSJ.nombre;
    if (!d.email) e.email = MSJ.emailVacio;
    else if (!EMAIL_RE.test(d.email)) e.email = MSJ.emailInvalido;
    return e;
}

/** "10/11/2026, 14:03" en hora de Argentina; '' si no es una fecha válida. */
function formatearFecha(iso) {
    if (typeof iso !== 'string' || !iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    try {
        return new Intl.DateTimeFormat('es-AR', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: 'America/Argentina/Buenos_Aires',
        }).format(d);
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
