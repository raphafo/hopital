
chargerSession();

const liens = document.querySelectorAll('.navbar-hopital .nav-link[href^="#"]');
const observateur = new IntersectionObserver((entrees) => {
  entrees.forEach((e) => {
    if (!e.isIntersecting) return;
    liens.forEach((l) => l.classList.remove('active'));
    document.querySelector(`.navbar-hopital .nav-link[href="#${e.target.id}"]`)?.classList.add('active');
  });
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('#accueil, #services, #presentation, #contact').forEach((s) => observateur.observe(s));
