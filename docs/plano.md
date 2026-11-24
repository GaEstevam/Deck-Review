# App de análise do deck — plano

## Objetivo

O app responde, toda semana até **6 de março**, a uma pergunta: **meu deck está pronto para o Regional do Rio?**
Ele guarda vários decks, cada um com as suas versões, registra as partidas ligadas ao deck e à versão usados,
e transforma esses dados em três números por deck e em alertas do que treinar ou mudar.

- **Taxa de vitória geral** da versão atual.
- **Taxa de vitória esperada no Rio**, pesando cada confronto pelo quanto aquele deck é jogado.
- **Tendência** nas últimas 20 partidas: melhorando, estável ou piorando.

Além disso, o app guarda a **coleção** de cartas que você tem e diz sozinho se dá para montar o deck que está testando.

## Ciclo de uso

1. **Cadastrar o deck** e cada versão da lista (uma vez por versão).
2. **Jogar e registrar**: resultado, motivo, cartas.
3. **App calcula**: taxas, tendência, alertas.
4. **Painel mostra** os números e alertas ativos.
5. **Ajustar**: treinar ou mudar cartas. Mudou cartas? Vira uma nova versão.

## Telas

| Tela | Para que serve | O que mostra |
| --- | --- | --- |
| Painel | Ver em 10 segundos como o deck escolhido está indo | Contagem regressiva, os três números, curva por semana, alertas, se a coleção monta o deck |
| Registrar partida | Anotar uma partida em menos de 1 minuto | Deck, versão, oponente, jogos da melhor de 3, motivo da derrota, cartas que decidiram |
| Meus decks | Guardar vários decks e as versões de cada um | As 60 cartas de cada versão, o que entrou e saiu, resultado de cada versão |
| **Coleção** | Registrar as cartas que você tem | Lista da coleção, “posso montar?” para qualquer versão, o que falta |
| Comparar | Ver lado a lado o que funciona melhor | Dois decks ou duas versões: taxa geral, esperada e confrontos |
| Confrontos | Saber contra quem treinar | Taxa contra cada deck, fatia no meta, quantas partidas sustentam o número |
| Cartas | Achar cartas fracas ou que fazem falta | Vezes marcada como decisiva ou inútil, e em quais confrontos |
| Relatório da semana | Fechar a semana e decidir o próximo passo | Resumo dos 7 dias, comparação com a semana anterior, até 3 recomendações |
| Meta | Dar peso aos confrontos | Decks mais jogados e a fatia de cada um (Limitless TCG) |

## Dados registrados

- **Deck**: nome, versão atual, situação (testando, principal, arquivado).
- **Versão da lista**: número, data, cartas (nome, quantidade, tipo, coleção, número), mudanças (calculadas sozinhas), motivo da mudança.
- **Partida**: data, deck e versão, oponente, jogos 1–3 (V/D/E e quem começou), online/presencial, tempo acabou, motivo da derrota, cartas “grande”/“inútil”, nota.
- **Meta**: decks e fatia de cada um.
- **Coleção**: cartas (nome, quantidade, tipo, coleção, número).

## Cálculos

- **Taxa de vitória**: `(V + 0,5·E) / (V + D + E)` — empate conta meia vitória; cada melhor de 3 conta uma vez.
- **Taxa esperada**: `Σ fatia_d × taxa_d`. Só entram confrontos com 5+ partidas; os outros, e a parte do meta não listada, usam a taxa geral.
- **Confiança**: com menos de 10 partidas o número aparece em cinza com “amostra pequena”; ao lado de cada taxa aparece a faixa provável (intervalo de Wilson, 95%).
- **Tendência**: últimas 20 partidas contra as 20 anteriores (ou metades menores, mínimo 5). Diferença de 10 pontos ou mais = melhorando/piorando.
- **Comparações**: com menos de 15 partidas de um dos lados, aviso de amostra pequena.
- **Coleção**: primeiro usa a impressão exata (nome + coleção + número), depois outras impressões do mesmo nome. Energia básica de outra impressão conta como igual; Pokémon de outra impressão é sinalizado para conferir.

## Alertas

| Quando acontece | O app sugere |
| --- | --- |
| Confronto abaixo de 45% com 8+ partidas e 10%+ do meta | Treinar esse confronto e rever o plano de jogo |
| “Começo ruim” ou “faltou energia” em 25%+ das derrotas | Rever cartas de busca e a contagem de energias |
| Diferença de 15+ pontos entre começar em 1º e em 2º | Decidir antes do Rio o que escolher ao vencer a moeda |
| Tempo acabou em 15%+ das partidas | Treinar jogar mais rápido ou rever cartas que travam o turno |
| Versão nova 10+ pontos pior que a anterior, com 15+ partidas cada | Considerar voltar à versão anterior |
| Carta marcada como “inútil” em 3+ partidas | Candidata a sair na próxima versão |
| “Erro meu” em 30%+ das derrotas | O deck está bom; o foco é treino de jogo |

Os alertas de motivo de derrota só disparam a partir de 4 derrotas, para não reagir a uma partida só.
Todos os limites ficam em `src/lib/alerts.ts` (`THRESHOLDS`) e podem ser ajustados depois das primeiras semanas.
