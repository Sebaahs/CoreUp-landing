---
trigger: always_on
---

# CoreUp Toolbox - Landing Page Rules

## Tech Stack
- Framework: Vite + Vanilla JS (o React si preferís, pero Vanilla es más liviano para esto).
- Styling: Tailwind CSS (Mobile-first, Dark Mode por defecto).
- Animations: GSAP + ScrollTrigger (Indispensable para Scrollytelling fluido).
- Icons: Lucide-react / Lucide.

## EXTREMADAMENTE IMPORTANTE
- ESTA WEB TIENE QUE SER MOBILE FIRST

## Design System (BI & Data Aesthetic)
- Colors: Primary #0066FF (Electric Blue), Background #020617 (Slate 950).
- Typography: Inter o Geist (Modern Sans).
- Visuals: Glassmorphism, efectos de "Glow" en botones, bordes con gradientes sutiles.
- Charts: Simular gráficos de BI usando SVGs animados o Chart.js.

## Functional Requirements
- Form: Integración con Formspree. Validación de campos en el cliente antes del envío.
- Performance: Optimizar animaciones para 60fps. Usar `will-change` donde sea necesario.
- Code Style: Modular, limpio, sin librerías de componentes pesadas (Shadcn UI es aceptable si es React).

# CoreUp Branding & Color Tokens
- Use the following mapping for Tailwind configuration:
    - bg-space-deep: #070B14 (Main Background)
    - bg-space-mid: #0E1525 (Section Background)
    - text-violet-primary: #6666FF (Primary Action/Titles)
    - accent-pink: #EB4A66 (Key CTA or highlight)
    - accent-teal: #3C9493 (Success or Data visualization)
    - accent-cyan: #62C1CA (Information or Secondary highlights)
    - border-space-edge: #182038 (Subtle separators)

- Design Principle: Use 'SpaceDeep' for the main canvas. Use 'VioletPrimary' with 'PinkAccent' for high-energy gradients. Ensure high contrast for 'PureWhite' text against dark backgrounds.