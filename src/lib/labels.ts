import type { CardType, DeckStatus, LossReason, Venue } from '../types';

export const LOSS_REASONS: { value: LossReason; label: string }[] = [
  { value: 'comeco_ruim', label: 'Começo ruim' },
  { value: 'faltou_energia', label: 'Faltou energia' },
  { value: 'confronto_ruim', label: 'Confronto ruim' },
  { value: 'erro_meu', label: 'Erro meu' },
  { value: 'sorte', label: 'Sorte' },
  { value: 'tempo', label: 'Tempo' },
];

export function lossReasonLabel(r: LossReason | null): string {
  return LOSS_REASONS.find((x) => x.value === r)?.label ?? '—';
}

export const STATUS_LABEL: Record<DeckStatus, string> = {
  testando: 'Testando',
  principal: 'Principal',
  arquivado: 'Arquivado',
};

export const TYPE_LABEL: Record<CardType, string> = {
  pokemon: 'Pokémon',
  treinador: 'Treinador',
  energia: 'Energia',
};

export const TYPE_ORDER: CardType[] = ['pokemon', 'treinador', 'energia'];

export const VENUE_LABEL: Record<Venue, string> = {
  online: 'Online',
  presencial: 'Presencial',
};
