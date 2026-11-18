import assert from 'node:assert/strict';
import test from 'node:test';
import { idValide, lireFiltres, lirePagination, lireRecherche, reponsePage } from '../utils/filtres.js';

test('pagination produit un offset cohérent et refuse les bornes invalides', () => {
  assert.deepEqual(lirePagination({ page: '3', limite: '9' }), {
    page: 3,
    limite: 9,
    offset: 18,
  });
  assert.deepEqual(lirePagination({}), { page: 1, limite: 20, offset: 0 });
  assert.throws(() => lirePagination({ page: '0' }), { status: 400 });
  assert.throws(() => lirePagination({ limite: '101' }), { status: 400 });
});

test('recherche nettoie les espaces et refuse les valeurs invalides', () => {
  assert.equal(lireRecherche({ q: '  Nadia  ' }), 'Nadia');
  assert.equal(lireRecherche({}), null);
  assert.throws(() => lireRecherche({ q: ['un', 'deux'] }), { status: 400 });
  assert.throws(() => lireRecherche({ q: 'a'.repeat(101) }), { status: 400 });
});

test('filtres valident enums, dates et booléens sans perdre false', () => {
  const definitions = {
    sexe: { enumeration: ['M', 'F'] },
    assure: { booleen: true },
    date_debut: { date: true },
  };
  assert.deepEqual(lireFiltres(
    { sexe: 'F', assure: 'false', date_debut: '2026-02-28' },
    definitions,
  ), {
    filtres: { sexe: 'F', assure: false, date_debut: '2026-02-28' },
    erreur: null,
  });
  assert.equal(lireFiltres({ sexe: 'X' }, definitions).erreur, 'sexe');
  assert.equal(lireFiltres({ date_debut: '2026-02-30' }, definitions).erreur, 'date_debut');
});

test('réponse paginée conserve le total même quand une page ne contient rien', () => {
  assert.deepEqual(reponsePage([], { page: 4, limite: 10, offset: 30 }, 31), {
    items: [],
    page: 4,
    limite: 10,
    pages: 4,
    total: 31,
  });
});

test('identifiants de détail limités aux entiers positifs sûrs', () => {
  assert.equal(idValide('42'), 42);
  assert.equal(idValide('0'), null);
  assert.equal(idValide('1.5'), null);
  assert.equal(idValide('9007199254740992'), null);
});
