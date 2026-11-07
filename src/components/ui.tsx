import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Tone } from '../domain/types';

export function Badge({ tone = 'info', children }: { tone?: Tone | 'lime' | 'muted'; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function ScreenHeader({ title, onBack, right, subtitle }: { title: string; onBack: () => void; right?: ReactNode; subtitle?: string }) {
  return (
    <header className="screen-header">
      <button className="round-btn" onClick={onBack} aria-label="Back">
        <ArrowLeft size={22} strokeWidth={2} />
      </button>
      <div className="screen-header-titles">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function Reasons({ reasons, title = 'Unavailable because' }: { reasons: string[]; title?: string }) {
  if (!reasons.length) return null;
  return (
    <div className="reasons" role="note">
      <strong>{title}</strong>
      <ul>
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

export function DemoTag({ children = 'Demo data' }: { children?: ReactNode }) {
  return <span className="demo-tag">{children}</span>;
}
