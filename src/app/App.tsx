import { HeartHandshake, MonitorPlay, Moon, PanelRight, RotateCcw, Route, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GuidedDemo } from '../components/GuidedDemo';
import { DriverApp } from '../driver/DriverApp';
import { OperatorPanel } from '../operator/OperatorPanel';
import { PassengerApp } from '../passenger/PassengerApp';
import { useDemo } from './store';

type View = 'all' | 'passenger' | 'driver' | 'operator';

function readView(): View {
  const v = new URLSearchParams(window.location.search).get('view') ?? window.location.hash.replace('#', '');
  return v === 'passenger' || v === 'driver' || v === 'operator' ? v : 'all';
}

const PHONE_W = 414;
const PHONE_H = 868;
const OPERATOR_W = 440;

/** Scales the phones so two of them plus the operator fit any desktop viewport. */
function useStageScale(view: View, presentation: boolean, guideOpen: boolean) {
  const [state, setState] = useState({ scale: 1, layout: 'wide' as 'wide' | 'drawer' | 'single' });
  useEffect(() => {
    const calc = () => {
      const w = document.documentElement.clientWidth || window.innerWidth;
      const h = window.innerHeight;
      const chrome = (presentation ? 44 : 60) + (guideOpen && view === 'all' ? 58 : 0) + 34 + 40;
      const layout = view !== 'all' ? 'single' : w >= 1180 ? 'wide' : w >= 820 ? 'drawer' : 'single';
      const phones = layout === 'single' ? 1 : 2;
      const availW = w - (layout === 'wide' ? OPERATOR_W + 40 : 0) - 48 - (phones - 1) * 32;
      const byW = availW / (phones * PHONE_W);
      const byH = (h - chrome) / PHONE_H;
      setState({ scale: Math.max(0.5, Math.min(byW, byH, 1.15)), layout });
    };
    calc();
    // ResizeObserver also catches viewport changes that don't fire window resize (e.g. device emulation).
    const ro = new ResizeObserver(calc);
    ro.observe(document.documentElement);
    window.addEventListener('resize', calc);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', calc);
    };
  }, [view, presentation, guideOpen]);
  return state;
}

export function App() {
  const [view] = useState(readView);
  const stage = useDemo((s) => s.ui.stage);
  const setUi = useDemo((s) => s.setUi);
  const reset = useDemo((s) => s.resetDemo);
  const disaster = useDemo((s) => s.domain.disaster);
  const stageToasts = useDemo((s) => s.toasts.filter((t) => t.target === 'stage' || t.target === 'operator'));
  const [drawer, setDrawer] = useState(false);
  const { scale, layout } = useStageScale(view, stage.presentation, stage.guideOpen);

  useEffect(() => {
    document.documentElement.style.setProperty('--phone-scale', String(scale));
  }, [scale]);

  // One shared theme for all three views; it lives in synced UI state so other tabs follow.
  useEffect(() => {
    document.documentElement.dataset.theme = stage.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', stage.theme === 'light' ? '#f4f5f7' : '#0b0c0e');
  }, [stage.theme]);

  const showPassenger = view === 'passenger' || (view === 'all' && (layout !== 'single' || stage.mobileView === 'passenger'));
  const showDriver = view === 'driver' || (view === 'all' && (layout !== 'single' || stage.mobileView === 'driver'));
  const operatorInline = view === 'operator' || (view === 'all' && (layout === 'wide' || (layout === 'single' && stage.mobileView === 'operator')));

  return (
    <div className={`stage stage--${layout} ${stage.presentation ? 'is-presenting' : ''} view-${view}`}>
      <header className="stage-head">
        <div className="brand">
          <span className="brand-mark"><HeartHandshake size={18} /></span>
          <strong>inDrive Lifeline</strong>
          <span className="brand-sub">Interactive Demo</span>
        </div>
        <div className={`stage-scenario ${disaster.status === 'active' ? 'is-active' : ''}`}>
          <Route size={15} />
          {disaster.status === 'active' ? disaster.name : disaster.status === 'resolved' ? 'Scenario resolved' : 'Lifeline inactive'}
        </div>
        <div className="stage-actions">
          <div className="theme-toggle" role="radiogroup" aria-label="Theme">
            {(['light', 'dark'] as const).map((t) => (
              <button key={t} role="radio" aria-checked={stage.theme === t} className={stage.theme === t ? 'is-on' : ''} onClick={() => setUi('stage', { theme: t })}>
                {t === 'light' ? <Sun size={15} /> : <Moon size={15} />}
                <span>{t === 'light' ? 'Light' : 'Dark'}</span>
              </button>
            ))}
          </div>
          {view === 'all' && (
            <button className={stage.guideOpen ? 'is-on' : ''} onClick={() => setUi('stage', { guideOpen: !stage.guideOpen })}>Guided Demo</button>
          )}
          <button className={stage.presentation ? 'is-on' : ''} onClick={() => setUi('stage', { presentation: !stage.presentation })}>
            <MonitorPlay size={16} /> <span>Present</span>
          </button>
          {layout === 'drawer' && (
            <button className={drawer ? 'is-on' : ''} onClick={() => setDrawer(!drawer)}><PanelRight size={16} /> <span>Admin</span></button>
          )}
          <button onClick={reset}><RotateCcw size={16} /> <span>Reset Demo</span></button>
        </div>
      </header>

      {view === 'all' && stage.guideOpen && <GuidedDemo />}

      {layout === 'single' && view === 'all' && (
        <div className="view-switch" role="tablist">
          {(['passenger', 'driver', 'operator'] as const).map((v) => (
            <button key={v} role="tab" aria-selected={stage.mobileView === v} className={stage.mobileView === v ? 'is-on' : ''} onClick={() => setUi('stage', { mobileView: v })}>
              {v === 'operator' ? 'Admin' : v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      )}

      <main className="stage-main">
        {showPassenger && <PassengerApp />}
        {showDriver && <DriverApp />}
        {operatorInline && <div className="stage-operator"><OperatorPanel /></div>}
      </main>

      {layout === 'drawer' && view === 'all' && (
        <aside className={`op-drawer ${drawer ? 'is-open' : ''}`} aria-hidden={!drawer}>
          <OperatorPanel />
        </aside>
      )}

      <div className="stage-toasts" aria-live="polite">
        {stageToasts.map((t) => <div key={t.id} className={`stage-toast tone-${t.tone}`}>{t.message}</div>)}
      </div>
    </div>
  );
}
