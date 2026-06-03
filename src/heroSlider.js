export function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    let currentIndex = 0;
    const intervalTime = 4000; // Rotate slide every 4 seconds

    setInterval(() => {
        // Remove active class from current slide
        slides[currentIndex].classList.remove('active');

        // Go to next slide
        currentIndex = (currentIndex + 1) % slides.length;

        // Add active class to next slide
        slides[currentIndex].classList.add('active');
    }, intervalTime);
}
