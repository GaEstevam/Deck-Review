import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cadastrar, entrarComEmail, entrarComGoogle, esqueciSenha, mensagemDeErro } from '../../firebase/auth';
import AuthLayout from './AuthLayout';

function GoogleButton({ onError }: { onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="block google-btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        onError('');
        try {
          await entrarComGoogle();
        } catch (e) {
          onError(mensagemDeErro(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <img src="./google.svg" alt="" /> Continuar com Google
    </button>
  );
}

export function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErro('');
    try {
      await entrarComEmail(email, senha);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h2>
        Entrar<span className="dot">.</span>
      </h2>
      <p className="sub">Seus decks, partidas e coleção, em qualquer aparelho.</p>
      <GoogleButton onError={setErro} />
      <div className="divider" style={{ margin: '16px 0' }}>
        ou com e-mail
      </div>
      <form onSubmit={submit}>
        <label>
          E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>
        {erro && <div className="notice err">{erro}</div>}
        <button className="primary block" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <div className="auth-links">
        <Link to="/esqueci-senha">Esqueci minha senha</Link>
        <span className="muted">
          Novo por aqui? <Link to="/cadastro">Criar conta</Link>
        </span>
      </div>
    </AuthLayout>
  );
}

export function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (senha !== confirma) return setErro('As senhas não conferem.');
    if (senha.length < 6) return setErro('Use pelo menos 6 caracteres na senha.');
    setBusy(true);
    setErro('');
    try {
      await cadastrar(nome, email, senha);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h2>
        Criar conta<span className="dot">.</span>
      </h2>
      <p className="sub">Cada conta tem os próprios decks e dados — ninguém mais vê.</p>
      <GoogleButton onError={setErro} />
      <div className="divider" style={{ margin: '16px 0' }}>
        ou com e-mail
      </div>
      <form onSubmit={submit}>
        <label>
          Nome
          <input autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como quer ser chamado" />
        </label>
        <label>
          E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <div className="field-row">
          <label>
            Senha
            <input type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
          </label>
          <label>
            Repita a senha
            <input type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} required />
          </label>
        </div>
        {erro && <div className="notice err">{erro}</div>}
        <button className="primary block" disabled={busy}>
          {busy ? 'Criando…' : 'Criar conta'}
        </button>
      </form>
      <div className="auth-links">
        <span className="muted">
          Já tem conta? <Link to="/login">Entrar</Link>
        </span>
      </div>
    </AuthLayout>
  );
}

export function EsqueciSenha() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErro('');
    try {
      await esqueciSenha(email);
      setEnviado(true);
    } catch (err) {
      const code = (err as { code?: string }).code;
      // não revela se o e-mail existe ou não
      if (code === 'auth/user-not-found') setEnviado(true);
      else setErro(mensagemDeErro(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h2>
        Esqueci minha senha<span className="dot">.</span>
      </h2>
      <p className="sub">Enviamos um link para você criar uma senha nova.</p>
      {enviado ? (
        <>
          <div className="notice ok">
            Se existir uma conta com <b>{email}</b>, o e-mail de redefinição chega em alguns minutos. Confira também o spam.
          </div>
          <button className="primary block" style={{ marginTop: 16 }} onClick={() => navigate('/login')}>
            Voltar para o login
          </button>
        </>
      ) : (
        <form onSubmit={submit}>
          <label>
            E-mail da conta
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {erro && <div className="notice err">{erro}</div>}
          <button className="primary block" disabled={busy}>
            {busy ? 'Enviando…' : 'Enviar link'}
          </button>
        </form>
      )}
      <div className="auth-links">
        <Link to="/login">← Voltar para o login</Link>
      </div>
    </AuthLayout>
  );
}

/** Mostrado quando src/firebase/config.ts ainda não foi preenchido. */
export function NaoConfigurado() {
  return (
    <AuthLayout>
      <h2>
        Falta configurar o Firebase<span className="dot">.</span>
      </h2>
      <p className="sub">
        Cole o <code>firebaseConfig</code> do seu projeto em <code>src/firebase/config.ts</code> e publique de novo. O passo a passo está em{' '}
        <code>docs/firebase.md</code>.
      </p>
    </AuthLayout>
  );
}
