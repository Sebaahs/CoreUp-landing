import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Dominio de producción de la landing (confirmado por Pablo, 29/09/2026).
 * De acá salen el canonical, las URLs de Open Graph y el sitemap.
 * Es el único lugar donde se define.
 */
const SITE = 'https://getcoreup.com';

/** Páginas del sitio: entradas del build y filas del sitemap. */
const PAGINAS = [
  { entrada: 'home', archivo: 'index.html', ruta: '/', prioridad: '1.0' },
  { entrada: 'operacional', archivo: 'operacional/index.html', ruta: '/operacional/', prioridad: '0.9' },
  { entrada: 'flota', archivo: 'flota/index.html', ruta: '/flota/', prioridad: '0.9' },
  // Politica de privacidad del sitio y de los formularios de anuncios de Meta:
  // Meta la exige como URL en todo formulario de leads.
  { entrada: 'privacidad', archivo: 'privacidad/index.html', ruta: '/privacidad/', prioridad: '0.3' },
  // Politica de privacidad de la app de choferes. Prioridad baja: es una pagina
  // legal, tiene que estar indexada pero no compite con las comerciales.
  { entrada: 'driversPrivacidad', archivo: 'drivers/privacidad/index.html', ruta: '/drivers/privacidad/', prioridad: '0.3' },
];

/**
 * Includes de HTML en tiempo de build, sin dependencias nuevas.
 *
 *   <!--@include partials/form.html vertical="flota" precioClase="hidden" -->
 *
 * Lee el archivo, reemplaza los {{parametros}} por los atributos del include
 * (más los globales de abajo) y lo pega en su lugar. Corre antes que el resto
 * de Vite, así que lo que llega al navegador es HTML plano: no hay costo en
 * runtime ni problemas de SEO.
 */
const INCLUDE_RE = /<!--@include\s+([^\s>]+)((?:\s+[a-zA-Z0-9_-]+="[^"]*")*)\s*-->/g;
const GLOBALES = { site: SITE };

function htmlPartials() {
  const render = (html) => {
    let out = html;
    // Varias pasadas para que un partial pueda incluir a otro.
    for (let i = 0; i < 3; i++) {
      if (!out.includes('<!--@include')) break;
      out = out.replace(INCLUDE_RE, (_match, file, attrs) => {
        const params = { ...GLOBALES };
        for (const m of attrs.matchAll(/([a-zA-Z0-9_-]+)="([^"]*)"/g)) params[m[1]] = m[2];
        const partial = readFileSync(resolve(root, file), 'utf-8');
        return partial.replace(/\{\{(\w+)\}\}/g, (_x, key) =>
          Object.prototype.hasOwnProperty.call(params, key) ? params[key] : ''
        );
      });
    }
    return out;
  };

  return {
    name: 'html-partials',
    enforce: 'pre',
    transformIndexHtml: { order: 'pre', handler: render },
    // En dev, tocar un partial recarga la página entera.
    handleHotUpdate({ file, server }) {
      if (file.includes('/partials/') || file.includes('\\partials\\')) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

/** robots.txt y sitemap.xml generados del mismo SITE, para que no se desincronicen. */
function seoFiles() {
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: [
          'User-agent: *',
          'Allow: /',
          '',
          `Sitemap: ${SITE}/sitemap.xml`,
          '',
        ].join('\n'),
      });

      const hoy = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...PAGINAS.map((p) =>
            [
              '  <url>',
              `    <loc>${SITE}${p.ruta}</loc>`,
              `    <lastmod>${hoy}</lastmod>`,
              `    <priority>${p.prioridad}</priority>`,
              '  </url>',
            ].join('\n')
          ),
          '</urlset>',
          '',
        ].join('\n'),
      });
    },
  };
}

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: Object.fromEntries(
        PAGINAS.map((p) => [p.entrada, resolve(root, p.archivo)])
      ),
    },
  },
  plugins: [
    htmlPartials(),
    seoFiles(),
    tailwindcss(),
  ],
});
