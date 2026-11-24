import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import { saveProfile } from './db';
import { getFirebaseAuth } from './sdk';

export type { User };

export function watchAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), cb);
}

export async function entrarComEmail(email: string, senha: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), senha);
}

export async function cadastrar(nome: string, email: string, senha: string): Promise<void> {
  const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), senha);
  if (nome.trim()) {
    await updateProfile(cred.user, { displayName: nome.trim() });
    // o perfil no Firestore foi criado no instante do login, ainda sem o nome
    await saveProfile(cred.user.uid, { nome: nome.trim(), email: cred.user.email ?? '' });
  }
}

export async function entrarComGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(getFirebaseAuth(), provider);
}

export async function esqueciSenha(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

export async function sair(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Traduz os códigos de erro do Firebase Auth. */
export function mensagemDeErro(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/missing-email': 'Informe o e-mail.',
    'auth/missing-password': 'Informe a senha.',
    'auth/email-already-in-use': 'Já existe uma conta com este e-mail. Entre ou use "Esqueci minha senha".',
    'auth/weak-password': 'Senha fraca: use pelo menos 6 caracteres.',
    'auth/password-does-not-meet-requirements': 'A senha não atende aos requisitos do projeto.',
    'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com a internet.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
    'auth/cancelled-popup-request': 'A janela do Google foi fechada antes de terminar.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups para este site.',
    'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase (Authentication → Configurações → Domínios autorizados).',
    'auth/operation-not-allowed': 'Este método de login não está ativado no console do Firebase.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'auth/account-exists-with-different-credential': 'Este e-mail já usa outro método de login. Entre com e-mail e senha.',
  };
  return map[code] ?? `Não foi possível concluir (${code || 'erro desconhecido'}).`;
}
