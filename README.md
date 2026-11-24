# Deck Review

App web para responder, toda semana, a uma pergunta: **meu deck de Pokémon TCG está pronto para o Regional?**

Guarda vários decks com as suas versões, registra cada partida (melhor de 3), calcula a taxa de vitória geral,
a **taxa esperada no evento** (ponderada pelo meta) e a tendência, e mostra alertas do que treinar ou mudar.
Tem também uma aba **Coleção** para registrar as cartas que você tem e conferir sozinho se dá para montar o deck.

O plano completo está em [`docs/plano.md`](docs/plano.md).

## Telas

Painel · Registrar partida · Meus decks · Coleção · Confrontos · Cartas · Comparar · Relatório da semana · Meta · Configurações

## Login e dados

- **Login** com e-mail e senha ou conta Google (Firebase Authentication), com cadastro, "esqueci minha senha" e sair.
  Sem login, só as telas de entrada aparecem.
- **Dados por usuário** no Cloud Firestore, em `usuarios/{uid}/...` (decks, versões, partidas, coleção, meta e preferências).
- **Isolamento garantido pelo servidor**: as regras em [`firestore.rules`](firestore.rules) só deixam cada usuário ler e escrever o próprio `usuarios/{uid}`.
- **Funciona sem internet**: o Firestore guarda uma cópia local e sincroniza quando a conexão volta.
- O SDK web modular do Firebase vem do CDN oficial (gstatic), sem passar pelo pacote do site.

Configuração do console do Firebase, explicação das regras e como testar: [`docs/firebase.md`](docs/firebase.md).

## Estrutura

```
Deck-Review/
├── .github/
│   └── workflows/
│       └── deploy.yml          # testes + build + publicação no GitHub Pages
├── docs/
│   ├── firebase.md             # passo a passo do console, regras explicadas, testes
│   └── plano.md                # objetivo, telas, dados, cálculos e alertas
├── public/
│   ├── icon.svg
│   └── manifest.webmanifest    # permite "Adicionar à tela inicial" no celular
├── src/
│   ├── auth/
│   │   └── session.tsx         # usuário logado + liga/desliga os dados dele
│   ├── firebase/               # tudo que fala com o Firebase
│   │   ├── config.ts           # firebaseConfig (público) — preencha com o do seu projeto
│   │   ├── sdk.ts              # inicializa o SDK vindo do CDN (+ emuladores)
│   │   ├── auth.ts             # entrar, cadastrar, Google, esqueci a senha, sair
│   │   ├── db.ts               # leitura em tempo real e gravação em lotes
│   │   └── diff.ts             # o que mudou entre dois estados (testado)
│   ├── components/             # peças de interface reutilizadas
│   │   ├── AlertList.tsx
│   │   ├── DeckScopeBar.tsx    # escolha de deck e recorte (versão atual / deck inteiro)
│   │   ├── DecklistInput.tsx   # caixa para colar a lista do TCG Live
│   │   ├── DecklistView.tsx    # lista agrupada por tipo, com o que você tem
│   │   ├── Layout.tsx          # moldura, aba central com logo, navegação em pílulas
│   │   ├── MigrationBanner.tsx # oferece importar os dados antigos do navegador
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
│   │   ├── auth/               # entrar, criar conta, esqueci minha senha
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
│   │   ├── store.ts            # estado em memória espelhando o Firestore
│   │   ├── actions.ts          # criar deck, versão, partida, coleção…
│   │   ├── selection.ts        # deck selecionado e recortes de partidas
│   │   └── legacy.ts           # dados da versão antiga (sem login) para importar
│   ├── styles/
│   │   └── global.css
│   ├── types/
│   │   ├── firebase-cdn.d.ts   # tipos para os módulos do CDN
│   │   └── index.ts            # modelo de dados
│   ├── App.tsx                 # rotas
│   └── main.tsx
├── tests/                      # testes dos cálculos (Vitest)
│   └── rules/                  # testes das regras do Firestore (emulador)
├── firebase.json               # regras + emuladores
├── firestore.rules             # Regras de Segurança do Firestore
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
npm run test:regras   # testes das regras no emulador (precisa de Java 21+)
npm run emuladores    # Auth + Firestore locais
npm run dev:emulador  # app ligado aos emuladores
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
