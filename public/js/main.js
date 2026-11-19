// Gestion des éléments communs de la page d'accueil.
chargerSession();
// Récupère les liens du menu et les sections correspondantes.
const liens = document.querySelectorAll('.navbar-hopital .nav-link[href^="#"]');
const sections = document.querySelectorAll('#accueil, #services, #presentation, #contact');
// Met à jour le lien actif selon la section visible à l’écran.
if ('IntersectionObserver' in window) {
  const observateur = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;
      liens.forEach((lien) => {
        const actif = lien.getAttribute('href') === `#${entree.target.id}`;
        lien.classList.toggle('active', actif);
        if (actif) lien.setAttribute('aria-current', 'location');
        else lien.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-35% 0px -55% 0px' });
  sections.forEach((section) => observateur.observe(section));
}
