---
trigger: always_on
---

# Landing de CoreUp — reglas del repo

> Actualizado el 29/09/2026. La versión anterior describía un sitio en dark mode
> con formulario en Formspree: las dos cosas dejaron de ser ciertas hace meses.
> Si algo de acá no coincide con el código, gana el código — y actualizá esto.

## Qué es

La landing comercial de CoreUp, publicada en **https://getcoreup.com**. No es
parte de la aplicación (eso es `CoreUp-Toolbox`). Es el destino de las campañas
pagas, así que todo lo que se toca acá tiene impacto en el costo por lead.

**Arquitectura de marca**: Toolbox es el sistema, CoreUp es el equipo que lo
implementa y acompaña. El producto nunca se nombra "CoreUp Toolbox".

## Tech stack

- **Vite 6** + **Vanilla JS** con ES modules. Sin framework, y no hace falta.
- **Tailwind CSS v4** vía `@tailwindcss/vite`. **No hay `tailwind.config.js`**:
  los tokens se declaran en un bloque `@theme` dentro de `src/style.css`.
- **GSAP + ScrollTrigger** para las animaciones de scroll.
- **Iconos: SVG inline** con paths estilo Heroicons. No hay librería de iconos
  y no hay React, así que nada de `lucide-react`.
- Sin dependencias de componentes. Si una función necesita una librería nueva,
  primero preguntá si se puede resolver con 30 líneas.

## Estructura: tres páginas, una base

```
index.html               →  /              home de marca, rutea a las dos verticales
operacional/index.html   →  /operacional/  comercio y producción
flota/index.html         →  /flota/        empresas de transporte
partials/                →  head · header · servicio · precio · form · cta · footer
src/                     →  style.css, main.js y los módulos de JS
public/                  →  favicon.svg y las imágenes de Open Graph
```

Los partials se resuelven **en tiempo de build** con un plugin propio que vive
en `vite.config.js` (unas 30 líneas, sin dependencias):

```html
<!--@include partials/form.html vertical="flota" precioClase="hidden" -->
```

Lee el archivo, reemplaza los `{{parametros}}` por los atributos del include y
lo pega. Lo que llega al navegador es HTML plano: sin costo en runtime y sin
problemas de SEO. Un partial puede incluir a otro (hace tres pasadas).

**Agregar una página** = una entrada en el array `PAGINAS` de `vite.config.js`.
De ahí salen también el sitemap y las entradas del build.

**El dominio se define UNA sola vez**, en la constante `SITE` de
`vite.config.js`. De ahí salen el canonical, las URLs de Open Graph, el
`robots.txt` y el `sitemap.xml`, que se generan en el build.

## Diseño: es LIGHT MODE

Esto es lo que más confunde al entrar. El sitio **era** dark mode y migró a
light, pero el markup quedó con las clases viejas (`text-white`,
`text-gray-400`, `bg-space-deep`). No están rotas y **no hay que "arreglarlas"**:
`src/style.css` las pisa con `!important` dentro de `#story-container`.

Tokens reales, en el `@theme` de `src/style.css`:

| Token | Valor | Para qué |
|---|---|---|
| `space-deep` | `transparent` | Secciones que dejan ver el degradado del body |
| `space-mid` | `rgba(240,244,255,.4)` | Secciones con un tinte apenas más azul |
| `card-mid` | `#ffffff` | Tarjetas sólidas |
| `space-edge` | `#e2e8f0` | Bordes |
| `violet-primary` | `#8a8cf3` | Acción primaria y títulos |
| `pink-accent` | `#4f6ef7` | Gradientes de alta energía y CTA |
| `teal-accent` | `#3C9493` | Éxito |
| `cyan-accent` | `#62C1CA` | Secundario / información |

El fondo del `body` es `linear-gradient(180deg, #e6ebff, #ffffff)` fijo, y el
texto base es `#0f172a`. Colores de marca para material gráfico: CoreUp
`#5047A4`, Toolbox `#4F6EF7`.

**MOBILE FIRST, sigue siendo la regla más importante.** Verificá siempre que no
aparezca scroll horizontal a 375px.

### Dos trampas del CSS que ya mordieron

1. **`a.border-space-edge` es la regla del botón outline**, e incluye
   `a.border-space-edge * { color: inherit !important }`. Si le ponés esa clase
   a una tarjeta que es un `<a>`, le pisa el color a todo lo de adentro y en
   hover le mete fondo sólido. Para tarjetas clicables usá `border` a secas:
   `.scroll-reveal-card` ya define el color del borde.

2. **`#story-container p, li, label`** quedan en slate-700 con `!important`.
   Si necesitás un párrafo de color, usá `<span>` o un estilo inline.

## Animaciones

- `.scroll-reveal` (títulos) y `.scroll-reveal-card` (tarjetas) son **globales**:
  cualquier sección nueva que use esas clases se anima sola, sin tocar JS.
- El hub animado de "¿Qué es Toolbox?" (`#order`) **solo existe en la home**.
  `scrollStory.js` lo tiene detrás de un `if (orderSection)`; no lo saques.
- Las dos clases dejan el contenido en opacidad 0 hasta que el scroll dispara.
  Es lo que hace que las capturas automáticas salgan en negro — no está roto.

## Formulario y campañas

- **Va a Google Apps Script**, no a Formspree. El endpoint está en `src/form.js`.
- Manda `name`, `whatsapp`, **`vertical`** (de qué página vino) y **todos los
  parámetros de campaña** (`utm_*`, `fbclid`, `gclid`, `ttclid`, `landing`,
  `referrer`) que captura `src/campaign.js` al entrar y guarda en
  `sessionStorage`. Sin eso no se puede optimizar una campaña.
- También manda un `event_id`, que hoy solo viaja al píxel. Está para el día que
  se prenda la Conversions API y Meta necesite deduplicar.
- **El evento `Lead` del píxel se dispara DESPUÉS de que el envío sale bien.**
  Nunca antes: contar conversiones que fallaron entrena mal al algoritmo.
- Píxel de Meta `1166277638843805`, con un `trackCustom('ViewVertical')` por
  página para poder optimizar cada campaña por separado.

## Imágenes

- **WebP siempre.** El hero pasó de 446 KB a 78 KB con eso solo.
- La primera imagen visible lleva `fetchpriority="high"` y un `<link rel="preload">`
  en el head de su página. Las que no se ven al cargar, `loading="lazy"`.
- Los `alt` describen la pantalla, no el archivo: "Dashboard de Toolbox con las
  métricas del negocio", no "Dashboard".
- Las imágenes de Open Graph son 1200×630 y viven en `public/`.

## Deploy

**Firebase Hosting**, a mano, y la configuración **no está en este repo** (la
tiene Sebastián). Antes de cualquier deploy que agregue o mueva páginas hay que
confirmar dos cosas de su `firebase.json`:

1. Que **no** haya un rewrite catch-all `{"source": "**", "destination": "/index.html"}`.
   Con eso, `/operacional/` y `/flota/` servirían la home y la división se rompe
   en producción mientras funciona perfecto en local.
2. Qué dice `cleanUrls`, para que el canonical y el sitemap apunten a la misma
   forma de URL que sirve Firebase (con o sin barra final).

Mergear a `master` **no publica nada**: no hay GitHub Actions. El deploy es un
paso aparte.

## Git

PRs a **`master`**. La rama `main` quedó vieja y no se usa. El link de "Create
pull request" que sugiere GitHub al pushear apunta a `main`: usá la URL de
compare con la base explícita.
