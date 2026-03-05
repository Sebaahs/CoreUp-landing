/**
 * scrollStory.js
 * GSAP ScrollTrigger animations for the full CoreUp landing page.
 *
 * Sections animated:
 * 1. Hero – particle idle drift + convergence on scroll
 * 2. Problem – cards stagger in
 * 3. Order – bar chart growth + line chart draw-in
 * 4. Features – cards stagger in
 * 5. Ecosystem – cards slide in from sides
 * 6. Service – numbered steps stagger in
 * 7. Contact – form wrapper fades up
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { particles } from './particles.js';

gsap.registerPlugin(ScrollTrigger);

export function initScrollStory() {
    // ——— Global: all .scroll-reveal titles ———
    gsap.utils.toArray('.scroll-reveal').forEach((el) => {
        gsap.from(el, {
            y: 40,
            opacity: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
            },
        });
    });

    // ——— Global: all .scroll-reveal-card ———
    gsap.utils.toArray('.scroll-reveal-card').forEach((el, i) => {
        gsap.from(el, {
            y: 50,
            opacity: 0,
            duration: 0.8,
            delay: (i % 4) * 0.12,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 90%',
                toggleActions: 'play none none reverse',
            },
        });
    });

    // ===================================================
    // HERO: Idle floating + convergence
    // ===================================================
    particles.forEach((p) => {
        const driftX = (Math.random() - 0.5) * 80;
        const driftY = (Math.random() - 0.5) * 80;
        const dur = Math.random() * 3 + 3;

        gsap.to(p, {
            attr: { cx: `+=${driftX}`, cy: `+=${driftY}` },
            duration: dur,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
        });
    });

    const heroSection = document.getElementById('hero');

    ScrollTrigger.create({
        trigger: heroSection,
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
        onUpdate: (self) => {
            const progress = self.progress;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            particles.forEach((p) => {
                const origX = parseFloat(p.getAttribute('cx'));
                const origY = parseFloat(p.getAttribute('cy'));
                const newX = gsap.utils.interpolate(origX, centerX, progress * 0.6);
                const newY = gsap.utils.interpolate(origY, centerY, progress * 0.6);

                gsap.set(p, {
                    attr: { cx: newX, cy: newY },
                    opacity: 1 - progress * 0.8,
                });
            });
        },
    });

    // ===================================================
    // ORDER: Bar chart + line chart
    // ===================================================
    const orderSection = document.getElementById('order');
    const bars = gsap.utils.toArray('.chart-bar');
    const lineChart = document.getElementById('line-chart');
    const linePath = document.getElementById('line-path');

    bars.forEach((bar, i) => {
        const targetH = bar.dataset.targetHeight || '50%';
        gsap.to(bar, {
            height: targetH,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: orderSection,
                start: 'top 80%',
                end: 'top 20%',
                scrub: 1,
            },
            delay: i * 0.05,
        });
    });

    if (linePath) {
        const pathLength = linePath.getTotalLength ? linePath.getTotalLength() : 1000;
        gsap.set(linePath, { strokeDasharray: pathLength, strokeDashoffset: pathLength });

        gsap.to(linePath, {
            strokeDashoffset: 0,
            ease: 'power2.inOut',
            scrollTrigger: {
                trigger: orderSection,
                start: 'top 40%',
                end: 'center center',
                scrub: 1,
            },
        });

        gsap.to(lineChart, {
            opacity: 1,
            ease: 'power2.inOut',
            scrollTrigger: {
                trigger: orderSection,
                start: 'top 50%',
                end: 'top 20%',
                scrub: 1,
            },
        });
    }

    gsap.utils.toArray('.line-dot').forEach((dot, i) => {
        gsap.from(dot, {
            r: 0,
            ease: 'back.out(3)',
            scrollTrigger: {
                trigger: orderSection,
                start: `top ${45 - i * 3}%`,
                end: `top ${35 - i * 3}%`,
                scrub: 1,
            },
        });
    });

    // ===================================================
    // CONTACT: Form reveal
    // ===================================================
    const formWrapper = document.getElementById('form-wrapper');

    if (formWrapper) {
        gsap.to(formWrapper, {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: '#contact',
                start: 'top 70%',
                end: 'top 30%',
                scrub: 1,
            },
        });
    }

    // ===================================================
    // Section title/paragraph fade-ups (legacy selectors)
    // ===================================================
    gsap.utils.toArray('#order h2, #order p').forEach((el) => {
        gsap.from(el, {
            y: 40,
            opacity: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
            },
        });
    });
}
