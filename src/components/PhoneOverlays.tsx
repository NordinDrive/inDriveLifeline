import { AlertTriangle, CheckCircle2, CloudLightning, Flame, Info, Waves, X } from 'lucide-react';
import { useDemo, type ToastTarget } from '../app/store';
import { DISTRICTS } from '../data/mockLocations';
import { SCENARIO_TEMPLATES, SEVERITY_LABEL } from '../data/mockScenarios';
import { shortTime } from '../domain/labels';
import type { DisasterType } from '../domain/types';

export const DISASTER_ICON: Record<DisasterType, typeof Waves> = {
  earthquake: AlertTriangle,
  flood: Waves,
  wildfire: Flame,
  storm: CloudLightning,
};

/** In-phone notification banners (drop down from the top like system banners). */
export function PhoneToasts({ target }: { target: ToastTarget }) {
  const toasts = useDemo((s) => s.toasts.filter((t) => t.target === target));
  const dismiss = useDemo((s) => s.dismissToast);
  return (
    <div className="phone-toasts" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`phone-toast tone-${t.tone}`} onClick={() => dismiss(t.id)}>
          {t.tone === 'success' ? <CheckCircle2 size={18} /> : t.tone === 'danger' || t.tone === 'warn' ? <AlertTriangle size={18} /> : <Info size={18} />}
          <span>{t.message}</span>
        </button>
      ))}
    </div>
  );
}

/** Simulated disaster alert sheet. Clearly labeled and never flashing. */
export function AlertSheet({
  role,
  hidden,
  seenRevision,
  onDismiss,
  primary,
}: {
  role: 'passenger' | 'driver';
  /** E.g. the passenger is outside the selected area. */
  hidden?: boolean;
  seenRevision: number;
  onDismiss: () => void;
  primary: { label: string; onClick: () => void };
}) {
  const d = useDemo((s) => s.domain.disaster);
  if (hidden || d.status !== 'active' || seenRevision >= d.revision) return null;
  const Icon = DISASTER_ICON[d.type];
  return (
    <div className="alert-sheet-wrap" role="alertdialog" aria-labelledby={`alert-title-${role}`}>
      <div className="alert-sheet-scrim" onClick={onDismiss} />
      <div className={`alert-sheet sev-${d.severity}`}>
        <button className="alert-close" onClick={onDismiss} aria-label="Dismiss alert"><X size={20} /></button>
        <div className="alert-head">
          <span className="alert-icon"><Icon size={26} /></span>
          <div>
            <h3 id={`alert-title-${role}`}>Disaster alert</h3>
            <p>{d.name}</p>
          </div>
        </div>
        <dl className="alert-facts">
          <div><dt>Type</dt><dd>{SCENARIO_TEMPLATES[d.type].label}</dd></div>
          <div><dt>Area</dt><dd>{DISTRICTS[d.districtId].label}</dd></div>
          <div><dt>Severity</dt><dd>{SEVERITY_LABEL[d.severity]}</dd></div>
          <div><dt>Scenario time</dt><dd>{shortTime(d.activatedAt)}</dd></div>
        </dl>
        <p className="alert-copy">
          {role === 'passenger'
            ? 'Lifeline is now open in your area. You can request transport from a designated pickup point to an approved shelter. Lifeline is not a rescue or ambulance service.'
            : 'Verified volunteers who are available can accept approved shelter transport on approved routes. Never enter the affected zone. You can decline any mission without penalty.'}
        </p>
        <button className="btn-lime" onClick={primary.onClick}>{primary.label}</button>
        <button className="btn-ghost" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}

/** Compact always-visible strip while a scenario is active. */
export function AlertStrip({ onClick }: { onClick?: () => void }) {
  const d = useDemo((s) => s.domain.disaster);
  if (d.status !== 'active') return null;
  const Icon = DISASTER_ICON[d.type];
  return (
    <button className={`alert-strip sev-${d.severity}`} onClick={onClick}>
      <Icon size={18} />
      <span>
        <strong>{SCENARIO_TEMPLATES[d.type].label}</strong> · {DISTRICTS[d.districtId].label} · {SEVERITY_LABEL[d.severity]}
      </span>
    </button>
  );
}

/** Harmless panel for existing menu entries that are outside the prototype. */
export function InfoSheet({ title, onClose }: { title?: string; onClose: () => void }) {
  if (!title) return null;
  return (
    <div className="info-sheet-wrap">
      <div className="alert-sheet-scrim" onClick={onClose} />
      <div className="info-sheet">
        <div className="info-grabber" />
        <h3>{title}</h3>
        <p>This inDrive section is not part of Lifeline.</p>
        <button className="btn-lime" onClick={onClose}>OK</button>
      </div>
    </div>
  );
}
