import type { ReactNode } from 'react';
import { daysBetween, today } from '../../lib/format';

const TYPES = [
  { label: 'Fogo', color: 'var(--fire)' },
  { label: 'Água', color: 'var(--water)' },
  { label: 'Planta', color: 'var(--grass)' },
  { label: 'Elétrico', color: 'var(--lightning)' },
  { label: 'Psíquico', color: 'var(--psychic)' },
];

/** Moldura das telas de entrada: hero à esquerda, formulário à direita. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const days = daysBetween(today(), '2027-03-06');
  return (
    <div className="frame">
      <div className="auth-notch">
        <span className="notch" style={{ cursor: 'default' }}>
          <img src="./icon.svg" alt="" />
          Deck Review
        </span>
      </div>
      <div className="auth">
        <section className="auth-hero" aria-hidden="true">
          <h1>
            Seu deck pronto para o Regional<span className="dot">.</span>
          </h1>
          <p className="lead">Registre cada partida, acompanhe as versões da lista e saiba contra quem treinar — antes do torneio.</p>
          <div className="auth-hero-foot">
            <div className="auth-stat">
              {days > 0 ? (
                <>
                  <div className="big">{days}</div>
                  <div className="lbl">dias para o Regional do Rio</div>
                </>
              ) : (
                <>
                  <div className="big">60</div>
                  <div className="lbl">cartas, versão por versão</div>
                </>
              )}
            </div>
            <div className="type-tiles">
              {TYPES.map((t) => (
                <div key={t.label} className="type-tile" style={{ background: t.color }}>
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="auth-panel">
          <div className="auth-card">{children}</div>
        </section>
      </div>
    </div>
  );
}
