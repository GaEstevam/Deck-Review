import { Link } from 'react-router-dom';
import type { OwnershipReport } from '../lib/collection';
import { plural } from '../lib/format';

/** Resumo de uma linha: dá para montar o deck com a coleção? */
export default function OwnershipSummary({ report, hasCollection, link = true }: { report: OwnershipReport; hasCollection: boolean; link?: boolean }) {
  if (!hasCollection) {
    return (
      <span className="small muted">
        Coleção vazia — {link ? <Link to="/colecao">registre suas cartas</Link> : 'registre suas cartas'} para saber se consegue montar.
      </span>
    );
  }
  if (report.exactBuildable) return <span className="badge good">Você tem todas as {report.needed} cartas</span>;
  if (report.buildable)
    return (
      <span className="badge warn" title="Algumas cartas estão em outra impressão do mesmo nome">
        Dá para montar · {plural(report.alt, 'carta', 'cartas')} em outra impressão
      </span>
    );
  return <span className="badge bad">Faltam {plural(report.missing, 'carta', 'cartas')}</span>;
}
