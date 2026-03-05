import './style.css';
import { initParticles } from './particles.js';
import { initScrollStory } from './scrollStory.js';
import { initCursorGlow } from './cursorGlow.js';
import { initForm } from './form.js';

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initScrollStory();
    initCursorGlow();
    initForm();
});
