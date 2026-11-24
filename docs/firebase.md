# Login e dados por usuário com Firebase

O app continua 100% estático no GitHub Pages. O navegador fala direto com o Firebase:

- **Firebase Authentication**: e-mail e senha, conta Google, "esqueci minha senha".
- **Cloud Firestore**: os dados de cada pessoa ficam em `usuarios/{uid}/...`.
- **Regras de Segurança** (`firestore.rules`): o servidor do Google só deixa cada usuário ler e escrever o próprio `usuarios/{uid}`.
  Mesmo que alguém altere o código do site no navegador, as regras continuam valendo.

O SDK web modular do Firebase é carregado do CDN oficial (`https://www.gstatic.com/firebasejs/13.4.0/...`).
Ele não entra no pacote do site (o build do Vite o deixa de fora). O pacote `firebase` do npm serve só para os tipos do TypeScript.

## Onde ficam os dados

```
usuarios/{uid}                       nome, e-mail, último acesso
usuarios/{uid}/decks/{deckId}
usuarios/{uid}/versoes/{versaoId}    lista de 60 cartas de cada versão
usuarios/{uid}/partidas/{partidaId}
usuarios/{uid}/colecao/{cartaId}
usuarios/{uid}/config/meta
usuarios/{uid}/config/preferencias   evento alvo, deck selecionado…
```

O app guarda uma cópia local (cache do Firestore). Por isso abre rápido, funciona sem internet e sincroniza quando a conexão volta.

## Passo a passo no console do Firebase

### 1. Criar o projeto
1. Abra <https://console.firebase.google.com> e clique em **Criar um projeto** (ou *Adicionar projeto*).
2. Dê um nome (ex.: `deck-review`). O Google Analytics é opcional e o app não usa.

### 2. Registrar o app da Web e copiar a configuração
1. Na página inicial do projeto, clique no ícone **Web** (`</>`).
2. Apelido: `Deck Review`. **Não** marque "Firebase Hosting" (o site fica no GitHub Pages).
3. Copie o objeto `firebaseConfig` mostrado e cole os valores em **`src/firebase/config.ts`**, no lugar de `COLE_AQUI`.
   Dá para ver de novo depois em ⚙️ **Configurações do projeto → Geral → Seus apps**.

### 3. Ativar o Authentication
1. Menu **Criação → Authentication → Vamos começar**.
2. Aba **Método de login**:
   - **E-mail/senha** → Ativar → Salvar. Deixe "Link do e-mail (login sem senha)" desligado.
   - **Google** → Ativar → escolha o *e-mail de suporte do projeto* → Salvar.
3. Opcional: em **Templates**, troque o idioma dos e-mails para Português e personalize o e-mail de redefinição de senha.

### 4. Autorizar o domínio do GitHub Pages
1. **Authentication → Configurações → Domínios autorizados → Adicionar domínio**.
2. Adicione: `gaestevam.github.io` (só o domínio, sem `https://` e sem `/Deck-Review`).
3. `localhost` já vem na lista, e serve para testar no seu computador.

Sem esse passo, o login com Google falha com "domínio não autorizado".

### 5. Criar o Cloud Firestore
1. Menu **Criação → Firestore Database → Criar banco de dados**.
2. Local: `southamerica-east1 (São Paulo)`, o mais perto de você. Não dá para mudar depois.
3. Modo: **produção** (tudo bloqueado). As regras do passo 6 liberam só o necessário.

### 6. Publicar as regras de segurança
**Opção A, pelo console:** Firestore → aba **Regras** → apague o conteúdo, cole todo o arquivo `firestore.rules` → **Publicar**.

**Opção B, pela linha de comando** (já está no projeto):
```powershell
npx firebase login
npx firebase use --add        # escolha o projeto criado no passo 1
npm run deploy:regras
```

### 7. Publicar o site
Faça commit e push de `src/firebase/config.ts` na `main`. O GitHub Actions publica em <https://gaestevam.github.io/Deck-Review/>.

## O que cada regra faz (`firestore.rules`)

