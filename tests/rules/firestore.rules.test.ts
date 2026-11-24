/**
 * Prova que as regras do Firestore isolam os dados de cada usuário.
 * Roda contra o emulador: npm run test:regras
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-deck-review',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  // dados que já existem para a Ana, gravados sem passar pelas regras
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/ana'), { nome: 'Ana', email: 'ana@exemplo.com' });
    await setDoc(doc(db, 'usuarios/ana/decks/d1'), { name: 'Dragapult', status: 'principal' });
    await setDoc(doc(db, 'usuarios/ana/partidas/p1'), { opponent: 'Gardevoir ex' });
  });
});

const ana = () => env.authenticatedContext('ana').firestore();
const bruno = () => env.authenticatedContext('bruno').firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

describe('dono dos dados', () => {
  it('lê e escreve os próprios dados', async () => {
    await assertSucceeds(getDoc(doc(ana(), 'usuarios/ana/decks/d1')));
    await assertSucceeds(getDocs(collection(ana(), 'usuarios/ana/partidas')));
    await assertSucceeds(setDoc(doc(ana(), 'usuarios/ana/colecao/c1'), { name: 'Ultra Ball', qty: 4 }));
    await assertSucceeds(setDoc(doc(ana(), 'usuarios/ana/config/preferencias'), { scope: 'deck' }));
    await assertSucceeds(deleteDoc(doc(ana(), 'usuarios/ana/partidas/p1')));
    await assertSucceeds(setDoc(doc(ana(), 'usuarios/ana'), { nome: 'Ana B.' }, { merge: true }));
  });

  it('não cria subcoleções fora das que o app usa', async () => {
    await assertFails(setDoc(doc(ana(), 'usuarios/ana/qualquer/x'), { a: 1 }));
    await assertFails(setDoc(doc(ana(), 'usuarios/ana/decks/d1/extra/x'), { a: 1 }));
  });

  it('recusa documento com campos demais', async () => {
    const grande = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`c${i}`, i]));
    await assertFails(setDoc(doc(ana(), 'usuarios/ana/decks/d2'), grande));
  });
});

describe('outro usuário logado', () => {
  it('não lê os dados de outra pessoa', async () => {
    await assertFails(getDoc(doc(bruno(), 'usuarios/ana')));
    await assertFails(getDoc(doc(bruno(), 'usuarios/ana/decks/d1')));
    await assertFails(getDocs(collection(bruno(), 'usuarios/ana/partidas')));
  });

  it('não altera nem apaga os dados de outra pessoa', async () => {
    await assertFails(setDoc(doc(bruno(), 'usuarios/ana/decks/d1'), { name: 'hackeado' }));
    await assertFails(setDoc(doc(bruno(), 'usuarios/ana/decks/novo'), { name: 'intruso' }));
    await assertFails(deleteDoc(doc(bruno(), 'usuarios/ana/partidas/p1')));
    await assertFails(setDoc(doc(bruno(), 'usuarios/ana'), { nome: 'x' }));
  });

  it('não lista todos os usuários', async () => {
    await assertFails(getDocs(collection(bruno(), 'usuarios')));
  });
});

describe('sem login', () => {
  it('não lê nem escreve nada', async () => {
    await assertFails(getDoc(doc(anonimo(), 'usuarios/ana/decks/d1')));
    await assertFails(setDoc(doc(anonimo(), 'usuarios/ana/decks/x'), { a: 1 }));
    await assertFails(getDoc(doc(anonimo(), 'qualquer/coisa')));
  });
});
