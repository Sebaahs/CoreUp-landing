import './style.css';
import { initParticles } from './particles.js';
import { initScrollStory } from './scrollStory.js';
import { initCursorGlow } from './cursorGlow.js';
import { initForm } from './form.js';
import { initHeroSlider } from './heroSlider.js';

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initScrollStory();
    initCursorGlow();
    initForm();
    initHeroSlider();
});
