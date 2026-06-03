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

    gsap.to(particles, {
        opacity: 0,
        scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
        }
    });

    // ===================================================
    // ORDER: Central Hub satellite connection animation
    // ===================================================
    const orderSection = document.getElementById('order');
    const hubNode = document.getElementById('hub-node');
    const nodeOps = document.getElementById('node-operations');
    const nodeAnalysis = document.getElementById('node-analysis');
    const nodeAI = document.getElementById('node-ai');
    const nodeSecurity = document.getElementById('node-security');
    const pathOps = document.getElementById('path-ops-data');
    const pathAnalysis = document.getElementById('path-analysis');
    const pathAI = document.getElementById('path-ai');
    const pathSecurity = document.getElementById('path-security');
    const hubGlow = document.getElementById('hub-glow');
    const flowParticles = gsap.utils.toArray('.flow-particle');

    // Helper to set clean initial state for the hub visualization
    const setHubInitialState = () => {
        // Kill existing tweens on these elements
        gsap.killTweensOf([hubNode, nodeOps, nodeAnalysis, nodeAI, nodeSecurity, hubGlow]);
        flowParticles.forEach(p => gsap.killTweensOf(p));

        // Minimize and hide nodes
        gsap.set([hubNode, nodeOps, nodeAnalysis, nodeAI, nodeSecurity], { scale: 0, opacity: 0, transformOrigin: 'center center' });
        gsap.set(hubGlow, { scale: 0.5, opacity: 0, transformOrigin: 'center center' });

        // Reset connection paths to original cubic bezier values and hide them
        if (pathOps) {
            pathOps.setAttribute('d', 'M 160 220 C 240 220 320 220 400 220');
            gsap.set(pathOps, { strokeDasharray: pathOps.getTotalLength(), strokeDashoffset: pathOps.getTotalLength() });
        }
        if (pathAnalysis) {
            pathAnalysis.setAttribute('d', 'M 400 220 C 480 220 560 100 640 100');
            gsap.set(pathAnalysis, { strokeDasharray: pathAnalysis.getTotalLength(), strokeDashoffset: pathAnalysis.getTotalLength() });
        }
        if (pathAI) {
            pathAI.setAttribute('d', 'M 400 220 C 480 220 560 220.5 640 220');
            gsap.set(pathAI, { strokeDasharray: pathAI.getTotalLength(), strokeDashoffset: pathAI.getTotalLength() });
        }
        if (pathSecurity) {
            pathSecurity.setAttribute('d', 'M 400 220 C 480 220 560 340 640 340');
            gsap.set(pathSecurity, { strokeDasharray: pathSecurity.getTotalLength(), strokeDashoffset: pathSecurity.getTotalLength() });
        }

        // Reset and hide flowing particles
        gsap.set(flowParticles, { opacity: 0, attr: { cx: 400, cy: 220 } });
    };

    // Initialize
    setHubInitialState();

    // Create ScrollTrigger to launch the animation
    ScrollTrigger.create({
        trigger: orderSection,
        start: 'top 65%',
        onEnter: () => {
            const tl = gsap.timeline();

            // 1. Reveal central hub with an elastic pop
            tl.to(hubNode, {
                scale: 1,
                opacity: 1,
                duration: 0.8,
                ease: 'back.out(1.4)'
            });

            // 2. Reveal satellites scaling in stagger
            tl.to([nodeOps, nodeAnalysis, nodeAI, nodeSecurity], {
                scale: 1,
                opacity: 1,
                duration: 0.8,
                ease: 'back.out(1.4)',
                stagger: 0.12
            }, '-=0.4');

            // 3. Draw connection lines
            if (pathOps) tl.to(pathOps, { strokeDashoffset: 0, duration: 1.0, ease: 'power2.out' }, '-=0.6');
            if (pathAnalysis) tl.to(pathAnalysis, { strokeDashoffset: 0, duration: 1.0, ease: 'power2.out' }, '-=0.8');
            if (pathAI) tl.to(pathAI, { strokeDashoffset: 0, duration: 1.0, ease: 'power2.out' }, '-=0.8');
            if (pathSecurity) tl.to(pathSecurity, { strokeDashoffset: 0, duration: 1.0, ease: 'power2.out' }, '-=0.8');

            // 4. Reveal hub glow
            tl.to(hubGlow, {
                scale: 1,
                opacity: 0.35,
                duration: 0.6,
                ease: 'power2.out'
            }, '-=0.8');

            // 5. Start looping micro-animations
            tl.add(() => {
                // Looping breath on central hub glow
                gsap.to(hubGlow, {
                    scale: 1.15,
                    opacity: 0.55,
                    duration: 2.0,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut'
                });

                // Looping float animation on satellites (paths are dynamically updated to follow floating circles)
                gsap.to(nodeOps, {
                    y: '-=4',
                    duration: 2.4,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                    onUpdate: () => {
                        if (!pathOps) return;
                        const currentY = gsap.getProperty(nodeOps, "y");
                        pathOps.setAttribute('d', `M 160 ${220 + currentY} C 240 ${220 + currentY} 320 220 400 220`);
                    }
                });
                gsap.to(nodeAnalysis, {
                    y: '+=3',
                    duration: 2.6,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                    onUpdate: () => {
                        if (!pathAnalysis) return;
                        const currentY = gsap.getProperty(nodeAnalysis, "y");
                        pathAnalysis.setAttribute('d', `M 400 220 C 480 220 560 ${100 + currentY} 640 ${100 + currentY}`);
                    }
                });
                gsap.to(nodeAI, {
                    y: '-=3',
                    duration: 2.8,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                    onUpdate: () => {
                        if (!pathAI) return;
                        const currentY = gsap.getProperty(nodeAI, "y");
                        pathAI.setAttribute('d', `M 400 220 C 480 220 560 ${220.5 + currentY} 640 ${220 + currentY}`);
                    }
                });
                gsap.to(nodeSecurity, {
                    y: '+=4',
                    duration: 3.0,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                    onUpdate: () => {
                        if (!pathSecurity) return;
                        const currentY = gsap.getProperty(nodeSecurity, "y");
                        pathSecurity.setAttribute('d', `M 400 220 C 480 220 560 ${340 + currentY} 640 ${340 + currentY}`);
                    }
                });

                // Animate data flow particles along paths
                const animateAlongPath = (particle, path, delay) => {
                    if (!path) return;
                    const length = path.getTotalLength();
                    gsap.set(particle, { opacity: 1 });
                    const obj = { progress: 0 };
                    gsap.to(obj, {
                        progress: 1,
                        duration: 3.2,
                        repeat: -1,
                        delay: delay,
                        ease: 'none',
                        onUpdate: () => {
                            const point = path.getPointAtLength(obj.progress * length);
                            gsap.set(particle, { attr: { cx: point.x, cy: point.y } });
                        }
                    });
                };

                // Path 1 (Operaciones y Datos -> Hub)
                animateAlongPath(flowParticles[0], pathOps, 0);
                animateAlongPath(flowParticles[1], pathOps, 1.6);
                
                // Path 2 (Hub -> Análisis avanzado)
                animateAlongPath(flowParticles[2], pathAnalysis, 0.4);
                animateAlongPath(flowParticles[3], pathAnalysis, 2.0);

                // Path 3 (Hub -> Inteligencia Artificial)
                animateAlongPath(flowParticles[4], pathAI, 0.8);
                animateAlongPath(flowParticles[5], pathAI, 2.4);

                // Path 4 (Hub -> Seguridad/Almacenamiento)
                animateAlongPath(flowParticles[6], pathSecurity, 1.2);
                animateAlongPath(flowParticles[7], pathSecurity, 2.8);
            });
        },
        onLeaveBack: () => {
            setHubInitialState();
        }
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
    gsap.utils.toArray('#order h2, #order .max-w-2xl').forEach((el) => {
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
