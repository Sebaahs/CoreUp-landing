/**
 * cursorGlow.js
 * Subtle VioletPrimary radial glow that follows the cursor.
 * Disabled on touch devices for performance.
 */

export function initCursorGlow() {
    const glow = document.getElementById('cursor-glow');
    if (!glow) return;

    // Skip on touch-only devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
        glow.style.display = 'none';
        return;
    }

    let mouseX = 0;
    let mouseY = 0;
    let glowX = 0;
    let glowY = 0;
    const speed = 0.12; // lerp factor for smooth follow

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        glow.style.opacity = '1';
    });

    document.addEventListener('mouseleave', () => {
        glow.style.opacity = '0';
    });

    function animate() {
        glowX += (mouseX - glowX) * speed;
        glowY += (mouseY - glowY) * speed;
        glow.style.transform = `translate(${glowX - 250}px, ${glowY - 250}px)`;
        requestAnimationFrame(animate);
    }

    animate();
}
