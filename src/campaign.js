/**
 * campaign.js
 * Captura los parámetros de campaña de la URL y los guarda para adjuntarlos
 * al lead cuando se envía el formulario.
 *
 * Sin esto, un lead llega sabiendo de qué página vino pero no de qué anuncio,
 * así que no se puede apagar el creativo malo ni escalar el bueno.
 *
 * Se guarda en sessionStorage porque el visitante puede navegar entre
 * secciones (o entre las tres páginas) antes de llegar al formulario, y los
 * parámetros solo están en la URL de entrada.
 */

const CLAVES = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'fbclid',   // Meta
    'gclid',    // Google Ads
    'ttclid',   // TikTok
];

const STORAGE_KEY = 'coreup_campana';
const MAX_LARGO = 300;

/** Lee la URL al entrar. Si trae parámetros de campaña, los guarda. */
export function capturarCampana() {
    try {
        const params = new URLSearchParams(window.location.search);
        const datos = {};

        for (const clave of CLAVES) {
            const valor = params.get(clave);
            if (valor) datos[clave] = valor.slice(0, MAX_LARGO);
        }

        // Si esta visita no trae nada, no pisamos lo que ya había guardado:
        // el visitante puede haber entrado por el anuncio y estar navegando.
        if (Object.keys(datos).length === 0) return;

        datos.landing = window.location.pathname;
        datos.referrer = (document.referrer || '').slice(0, MAX_LARGO);
        datos.capturado = new Date().toISOString();

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
    } catch {
        // Modo incógnito, storage bloqueado, etc. No es motivo para romper nada.
    }
}

/** Lo guardado, o un objeto vacío si no hay nada o no se puede leer. */
export function datosCampana() {
    try {
        const crudo = sessionStorage.getItem(STORAGE_KEY);
        return crudo ? JSON.parse(crudo) : {};
    } catch {
        return {};
    }
}

/**
 * Identificador único del evento de conversión.
 * Hoy solo viaja al píxel y al Apps Script. Sirve para que, el día que se
 * agregue la Conversions API, Meta pueda deduplicar el evento del navegador
 * con el del servidor sin tocar nada de este lado.
 */
export function nuevoEventId() {
    try {
        if (crypto?.randomUUID) return crypto.randomUUID();
    } catch {
        // seguimos con el fallback
    }
    return 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
