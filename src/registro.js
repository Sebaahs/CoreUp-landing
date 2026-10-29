/**
 * registro.js
 * Formulario "Probá CoreUp gratis 14 días" (autoservicio E2).
 *
 * POST {VITE_API_URL}/public/signup → 201 { codigoIngreso, urlIngreso, venceEnSegundos }.
 * La landing no recibe tokens: redirige a urlIngreso y Toolbox canjea el código
 * (contrato en .handoff/autoservicio/E2-registro-contract.md).
 *
 * Errores del backend: { code, message, details? }. Se manejan DUP-409 (email
 * ya registrado), VAL-400 y LIM-429 (rate limit) con el mensaje del back, y la
 * red caída con un mensaje genérico.
 *
 * Variables (build time, ver .env.example):
 *   VITE_API_URL             backend (sin barra final)
 *   VITE_TURNSTILE_SITE_KEY  site key de Cloudflare Turnstile; vacía = sin widget (back en bypass)
 *   VITE_TERMS_VERSION       versión de los términos que acepta el usuario (tiene que coincidir con TERMS_VERSION del back)
 *   VITE_TOOLBOX_URL         Toolbox, para el link "Iniciá sesión"
 */

import { datosCampana, nuevoEventId } from './campaign.js';

const ENV = import.meta.env;
const API_URL = (ENV.VITE_API_URL || (ENV.DEV ? 'http://localhost:3000' : '')).replace(/\/+$/, '');
const TURNSTILE_SITE_KEY = ENV.VITE_TURNSTILE_SITE_KEY || '';
const TERMS_VERSION = ENV.VITE_TERMS_VERSION || '2026-10-borrador';
const TOOLBOX_URL = (ENV.VITE_TOOLBOX_URL || 'https://coreuptoolbox.web.app').replace(/\/+$/, '') + '/';

const TIMEOUT_MS = 20000;
/** Tope de largo para los mensajes del servidor que se muestran tal cual. */
const MAX_MENSAJE = 300;
/** Margen para que el píxel de Meta despache el evento antes de salir de la página. */
const DEMORA_REDIRECT_MS = 400;

const MSJ = {
    nombre: 'Ingresá tu nombre.',
    emailVacio: 'Ingresá tu email.',
    emailInvalido: 'Revisá el email: parece que le falta algo.',
    passwordVacia: 'Elegí una contraseña.',
    passwordCorta: 'La contraseña tiene que tener al menos 6 caracteres.',
    negocio: 'Ingresá el nombre de tu negocio.',
    queHaces: 'Elegí la opción que más se parezca a lo que hacés.',
    whatsapp: 'Revisá el número: solo números, con el código de país si podés (ej: +54 9 11 1234 5678).',
    terminos: 'Para crear la cuenta tenés que aceptar los Términos y la Política de privacidad.',
    turnstile: 'Esperá un segundo a que terminemos de verificar que no seas un robot.',
    turnstileError: 'No pudimos cargar la verificación anti-robots.',
    reintentar: 'Reintentar',
    red: 'No pudimos conectarnos con CoreUp. Revisá tu conexión e intentá de nuevo.',
    servidor: 'Algo salió mal de nuestro lado. Probá de nuevo en unos minutos.',
    dupLink: 'Iniciá sesión en Toolbox',
};

