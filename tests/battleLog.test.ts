import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { looksLikeBattleLog, parseBattleLog, suggestOpponentDeck } from '../src/lib/battleLog';

// Logs reais do TCG Live (pt-BR), com os nicks trocados por nomes neutros.
const derrota = readFileSync('tests/fixtures/log-derrota-premios.txt', 'utf8');
const vitoria = readFileSync('tests/fixtures/log-vitoria-desistencia.txt', 'utf8');

// Trecho em inglês do início de um log (exemplo do pedido), nicks trocados.
const inglesInicio = `Setup
Jogador_A chose heads for the opening coin flip.
Jogador_A won the coin toss.
Jogador_A decided to go second.
Jogador_A drew 7 cards for the opening hand.
- 7 drawn cards.
jogador_b drew 7 cards for the opening hand.
`;

describe('parseBattleLog — partida perdida por prêmios', () => {
  const info = parseBattleLog(derrota);

  it('acha os jogadores, a moeda e quem começou', () => {
    expect(info.players).toEqual(['_Rival_2_', 'Treinador_1']);
    expect(info.coinWinner).toBe('_Rival_2_');
    expect(info.firstPlayer).toBe('_Rival_2_');
  });

  it('conta turnos, prêmios e mulligans', () => {
    expect(info.turns).toBe(9);
    expect(info.prizes).toEqual({ _Rival_2_: 6, Treinador_1: 5 });
    expect(info.mulligans).toEqual({ _Rival_2_: 3 });
  });

  it('acha o vencedor e o motivo', () => {
    expect(info.winner).toBe('_Rival_2_');
    expect(info.endReason).toBe('premios');
    expect(info.endText).toBe('O oponente pegou todas as cartas de Prêmio.');
  });

  it('lista os Pokémon que cada um colocou em jogo', () => {
    expect(info.pokemon.Treinador_1).toEqual(expect.arrayContaining(['Moltres', 'Dreepy', 'Drakloak', 'Dragapult ex', 'Dusknoir']));
    expect(info.pokemon._Rival_2_).toEqual(expect.arrayContaining(['Clefairy ex da Lílian', 'Mega Lopunny ex', 'Cacturne']));
  });
});

describe('parseBattleLog — partida ganha por desistência', () => {
  const info = parseBattleLog(vitoria);

  it('quem escolheu ser o segundo faz o outro começar', () => {
    expect(info.players).toEqual(['Rival_3', 'Treinador_1']);
    expect(info.coinWinner).toBe('Rival_3');
    expect(info.firstPlayer).toBe('Treinador_1');
  });

  it('vencedor, motivo, turnos e prêmios', () => {
    expect(info.winner).toBe('Treinador_1');
    expect(info.endReason).toBe('desistencia');
    expect(info.turns).toBe(10);
    expect(info.prizes).toEqual({ Rival_3: 2, Treinador_1: 4 });
    expect(info.mulligans).toEqual({});
  });
});

describe('parseBattleLog — tolerância', () => {
  it('lê o início em inglês e deixa o resto como null', () => {
    const info = parseBattleLog(inglesInicio);
    expect(info.players).toEqual(['Jogador_A', 'jogador_b']);
    expect(info.coinWinner).toBe('Jogador_A');
    expect(info.firstPlayer).toBe('jogador_b');
    expect(info.turns).toBeNull();
    expect(info.winner).toBeNull();
    expect(info.endReason).toBeNull();
  });

  it('log cortado (sem o fim) não quebra', () => {
    const cortado = derrota.split('\n').slice(0, 60).join('\n');
    const info = parseBattleLog(cortado);
    expect(info.players).toEqual(['_Rival_2_', 'Treinador_1']);
    expect(info.firstPlayer).toBe('_Rival_2_');
    expect(info.winner).toBeNull();
  });

  it('texto qualquer não é reconhecido como log', () => {
    const info = parseBattleLog('4 Ultra Ball SVI 196\nqualquer coisa');
    expect(looksLikeBattleLog(info)).toBe(false);
    expect(info.firstPlayer).toBeNull();
    expect(parseBattleLog('').lines).toBe(0);
  });

  it('aceita quebras de linha do Windows', () => {
    expect(parseBattleLog(vitoria.replace(/\n/g, '\r\n')).winner).toBe('Treinador_1');
  });

  it('é rápido com logs enormes (10 mil+ linhas)', () => {
    const corpo = vitoria.split('\n').slice(13, -3).join('\n');
    const enorme = [vitoria.split('\n').slice(0, 13).join('\n'), ...Array(70).fill(corpo), 'O oponente se rendeu. Treinador_1 venceu.'].join('\n');
    const t = performance.now();
    const info = parseBattleLog(enorme);
    expect(info.lines).toBeGreaterThan(10000);
    expect(info.winner).toBe('Treinador_1');
    expect(performance.now() - t).toBeLessThan(500);
  });
});

describe('suggestOpponentDeck', () => {
  const meta = ['Gardevoir ex', 'Dragapult ex', 'Dragapult ex / Dusknoir', 'Talonflame ex'];

  it('casa o deck do meta com os Pokémon que o oponente jogou', () => {
    expect(suggestOpponentDeck(['Fezandipiti ex', 'Mega Kangaskhan ex', 'Talonflame ex'], meta)).toBe('Talonflame ex');
  });

  it('prefere o nome mais específico quando vários casam', () => {
    expect(suggestOpponentDeck(['Dreepy', 'Dragapult ex', 'Dusknoir'], meta)).toBe('Dragapult ex / Dusknoir');
    expect(suggestOpponentDeck(['Dreepy', 'Dragapult ex'], meta)).toBe('Dragapult ex');
  });

  it('sem nenhum casamento, não sugere', () => {
    expect(suggestOpponentDeck(['Pikachu ex'], meta)).toBeNull();
    expect(suggestOpponentDeck([], meta)).toBeNull();
  });
});
