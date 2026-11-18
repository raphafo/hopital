import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = {};
await import('../public/js/permissions.js');
const roles = window.POLITIQUE_ROLES;

test('admin has access to every application page and resource action', () => {
  for (const page of ['accueil', 'gestion', 'formulaire', 'dashboard', 'users']) {
    assert.ok(roles.admin.pages.includes(page));
  }
  for (const resource of ['patients', 'medecins', 'rdv', 'dossiers']) {
    assert.deepEqual(roles.admin.resources[resource], ['read', 'create', 'update', 'delete'].concat(resource === 'rdv' ? ['status'] : []));
  }
  assert.deepEqual(roles.admin.resources.users, ['read', 'update']);
});

test('secretary can manage patients and appointments but not medical records', () => {
  assert.deepEqual(roles.secretaire.resources.patients, ['read', 'create', 'update', 'delete']);
  assert.deepEqual(roles.secretaire.resources.medecins, ['read']);
  assert.deepEqual(roles.secretaire.resources.rdv, ['read', 'create', 'update', 'delete', 'status']);
  assert.deepEqual(roles.secretaire.resources.dossiers, []);
  assert.ok(!roles.secretaire.pages.includes('dashboard'));
});

test('doctor can consult patients and manage only assigned medical records and appointment status', () => {
  assert.deepEqual(roles.medecin.resources.patients, ['read']);
  assert.deepEqual(roles.medecin.resources.medecins, ['read']);
  assert.deepEqual(roles.medecin.resources.rdv, ['read', 'status']);
  assert.deepEqual(roles.medecin.resources.dossiers, ['read', 'create', 'update', 'delete']);
  assert.ok(!roles.medecin.pages.includes('dashboard'));
});
