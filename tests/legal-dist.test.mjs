/**
 * Verificación estática del build (dist/) para la Disp. SSDCyLC 954/2025:
 * "Botón de arrepentimiento", "Botón de baja de servicio" y bloque de Atención al cliente
 * en TODAS las páginas, sitemap/noindex de las páginas nuevas e includes resueltos.
 *
 * Sin dependencias: `npm run build:local && node --test tests/legal-dist.test.mjs`
 * (Contra la base feat/registro-prueba-gratis falla 19 de 24: sirve como regresión.)
 * No ejecuta JS de la página (eso se probó a mano en el navegador).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

function htmls(dir) {
    return readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) return htmls(p);
        return f.endsWith('.html') ? [p] : [];
    });
}

const texto = (html) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const ruta = (p) => '/' + relative(DIST, p).replace(/index\.html$/, '');

assert.ok(existsSync(DIST), 'Falta dist/: corré `npm run build:local` antes.');
const PAGINAS = htmls(DIST);

test('el build genera las 9 páginas esperadas', () => {
    assert.deepEqual(PAGINAS.map(ruta).sort(), [
        '/', '/arrepentimiento/', '/baja/', '/drivers/privacidad/', '/flota/', '/operacional/',
        '/privacidad-plataforma/', '/privacidad/', '/terminos/',
    ]);
});

for (const p of PAGINAS) {
    const html = readFileSync(p, 'utf-8');
    const sinComentarios = html.replace(/<!--[\s\S]*?-->/g, '');
    const plano = texto(html);

    test(`${ruta(p)}: links con el nombre exacto y la ruta correcta`, () => {
        const links = [...sinComentarios.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)]
            .map(([, href, inner]) => [href, texto(inner).trim()]);
        assert.ok(links.some(([h, t]) => h === '/arrepentimiento/' && t === 'Botón de arrepentimiento'),
            'falta <a href="/arrepentimiento/">Botón de arrepentimiento</a>');
        assert.ok(links.some(([h, t]) => h === '/baja/' && t === 'Botón de baja de servicio'),
            'falta <a href="/baja/">Botón de baja de servicio</a>');
    });

    test(`${ruta(p)}: bloque de Atención al cliente`, () => {
        assert.match(plano, /Atención al cliente/);
        assert.match(plano, /Área responsable: Atención al cliente de CoreUp/);
        assert.match(sinComentarios, /href="mailto:contacto@getcoreup\.com"/);
        assert.match(plano, /lunes a viernes de 9 a 17 \(hora de Argentina\)/);
    });

    test(`${ruta(p)}: sin @include ni {{parámetros}} sin resolver`, () => {
        assert.doesNotMatch(html, /@include/);
        assert.doesNotMatch(sinComentarios, /\{\{\w+\}\}/);
    });
}

test('sitemap: incluye /arrepentimiento/ y /baja/, excluye los placeholders', () => {
    const sm = readFileSync(join(DIST, 'sitemap.xml'), 'utf-8');
    assert.match(sm, /<loc>https:\/\/getcoreup\.com\/arrepentimiento\/<\/loc>/);
    assert.match(sm, /<loc>https:\/\/getcoreup\.com\/baja\/<\/loc>/);
    assert.doesNotMatch(sm, /\/terminos\//);
    assert.doesNotMatch(sm, /\/privacidad-plataforma\//);
});

for (const [r, robots] of [
    ['terminos', 'noindex'], ['privacidad-plataforma', 'noindex'],
    ['arrepentimiento', 'index'], ['baja', 'index'],
]) {
    test(`/${r}/: robots=${robots}, canonical propio y sin píxel de Meta`, () => {
        const html = readFileSync(join(DIST, r, 'index.html'), 'utf-8');
        const meta = html.match(/<meta name="robots" content="([^"]+)"/);
        assert.ok(meta, 'falta meta robots');
        assert.ok(meta[1].split(',').map((s) => s.trim()).includes(robots), `robots = ${meta[1]}`);
        assert.match(html, new RegExp(`<link rel="canonical" href="https://getcoreup\\.com/${r}/"`));
        assert.doesNotMatch(html, /fbq|connect\.facebook\.net/);
    });
}

for (const [r, tipo] of [['arrepentimiento', 'arrepentimiento'], ['baja', 'baja']]) {
    test(`/${r}/: el form trae data-tipo="${tipo}", botón deshabilitado sin JS y noscript con el mail`, () => {
        const html = readFileSync(join(DIST, r, 'index.html'), 'utf-8');
        assert.match(html, new RegExp(`<form[^>]*id="pedido-form"[^>]*data-tipo="${tipo}"`));
        assert.match(html, /<button id="pedido-submit" type="submit" disabled/);
        assert.match(html, /<noscript>[\s\S]*contacto@getcoreup\.com[\s\S]*<\/noscript>/);
        // Ningún campo del form se llama "tipo": el tipo sale de la página.
        assert.doesNotMatch(html, /name="tipo"/);
    });
}

// Ronda 2 (B1): sin maxlength el navegador no corta en silencio lo pegado; los largos los valida el JS.
for (const r of ['arrepentimiento', 'baja']) {
    test(`/${r}/: los campos del pedido no tienen maxlength`, () => {
        const html = readFileSync(join(DIST, r, 'index.html'), 'utf-8');
        const form = html.match(/<form[^>]*id="pedido-form"[\s\S]*?<\/form>/);
        assert.ok(form, 'falta el form');
        assert.doesNotMatch(form[0], /maxlength=/i);
    });
}

// Ronda 2 (B5): las notas internas (<!--# ... -->) no llegan al navegador.
test('dist sin comentarios de build ni notas internas', () => {
    for (const p of PAGINAS) {
        const html = readFileSync(p, 'utf-8');
        for (const re of [/<!--#/, /TODO legal/, /No publicar/, /No los saques/, /si cambia uno/, /SSDCyLC/]) {
            assert.doesNotMatch(html, re, `${ruta(p)} contiene ${re}`);
        }
    }
});

test('registro: la casilla enlaza /terminos/ y /privacidad-plataforma/', () => {
    for (const p of ['index.html', 'operacional/index.html']) {
        const html = readFileSync(join(DIST, p), 'utf-8');
        const label = html.match(/<label for="reg-terminos"[\s\S]*?<\/label>/);
        assert.ok(label, `${p}: falta el label de la casilla`);
        assert.match(label[0], /href="\/terminos\/"/);
        assert.match(label[0], /href="\/privacidad-plataforma\/"/);
    }
});
