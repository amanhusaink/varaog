document.addEventListener('DOMContentLoaded', () => {
    // OS Detection to highlight the correct download button
    const detectOS = () => {
        const userAgent = window.navigator.userAgent;
        if (userAgent.indexOf("Mac") !== -1) return "mac";
        if (userAgent.indexOf("Win") !== -1) return "win";
        if (userAgent.indexOf("Linux") !== -1) return "linux";
        return "unknown";
    };

    const os = detectOS();
    const macBtn = document.querySelector('.os-mac');
    const winBtn = document.querySelector('.os-win');
    const osHint = document.getElementById('os-hint');

    if (os === 'mac') {
        macBtn.classList.add('recommended');
        winBtn.classList.replace('btn-primary', 'btn-secondary');
        macBtn.classList.replace('btn-secondary', 'btn-primary');
        osHint.textContent = "We detected you're on a Mac. The Mac version is recommended.";
    } else if (os === 'win') {
        winBtn.classList.add('recommended');
        macBtn.classList.replace('btn-primary', 'btn-secondary');
        winBtn.classList.replace('btn-secondary', 'btn-primary');
        osHint.textContent = "We detected you're on Windows. The Windows version is recommended.";
    }

    // Smooth Scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Intersection Observer for Scroll Animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(card);
    });
});