| Trecho | O que garante |
| --- | --- |
| `rules_version = '2'` | Usa a versão atual da linguagem de regras. |
| `function ehDono(uid)` | Só é verdadeiro se há alguém logado (`request.auth != null`) **e** o `uid` do caminho é o dessa pessoa. É o coração do isolamento. |
| `function colecaoPermitida(nome)` | Lista as subcoleções que o app usa (`decks`, `versoes`, `partidas`, `colecao`, `config`). |
| `match /usuarios/{uid}` + `allow read, write: if ehDono(uid)` | O documento de perfil só pode ser lido e alterado pelo próprio usuário. |
| `match /{colecao}/{docId}` + `allow read: if ehDono(uid)` | Ler qualquer dado do app (decks, partidas…) exige ser o dono. |
| `allow create, update: if ehDono(uid) && colecaoPermitida(colecao) && …keys().size() <= 50` | Gravar exige ser o dono, numa subcoleção conhecida, com no máximo 50 campos. Isso impede criar "lixo" em caminhos aleatórios ou documentos gigantes. |
| `allow delete: if ehDono(uid)` | Só o dono apaga os próprios dados. |
| (nada mais) | No Firestore, o que não é permitido é proibido. Por isso ninguém lista a coleção `usuarios` inteira, e qualquer caminho fora de `usuarios/{uid}` é recusado, inclusive para quem não está logado. Caminhos mais fundos (ex.: `usuarios/{uid}/decks/x/outra/y`) também são recusados. |

## Como provar que um usuário não vê os dados de outro

### 1. Testes automáticos das regras (no seu computador)
Requer Java 21+ (o emulador do Firestore usa Java).
```powershell
npm run test:regras
```
Esse comando sobe o emulador do Firestore com o seu `firestore.rules` e confere, entre outras coisas, que:
- a Ana lê e grava em `usuarios/ana/...`;
- o Bruno, logado, **não** lê, não altera e não apaga nada em `usuarios/ana/...`;
- ninguém lista `usuarios`, e quem não está logado não acessa nada.

### 2. No Rules Playground do console
Firestore → **Regras** → **Playground de regras**:
1. Tipo `get`, local `/usuarios/UID_DA_ANA/decks/qualquer`.
2. Ative **Autenticado** e, em *Firebase UID*, coloque um uid **diferente** (ex.: `outra-pessoa`).
3. **Executar** → deve aparecer **Negado**. Troque o UID para o da Ana → **Permitido**.

### 3. No site de verdade, com duas contas
1. Crie a conta A e cadastre um deck. Em **Authentication → Usuários**, copie o UID da conta A.
2. Saia e entre com a conta B (outro e-mail, ou janela anônima). B não vê nada de A, porque o app só busca `usuarios/{uid de B}`.
3. Agora tente "burlar" pelo navegador, logado como B. Abra o console do navegador (F12) e rode o código abaixo, trocando `UID_DA_CONTA_A`:
   ```js
   const { getFirestore, doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js');
   const { getApp } = await import('https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js');
   const db = getFirestore(getApp());
   await getDoc(doc(db, 'usuarios/UID_DA_CONTA_A')).catch(e => e.code);                          // 'permission-denied'
   await setDoc(doc(db, 'usuarios/UID_DA_CONTA_A/decks/x'), { name: 'intruso' }).catch(e => e.code); // 'permission-denied'
   ```
   As duas linhas devem responder `permission-denied`. É o servidor recusando, não o site.

## Rodar tudo localmente sem tocar no projeto real (emuladores)

```powershell
npm run emuladores        # Auth + Firestore + painel em http://127.0.0.1:4000
```
```powershell
npm run dev:emulador      # app em http://localhost:5173 conectado aos emuladores
```
Nos emuladores, contas e dados são de mentira e somem ao parar. O login com Google abre uma tela de teste do próprio emulador.

## Dados antigos (antes do login)
Se o navegador tinha dados da versão anterior, o Painel mostra **"Encontramos dados salvos neste aparelho"**.
Clique em **Importar para minha conta** para enviar tudo ao Firestore. Os dados antigos continuam no navegador como cópia de segurança.
A mesma opção fica em **Configurações → Dados antigos deste aparelho**. Também dá para usar **Configurações → Importar backup** com um `.json` baixado antes.
