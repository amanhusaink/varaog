document.addEventListener('DOMContentLoaded', () => {
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  const animateElements = document.querySelectorAll('.feature-card, .download-card, .section-title, .section-desc, .showcase');
  animateElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    observer.observe(el);
  });
  
  // OS Detection for primary download highlighting
  const userAgent = navigator.userAgent.toLowerCase();
  let os = "";
  
  if (userAgent.indexOf("win") !== -1) os = "Windows";
  if (userAgent.indexOf("mac") !== -1) os = "macOS";
  
  if (os) {
    const downloadCards = document.querySelectorAll('.download-card');
    downloadCards.forEach(card => {
      const cardTitle = card.querySelector('h3').textContent;
      if (cardTitle.toLowerCase().includes(os.toLowerCase())) {
        card.style.borderColor = 'var(--primary)';
        card.style.background = '#fff';
        card.style.boxShadow = '0 20px 50px rgba(0,0,0,0.06)';
        const btn = card.querySelector('.dl-btn');
        btn.innerHTML = `Recommended for ${os}`;
      }
    });
  }
});
