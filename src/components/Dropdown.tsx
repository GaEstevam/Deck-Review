import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}
export interface DropdownGroup<T extends string> {
  label: string;
  options: DropdownOption<T>[];
}

type Items<T extends string> = DropdownOption<T>[] | DropdownGroup<T>[];

function isGrouped<T extends string>(items: Items<T>): items is DropdownGroup<T>[] {
  return items.length > 0 && 'options' in items[0];
}

/**
 * Lista suspensa com o visual do app (o <select> nativo abre a lista do sistema, sem estilo).
 * Teclado: Enter/Espaço/↓ abre, ↑↓ navega, Enter escolhe, Esc fecha, letras pulam para a opção.
 */
export default function Dropdown<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  block = false,
  placeholder = 'Escolher…',
}: {
  value: T;
  onChange: (v: T) => void;
  options: Items<T>;
  ariaLabel?: string;
  block?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const flat = useMemo(() => (isGrouped(options) ? options.flatMap((g) => g.options) : options), [options]);
  const selectedIndex = flat.findIndex((o) => o.value === value);
  const selected = flat[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openList = () => {
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  };
  const choose = (i: number) => {
    const o = flat[i];
    if (o) onChange(o.value);
    setOpen(false);
  };

  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : flat.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const start = (active + 1) % flat.length;
      const order = [...flat.slice(start), ...flat.slice(0, start)];
      const hit = order.find((o) => o.label.toLowerCase().startsWith(k));
      if (hit) setActive(flat.indexOf(hit));
    }
  };

  let i = -1;
  const renderOption = (o: DropdownOption<T>) => {
    i++;
    const idx = i;
    return (
      <li
        key={o.value}
        id={`${id}-o${idx}`}
        data-i={idx}
        role="option"
        aria-selected={o.value === value}
        className={`dd-option${idx === active ? ' active' : ''}${o.value === value ? ' selected' : ''}`}
        onMouseEnter={() => setActive(idx)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => choose(idx)}
      >
        <span>{o.label}</span>
        {o.hint && <span className="dd-hint">{o.hint}</span>}
        {o.value === value && <span className="dd-check">✓</span>}
      </li>
    );
  };

  return (
    // preventDefault: dentro de um <label>, o clique numa opção não deve "clicar" o botão de novo
    <div className={`dd${block ? ' block' : ''}`} ref={root} onClick={(e) => e.preventDefault()}>
      <button
        type="button"
        className="dd-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-o${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
      >
        <span className={selected ? '' : 'faint'}>{selected?.label ?? placeholder}</span>
        <svg className="dd-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="dd-list" role="listbox" id={`${id}-list`} ref={list} aria-label={ariaLabel}>
          {isGrouped(options)
            ? options.map((g) => (
                <li key={g.label} role="presentation">
                  <div className="dd-group">{g.label}</div>
                  <ul role="group" aria-label={g.label}>
                    {g.options.map(renderOption)}
                  </ul>
                </li>
              ))
            : options.map(renderOption)}
        </ul>
      )}
    </div>
  );
}
