// Gestion des éléments communs de la page d'accueil.
// Un visiteur voit les ancres de la page ; un utilisateur connecté voit le menu de son rôle.
const ANCRES_ACCUEIL = [
  { id: 'accueil', href: '#accueil', libelle: 'Accueil' },
  { id: 'services', href: '#services', libelle: 'Services' },
  { id: 'presentation', href: '#presentation', libelle: 'Présentation' },
  { id: 'contact', href: '#contact', libelle: 'Contact' },
];

(async function init() {
  await chargerSession({ actif: 'accueil', liensVisiteur: ANCRES_ACCUEIL });

  // Surligne l'ancre de la section visible (uniquement pour le menu visiteur).
  const liens = document.querySelectorAll('.navbar-hopital .nav-link[href^="#"]');
  const sections = document.querySelectorAll('#accueil, #services, #presentation, #contact');
  if (!liens.length || !('IntersectionObserver' in window)) return;
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
})();
