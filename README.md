# Deck Review

App web para responder, toda semana, a uma pergunta: **meu deck de Pokémon TCG está pronto para o Regional?**

Guarda vários decks com as suas versões, registra cada partida (melhor de 3), calcula a taxa de vitória geral,
a **taxa esperada no evento** (ponderada pelo meta) e a tendência, e mostra alertas do que treinar ou mudar.
Tem também uma aba **Coleção** para registrar as cartas que você tem e conferir sozinho se dá para montar o deck.

O plano completo está em [`docs/plano.md`](docs/plano.md).

## Telas

Painel · Registrar partida · Meus decks · Coleção · Confrontos · Cartas · Comparar · Relatório da semana · Meta · Configurações

## Onde ficam os dados

- **No navegador** (localStorage) — funciona sem conta e sem servidor.
- **Sincronização opcional entre aparelhos**: em *Configurações*, cole um token do GitHub com escopo `gist`.
  O app guarda tudo em um **Gist privado** na sua conta (`deck-review-data.json`). No celular, cole o mesmo token.
  O token fica só no aparelho; nada vai para este repositório.
- **Backup**: *Configurações → Baixar backup (.json)*.

## Estrutura

```
Deck-Review/
├── .github/
│   └── workflows/
│       └── deploy.yml          # testes + build + publicação no GitHub Pages
├── docs/
│   └── plano.md                # objetivo, telas, dados, cálculos e alertas
├── public/
│   ├── icon.svg
│   └── manifest.webmanifest    # permite "Adicionar à tela inicial" no celular
├── src/
│   ├── components/             # peças de interface reutilizadas
│   │   ├── AlertList.tsx
│   │   ├── DeckScopeBar.tsx    # escolha de deck e recorte (versão atual / deck inteiro)
│   │   ├── DecklistInput.tsx   # caixa para colar a lista do TCG Live
│   │   ├── DecklistView.tsx    # lista agrupada por tipo, com o que você tem
│   │   ├── Layout.tsx          # navegação lateral (PC) e abas (celular)
│   │   ├── OwnershipSummary.tsx
│   │   ├── WeeklyChart.tsx
│   │   └── ui.tsx
│   ├── lib/                    # regras e cálculos, sem interface (testados)
│   │   ├── alerts.ts           # alertas e seus limites (THRESHOLDS)
│   │   ├── collection.ts       # "posso montar?" e junção de cartas na coleção
│   │   ├── decklist.ts         # leitura/escrita do formato TCG Live e diferenças entre versões
│   │   ├── format.ts
│   │   ├── labels.ts
│   │   ├── meta.ts
│   │   └── stats.ts            # taxas, faixa provável, taxa esperada, tendência
│   ├── pages/                  # uma tela por arquivo
│   │   ├── Painel.tsx
│   │   ├── RegistrarPartida.tsx
│   │   ├── MeusDecks.tsx
│   │   ├── DeckDetalhe.tsx
│   │   ├── Colecao.tsx
│   │   ├── Confrontos.tsx
│   │   ├── Cartas.tsx
│   │   ├── Comparar.tsx
│   │   ├── Relatorio.tsx
│   │   ├── Meta.tsx
│   │   └── Config.tsx
│   ├── store/                  # dados do app
│   │   ├── store.ts            # estado + localStorage
│   │   ├── actions.ts          # criar deck, versão, partida, coleção…
│   │   ├── selection.ts        # deck selecionado e recortes de partidas
│   │   └── sync.ts             # sincronização com Gist privado
│   ├── styles/
│   │   └── global.css
│   ├── types/
│   │   └── index.ts            # modelo de dados
│   ├── App.tsx                 # rotas
│   └── main.tsx
├── tests/                      # testes dos cálculos (Vitest)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Rodar no computador

Requer Node.js 20+.

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm test         # testes dos cálculos
npm run build    # gera a versão de produção em dist/
```

## Publicação

Cada `push` na branch `main` roda os testes, gera o build e publica no **GitHub Pages**
(workflow em `.github/workflows/deploy.yml`). Na primeira vez, em *Settings → Pages* do repositório,
a fonte deve estar como **GitHub Actions**.

## Formato da lista

O mesmo que o TCG Live exporta:

```
Pokémon: 12
4 Dreepy TWM 128
...
Trainer: 36
4 Ultra Ball SVI 196
...
Energy: 12
6 Basic {R} Energy SVE 2
```

Linhas sem coleção/número (`4 Ultra Ball`) também funcionam.
