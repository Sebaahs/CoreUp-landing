/**
 * form.js
 * Client-side validation + Formspree integration for the contact form.
 */

import { datosCampana, nuevoEventId } from './campaign.js';

const APPS_SCRIPT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxGuA028xppRQvrqBQuQ3yEEbRRy250ZEIIp6Y9qfOBpuAEXsOlvyZDRQWjXS3I6Mli/exec';

export function initForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const btnText = document.getElementById('btn-text');
    const btnLoading = document.getElementById('btn-loading');
    const successPanel = document.getElementById('form-success');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const name = form.name.value.trim();
        const whatsapp = form.whatsapp.value.trim();
        // De que pagina vino el lead: home | operacional | flota
        const vertical = (form.vertical && form.vertical.value) || 'home';

        // ——— Validation ———
        let isValid = true;

        if (!name) {
            showError('name');
            isValid = false;
        }
        if (!whatsapp) {
            showError('whatsapp');
            isValid = false;
        }

        if (!isValid) return;

        // ——— Submit ———
        setLoading(true);

        const eventId = nuevoEventId();

        try {
            const formData = new URLSearchParams();
            formData.append('name', name);
            formData.append('whatsapp', whatsapp);
            formData.append('WhatsApp', whatsapp);
            formData.append('vertical', vertical);
            formData.append('event_id', eventId);

            // De que anuncio vino: sin esto no se puede optimizar una campana.
            for (const [clave, valor] of Object.entries(datosCampana())) {
                formData.append(clave, valor);
            }

            const res = await fetch(APPS_SCRIPT_ENDPOINT, {
                method: 'POST',
                body: formData,
            });

            if (res.ok || res.type === 'opaque') {
                // El Lead se cuenta recien cuando el envio salio bien: contarlo
                // antes infla el numero y entrena al algoritmo con datos falsos.
                if (typeof window !== 'undefined' && window.fbq) {
                    window.fbq('track', 'Lead', {
                        content_name: 'CoreUp Demo Request',
                        content_category: 'Services',
                        // Permite optimizar cada campana por vertical.
                        content_type: vertical
                    }, { eventID: eventId });
                }

                // UI Updates
                form.classList.add('hidden');
                successPanel.classList.remove('hidden');
            } else {
                throw new Error('Network error');
            }
        } catch {
            alert('Hubo un error al enviar el formulario. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    });

    function setLoading(loading) {
        if (loading) {
            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
            btnLoading.classList.add('flex');
        } else {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
            btnLoading.classList.remove('flex');
        }
    }

    function showError(field) {
        const errorEl = form.querySelector(`[data-error="${field}"]`);
        if (errorEl) errorEl.classList.remove('hidden');

        const input = form.querySelector(`[name="${field}"]`);
        if (input) input.classList.add('border-pink-accent');
    }

    function clearErrors() {
        form.querySelectorAll('[data-error]').forEach((el) => el.classList.add('hidden'));
        form.querySelectorAll('input').forEach((el) => el.classList.remove('border-pink-accent'));
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}