export function initRegistro() {
    const form = document.getElementById('registro-form');
    if (!form) return;

    const alerta = document.getElementById('reg-alerta');
    const btn = document.getElementById('reg-submit');
    const btnText = document.getElementById('reg-btn-text');
    const btnLoading = document.getElementById('reg-btn-loading');
    const okPanel = document.getElementById('registro-ok');
    const okLink = document.getElementById('registro-ok-link');

    document.querySelectorAll('[data-toolbox-login]').forEach((a) => { a.href = TOOLBOX_URL; });

    if (!API_URL) {
        console.warn('[registro] Falta VITE_API_URL: el formulario de prueba gratis no puede enviar.');
    }

    initPanelesDemo();
    initMostrarPassword();
    const turnstile = initTurnstile(() => {
        // El widget falló (red, bloqueador, etc.): se avisa en la alerta con opción de reintentar.
        // Sin foco ni scroll: puede pasar al cargar la página, con el usuario en otra sección.
        // aria-live igual lo anuncia; si intenta enviar, la alerta sí toma el foco.
        mostrarAlerta(MSJ.turnstileError, { reintentarTurnstile: true, sinFoco: true });
    });

    // Sin JS el botón queda deshabilitado (el HTML lo trae así): el form nunca se envía de forma nativa.
    btn.disabled = false;
    btn.removeAttribute('aria-disabled');

    // Al corregir un campo se le saca el error (sin esperar al próximo envío).
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

        const eventId = nuevoEventId();
        const body = armarBody(datos, turnstile.token());

        enviando = true;
        setLoading(true);

        let res;
        let json = null;
        try {
            if (!API_URL) throw new Error('Sin VITE_API_URL');
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
            // El timeout cubre la respuesta completa: headers y body.
            try {
                res = await fetch(`${API_URL}/public/signup`, {
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

        if (res.status === 201 || res.ok) {
            const url = urlSegura(json && json.urlIngreso);
            if (!url) {
                terminarConError(MSJ.servidor);
                return;
            }
            exito(url, eventId);
            return;
        }

        const code = (json && json.code) || '';
        const mensaje = recortar(json && json.message);

        if (code === 'DUP-409' || res.status === 409) {
            mostrarError('email', 'Este email ya tiene una cuenta.');
            terminarConError(mensaje || 'Ese email ya tiene una cuenta. Iniciá sesión o recuperá tu contraseña.', {
                linkLogin: true,
            });
            return;
        }
        if (code === 'VAL-400' || res.status === 400) {
            const detalleEmail = detalleDeCampo(json && json.details, 'email');
            if (detalleEmail !== null) mostrarError('email', detalleEmail || MSJ.emailInvalido);
        }
        if (code === 'VAL-400' || code === 'LIM-429' || code === 'RATE_LIMITED' || res.status === 400 || res.status === 429) {
            terminarConError(mensaje || MSJ.servidor);
            return;
        }
        terminarConError(MSJ.servidor);
    });

    // ——— Envío ———

    function leerDatos() {
        const queHaces = form.querySelector('input[name="queHaces"]:checked');
        return {
            nombre: form.nombre.value.trim().replace(/\s+/g, ' '),
            email: form.email.value.trim(),
            password: form.password.value,
            negocio: form.negocio.value.trim().replace(/\s+/g, ' '),
            queHaces: queHaces ? queHaces.value : '',
            whatsapp: normalizarWhatsapp(form.whatsapp.value),
            whatsappCrudo: form.whatsapp.value.trim(),
            aceptaTerminos: form.aceptaTerminos.checked,
        };
    }

    function armarBody(d, token) {
        const body = {
            nombre: d.nombre,
            email: d.email,
            password: d.password,
            negocio: d.negocio,
            queHaces: d.queHaces,
            vertical: 'operacional',
            aceptaTerminos: true,
            versionTerminos: TERMS_VERSION,
            turnstileToken: token || '',
        };
        // Opcionales: se omiten si están vacíos (un "" no pasa la validación del back).
        if (d.whatsapp) body.whatsapp = d.whatsapp;
        const utm = datosCampana();
        if (utm && Object.keys(utm).length) body.utm = utm;
        return body;
    }

    function exito(url, eventId) {
        if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
            try {
                window.fbq('track', 'CompleteRegistration', { content_type: 'operacional' }, { eventID: eventId });
            } catch {
                // el píxel nunca bloquea el alta
            }
        }
        form.classList.add('hidden');
        okLink.href = url;
        okPanel.classList.remove('hidden');
        setTimeout(() => window.location.assign(url), DEMORA_REDIRECT_MS);
    }

    function terminarConError(mensaje, opciones = {}) {
        enviando = false;
        setLoading(false);
        // El token de Turnstile es de un solo uso: después de cada intento hace falta otro.
        turnstile.reset();
        mostrarAlerta(mensaje, opciones);
    }

    /** Alerta de arriba del form (role=alert): recibe el foco para que se anuncie. */
    function mostrarAlerta(mensaje, opciones = {}) {
        alerta.textContent = '';
        const texto = document.createElement('span');
        texto.textContent = mensaje + ' ';
        alerta.appendChild(texto);
        if (opciones.linkLogin) {
            const a = document.createElement('a');
            a.href = TOOLBOX_URL;
            a.className = 'reg-link font-semibold underline';
            a.textContent = MSJ.dupLink;
            alerta.appendChild(a);
        }
        if (opciones.reintentarTurnstile) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'reg-link cursor-pointer font-semibold underline';
            b.textContent = MSJ.reintentar;
            b.addEventListener('click', () => {
                alerta.textContent = '';
                alerta.classList.add('hidden');
                turnstile.reset();
                document.getElementById('reg-turnstile')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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

    function campoDe(nombre) {
        if (nombre === 'queHaces') return form.querySelector('input[name="queHaces"]');
        return form.querySelector(`[name="${nombre}"]`);
    }

    function mostrarError(nombre, mensaje) {
        const el = form.querySelector(`[data-reg-error="${nombre}"]`);
        if (el) {
            el.textContent = mensaje;
            el.classList.remove('hidden');
        }
        if (nombre === 'queHaces') {
            form.querySelectorAll('input[name="queHaces"]').forEach((r) => r.setAttribute('aria-invalid', 'true'));
            form.querySelectorAll('.reg-opcion').forEach((o) => o.classList.add('reg-invalido'));
            return;
        }
        const input = campoDe(nombre);
        if (input) {
            input.setAttribute('aria-invalid', 'true');
            input.classList.add('reg-invalido');
        }
    }

    function limpiarError(nombre) {
        const el = form.querySelector(`[data-reg-error="${nombre}"]`);
        if (el) {
            el.textContent = '';
            el.classList.add('hidden');
        }
        if (nombre === 'queHaces') {
            form.querySelectorAll('input[name="queHaces"]').forEach((r) => r.removeAttribute('aria-invalid'));
            form.querySelectorAll('.reg-opcion').forEach((o) => o.classList.remove('reg-invalido'));
            return;
        }
        const input = campoDe(nombre);
        if (input) {
            input.removeAttribute('aria-invalid');
            input.classList.remove('reg-invalido');
        }
    }

    function limpiarTodo() {
        ['nombre', 'email', 'password', 'negocio', 'queHaces', 'whatsapp', 'aceptaTerminos'].forEach(limpiarError);
        alerta.textContent = '';
        alerta.classList.add('hidden');
    }

    function enfocarCampo(nombre) {
        const input = campoDe(nombre);
        if (input) {
            input.focus({ preventScroll: true });
            input.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }

    // ——— Paneles registro / demo ———

    function initPanelesDemo() {
        const registro = document.getElementById('registro-panel');
        const demo = document.getElementById('demo-panel');
        if (!registro || !demo) return;

        const abrirDemo = (enfocar = true) => {
            registro.classList.add('hidden');
            demo.classList.remove('hidden');
            document.querySelectorAll('[data-abrir-demo][aria-expanded]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
            if (enfocar) document.getElementById('demo-titulo')?.focus({ preventScroll: true });
        };
        const volver = (enfocar = true) => {
            demo.classList.add('hidden');
            registro.classList.remove('hidden');
            document.querySelectorAll('[data-abrir-demo][aria-expanded]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
            if (enfocar) document.getElementById('registro-titulo')?.focus({ preventScroll: true });
        };

        // Botón de la tarjeta y cualquier otro CTA de demo de la página (p. ej. el del bloque de precio).
        document.querySelectorAll('[data-abrir-demo]').forEach((el) => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                abrirDemo();
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
        // Los CTA de registro (header, hero, etc.) apuntan a #contact: si la demo está abierta, vuelven al registro.
        document.querySelectorAll('a[href="#contact"]:not([data-abrir-demo])').forEach((el) => {
            el.addEventListener('click', () => {
                if (!demo.classList.contains('hidden')) volver(false);
            });
        });
        window.addEventListener('hashchange', () => {
            if (window.location.hash === '#contact' && !demo.classList.contains('hidden')) volver(false);
        });
        document.querySelectorAll('[data-volver-registro]').forEach((el) => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                volver();
            });
        });

        // getcoreup.com/#demo abre la demo directo (links viejos o anuncios de demo).
        if (window.location.hash === '#demo') {
            abrirDemo(false);
            document.getElementById('contact')?.scrollIntoView({ block: 'start' });
        }
    }

    // ——— Mostrar / ocultar contraseña ———

    function initMostrarPassword() {
        const toggle = document.getElementById('reg-password-toggle');
        const input = document.getElementById('reg-password');
        if (!toggle || !input) return;
        toggle.addEventListener('click', () => {
            const mostrar = input.type === 'password';
            input.type = mostrar ? 'text' : 'password';
            toggle.textContent = mostrar ? 'Ocultar' : 'Mostrar';
            toggle.setAttribute('aria-pressed', mostrar ? 'true' : 'false');
            toggle.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
        });
    }
}

// ——— Turnstile ———

/**
 * Carga el widget de Cloudflare Turnstile en modo explícito. Sin site key no
 * carga nada y el token viaja vacío (el back local corre con TURNSTILE_BYPASS).
 */
function initTurnstile(onError) {
    const cont = document.getElementById('reg-turnstile');
    const noop = { token: () => '', reset: () => {}, fallo: () => false };
    if (!cont || !TURNSTILE_SITE_KEY) return noop;

    let widgetId = null;
    let token = '';
    let fallo = false;

    const render = () => {
        if (!window.turnstile || widgetId !== null) return;
        widgetId = window.turnstile.render(cont, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: 'light',
            size: 'flexible',
            language: 'es',
            action: 'signup',
            callback: (t) => {
                token = t;
                fallo = false;
            },
            'expired-callback': () => { token = ''; },
            'error-callback': () => {
                token = '';
                fallo = true;
                onError();
                // true = ya lo manejamos; Turnstile no reintenta ni tira la excepción por su cuenta.
                return true;
            },
        });
    };

    window.__coreupTurnstileListo = render;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__coreupTurnstileListo';
    s.async = true;
    s.defer = true;
    s.onerror = () => { fallo = true; onError(); };
    document.head.appendChild(s);

    return {
        token: () => token || (widgetId !== null && window.turnstile ? window.turnstile.getResponse(widgetId) || '' : ''),
        fallo: () => fallo,
        reset: () => {
            token = '';
            if (widgetId === null) {
                // El script no había cargado: se intenta de nuevo.
                if (window.turnstile) render();
                return;
            }
            if (window.turnstile) {
                try { window.turnstile.reset(widgetId); } catch { /* sin widget no hay nada que resetear */ }
            }
        },
    };
}

// ——— Validación ———

/**
 * Parecido a @IsEmail de class-validator (sin ser idéntico): parte local sin espacios ni
 * puntos al borde, dominio con etiquetas alfanuméricas (guiones en el medio) y TLD de
 * 2+ letras. Sin puntos dobles en ningún lado.
 */
const EMAIL_RE = /^(?!\.)(?!.*\.\.)[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]{1,64}(?<!\.)@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

function validar(d) {
    const e = {};
    if (!d.nombre) e.nombre = MSJ.nombre;
    if (!d.email) e.email = MSJ.emailVacio;
    else if (!EMAIL_RE.test(d.email)) e.email = MSJ.emailInvalido;
    if (!d.password) e.password = MSJ.passwordVacia;
    else if (d.password.length < 6) e.password = MSJ.passwordCorta;
    if (!d.negocio) e.negocio = MSJ.negocio;
    if (!d.queHaces) e.queHaces = MSJ.queHaces;
    if (d.whatsappCrudo && !d.whatsapp) e.whatsapp = MSJ.whatsapp;
    if (!d.aceptaTerminos) e.aceptaTerminos = MSJ.terminos;
    return e;
}

/** E.164 laxo: saca espacios, guiones, puntos y paréntesis. "" si no es un número razonable. */
function normalizarWhatsapp(crudo) {
    const limpio = String(crudo || '').trim().replace(/[\s().-]/g, '');
    if (!limpio) return '';
    return /^\+?\d{8,15}$/.test(limpio) ? limpio : '';
}

const HOSTS_LOCALES = ['localhost', '127.0.0.1', '[::1]'];

/**
 * urlIngreso solo se sigue si es https al host de VITE_TOOLBOX_URL (http solo en
 * localhost). En dev también se acepta cualquier localhost (el mock, Toolbox local).
 * Nunca javascript:, data: ni otro dominio.
 */
function urlSegura(valor) {
    if (typeof valor !== 'string' || !valor) return '';
    try {
        const u = new URL(valor);
        const local = HOSTS_LOCALES.includes(u.hostname);
        if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return '';
        const toolbox = new URL(TOOLBOX_URL);
        if (u.host === toolbox.host && u.protocol === toolbox.protocol) return u.href;
        if (ENV.DEV && local) return u.href;
        return '';
    } catch {
        return '';
    }
}

/** Mensaje del servidor, limpio y con tope de largo. */
function recortar(valor) {
    if (typeof valor !== 'string') return '';
    const t = valor.trim();
    return t.length > MAX_MENSAJE ? t.slice(0, MAX_MENSAJE - 1) + '…' : t;
}

/**
 * Busca en `details` del VAL-400 algo sobre `campo`. null = nada; '' = hay error pero
 * el texto es el default en inglés de class-validator; si no, el texto (recortado).
 */
function detalleDeCampo(details, campo) {
    if (!Array.isArray(details)) return null;
    const d = details.find((x) => typeof x === 'string' && x.toLowerCase().includes(campo));
    if (!d) return null;
    if (/\b(must|should|property|is not|are not)\b/.test(d)) return '';
    // "email: El email no es válido." → "El email no es válido."
    return recortar(d.replace(new RegExp(`^\\s*${campo}\\s*[:\\-–]\\s*`, 'i'), ''));
}
