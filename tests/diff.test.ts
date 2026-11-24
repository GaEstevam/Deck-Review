import { describe, expect, it } from 'vitest';
import { diffOps } from '../src/firebase/diff';
import { emptyData } from '../src/store/store';

describe('diffOps', () => {
  it('grava só o que mudou e apaga o que saiu', () => {
    const a = emptyData();
    a.decks = [
      { id: 'd1', name: 'Dragapult', status: 'principal', currentVersionId: null, createdAt: 'x' },
      { id: 'd2', name: 'Gardevoir', status: 'testando', currentVersionId: null, createdAt: 'x' },
    ];
    const b = structuredClone(a);
    b.decks[0].status = 'arquivado';
    b.decks.splice(1, 1);
    b.collection.push({ id: 'c1', name: 'Ultra Ball', qty: 4, type: 'treinador' });

    const ops = diffOps(a, b);
    expect(ops).toEqual([
      { path: ['decks', 'd1'], data: { name: 'Dragapult', status: 'arquivado', currentVersionId: null, createdAt: 'x' } },
      { path: ['decks', 'd2'], data: null },
      { path: ['colecao', 'c1'], data: { name: 'Ultra Ball', qty: 4, type: 'treinador' } },
    ]);
  });

  it('meta e preferências viram documentos em config/', () => {
    const a = emptyData();
    const b = structuredClone(a);
    b.settings.scope = 'deck';
    b.meta.entries = [{ deck: 'Gardevoir ex', share: 18 }];
    expect(diffOps(a, b).map((o) => o.path)).toEqual([
      ['config', 'meta'],
      ['config', 'preferencias'],
    ]);
  });

  it('nada mudou, nada é gravado', () => {
    const a = emptyData();
    expect(diffOps(a, structuredClone(a))).toEqual([]);
  });
});
