import './style.css';
import { initParticles } from './particles.js';
import { initScrollStory } from './scrollStory.js';
import { initCursorGlow } from './cursorGlow.js';
import { initForm } from './form.js';
import { initHeroSlider } from './heroSlider.js';
import { capturarCampana } from './campaign.js';

// Antes que nada: los parametros de campana solo estan en la URL de entrada.
capturarCampana();

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initScrollStory();
    initCursorGlow();
    initForm();
    initHeroSlider();
});
