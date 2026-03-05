/**
 * particles.js
 * Generates SVG circle particles scattered across the hero section.
 * Uses the SVG canvas's actual dimensions to ensure full coverage on any screen size.
 */

const PARTICLE_COUNT = 45;
const PINK = '#EB4A66';
const OVERFLOW = 60; // px beyond edges for a natural feel

/** @type {SVGCircleElement[]} */
export let particles = [];

export function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    // Use the SVG's actual rendered size, not window dimensions
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const r = Math.random() * 4 + 2;
        const cx = -OVERFLOW + Math.random() * (w + OVERFLOW * 2);
        const cy = -OVERFLOW + Math.random() * (h + OVERFLOW * 2);
        const opacity = Math.random() * 0.6 + 0.3;

        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', r);
        circle.setAttribute('fill', PINK);
        circle.setAttribute('opacity', opacity);
        circle.classList.add('particle');

        canvas.appendChild(circle);
        particles.push(circle);
    }
}
