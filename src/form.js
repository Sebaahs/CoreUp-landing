/**
 * form.js
 * Client-side validation + Formspree integration for the contact form.
 */

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
        const email = form.email.value.trim();
        const company = form.company?.value.trim() || '';
        const message = form.message.value.trim();

        // ——— Validation ———
        let isValid = true;

        if (!name) {
            showError('name');
            isValid = false;
        }
        if (!email || !isValidEmail(email)) {
            showError('email');
            isValid = false;
        }
        if (!message) {
            showError('message');
            isValid = false;
        }

        if (!isValid) return;

        // ——— Submit ———
        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('company', company);
            formData.append('message', message);

            const res = await fetch(APPS_SCRIPT_ENDPOINT, {
                method: 'POST',
                // Al enviar URLSearchParams, fetch setea automáticamente application/x-www-form-urlencoded
                // el cual es un "simple request" y evita el problema de CORS, permitiendo a App Script leerlo en e.parameter
                body: formData,
            });

            // Consideramos ok o tipo opaque (si es redirigido o modo sin-cors en algunas configs)
            if (res.ok || res.type === 'opaque') {
                console.log('Form submission successful. res.type:', res.type);

                // 1. Track Lead Event before UI changes
                if (typeof window !== "undefined" && window.fbq) {
                    console.log('Dispatching Meta Pixel Lead event...');
                    window.fbq('track', 'Lead', {
                        content_name: 'CoreUp Demo Request',
                        content_category: 'Services'
                    });
                } else {
                    console.warn('Meta Pixel (fbq) not found on window object.');
                }

                // 2. UI Updates
                form.classList.add('hidden');
                successPanel.classList.remove('hidden');
            } else {
                console.error('Form submission failed with status:', res.status);
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
        form.querySelectorAll('input, textarea').forEach((el) => el.classList.remove('border-pink-accent'));
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}
