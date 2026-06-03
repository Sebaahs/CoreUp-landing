/**
 * particles.js
 * Generates SVG circle particles scattered across the hero section.
 * Uses the SVG canvas's actual dimensions to ensure full coverage on any screen size.
 */

const PARTICLE_COUNT = 45;
const BUBBLE_COLOR = '#dadbf5';

/** @type {SVGCircleElement[]} */
export let particles = [];

export function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    // Use window dimensions to ensure full coverage
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.setAttribute('width', w);
    canvas.setAttribute('height', h);
    canvas.setAttribute('viewBox', `0 0 ${w} ${h}`);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const r = Math.random() * 4 + 2;
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const opacity = Math.random() * 0.6 + 0.3;

        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', r);
        circle.setAttribute('fill', BUBBLE_COLOR);
        circle.setAttribute('opacity', opacity);
        circle.classList.add('particle');

        canvas.appendChild(circle);
        particles.push(circle);
    }
}
