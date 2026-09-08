import { AlertTriangle, ArrowRight, CheckCircle2, Circle, XCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBuilderCatalog } from '../../hooks/useBuilderCatalog';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatTaka } from './buildConfig';
import { ADDON_CATEGORIES, COMPONENT_CATEGORIES } from './builderCatalog';
import {
  estimatePowerDraw,
  getBuildChecks,
  getCompatibilityScore,
  selectionFromPartIds,
  type BuildCheckStatus,
} from './compatibility';

export interface BuildDetails {
  name: string;
  purpose: string | null;
  total: number;
  partIds: string[];
  meta: string;
  description?: string | null;
}

interface BuildDetailsModalProps {
  build: BuildDetails | null;
  onClose: () => void;
}

const CHECK_ICON: Record<BuildCheckStatus, React.ReactNode> = {
  compatible: <CheckCircle2 className="w-4 h-4 text-success" />,
  warning: <AlertTriangle className="w-4 h-4 text-warning" />,
  incompatible: <XCircle className="w-4 h-4 text-danger" />,
  pending: <Circle className="w-4 h-4 text-text-muted" />,
};

/** Full breakdown of a library build: every part, compatibility checks and power estimate. */
export default function BuildDetailsModal({ build, onClose }: BuildDetailsModalProps) {
  const navigate = useNavigate();
  const { byId } = useBuilderCatalog();
  const selection = build ? selectionFromPartIds(build.partIds.join(','), byId) : {};
  const checks = getBuildChecks(selection);
  const score = getCompatibilityScore(checks);
  const draw = estimatePowerDraw(selection);
  const rows = [...COMPONENT_CATEGORIES, ...ADDON_CATEGORIES.filter((m) => selection[m.id])];

  return (
    <Modal
      open={!!build}
      onClose={onClose}
      title={build?.name}
      closeLabel="Close"
      className="max-w-2xl"
    >
      {build && (
        <div
          className="flex flex-col gap-5 max-h-[75vh] overflow-y-auto pr-2 -mr-2 custom-scrollbar"
          data-lenis-prevent
        >
          <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted">
            {build.purpose && <Badge variant="accent">{build.purpose}</Badge>}
            <span>{build.meta}</span>
          </div>
          {build.description && <p className="text-sm text-text-muted">{build.description}</p>}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-border bg-fill-subtle p-3">
              <div className="text-[11px] text-text-muted">Total</div>
              <div className="text-lg font-black text-accent">{formatTaka(build.total)}</div>
            </div>
            <div className="rounded-xl border border-border bg-fill-subtle p-3">
              <div className="text-[11px] text-text-muted">Compatibility</div>
              <div
                className={`text-lg font-black ${score === 100 ? 'text-success' : score >= 70 ? 'text-warning' : 'text-danger'}`}
              >
                {score}%
              </div>
            </div>
            <div className="rounded-xl border border-border bg-fill-subtle p-3">
              <div className="text-[11px] text-text-muted flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" /> Est. draw
              </div>
              <div className="text-lg font-black text-text-primary">~{draw}W</div>
            </div>
          </div>

          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {rows.map((meta) => {
                const part = selection[meta.id];
                return (
                  <tr key={meta.id}>
                    <td className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-text-muted w-28">
                      {meta.label}
                    </td>
                    {part ? (
                      <>
                        <td className="py-2 pr-3">
                          <div className="font-semibold text-text-primary">{part.name}</div>
                          <div className="text-xs text-text-muted">{part.keySpec}</div>
                        </td>
                        <td className="py-2 text-right font-bold text-accent whitespace-nowrap">
                          {formatTaka(part.price)}
                        </td>
                      </>
                    ) : (
                      <td colSpan={2} className="py-2 text-xs italic text-text-muted">
                        Not included
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              Compatibility checks
            </h4>
            <ul className="grid sm:grid-cols-2 gap-2">
              {checks.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-2 rounded-lg border border-border bg-fill-subtle px-3 py-2"
                >
                  <span className="mt-0.5 shrink-0">{CHECK_ICON[c.status]}</span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-text-primary">{c.label}</span>
                    <span className="block text-[11px] text-text-muted">{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="button-primary text-sm py-2.5 self-end"
            onClick={() => navigate(`/pc-builder?parts=${build.partIds.join(',')}`)}
          >
            Start from this build <ArrowRight size={15} />
          </button>
        </div>
      )}
    </Modal>
  );
}
