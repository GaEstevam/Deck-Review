import { Link } from 'react-router-dom';
import { daysBetween, fmtDate, today } from '../lib/format';
import { usePokemonInfo } from '../lib/pokeapi';
import { mainPokemon, TYPE_STYLE } from '../lib/pokemon';
import type { Deck, DeckVersion, Settings } from '../types';

/**
 * Faixa do evento no Painel: cor sólida do tipo do Pokémon principal do deck,
 * miniatura dele (ícone do Sword/Shield) e a contagem regressiva.
 */
export default function EventHero({ deck, version, settings }: { deck: Deck | null; version: DeckVersion | null; settings: Settings }) {
  const days = daysBetween(today(), settings.eventDate);
  const mon = deck ? mainPokemon(deck, version) : null;
  const info = usePokemonInfo(mon);
  const style = info?.type ? TYPE_STYLE[info.type] : null;

  return (
    <div className="hero" style={style ? { background: style.bg, color: style.fg } : undefined}>
      {mon && (
        <div className={`hero-mon${info?.icon ? '' : ' empty'}`} title={mon}>
          {info?.icon && <img src={info.icon} alt={mon} className={info.isMiniIcon ? 'mini' : ''} loading="lazy" />}
        </div>
      )}
      <div className="hero-text">
        <h2>
          {days > 0 ? `Rumo ao ${settings.eventName}` : days === 0 ? `Hoje é o ${settings.eventName}` : `${settings.eventName} encerrado`}
          <span className="hero-dot">.</span>
        </h2>
        <p>
          {days >= 0 ? fmtDate(settings.eventDate) : <Link to="/config">Definir o próximo evento</Link>}
          {deck ? ` · ${deck.name}${version ? ` v${version.number}` : ''}` : ''}
          {style ? ` · ${style.label}` : ''}
        </p>
      </div>
      {days > 0 && (
        <div className="hero-count">
          <div className="big num">{days}</div>
          <div className="hero-sub">{days === 1 ? 'dia restante' : 'dias restantes'}</div>
        </div>
      )}
    </div>
  );
}
