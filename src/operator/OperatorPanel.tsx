import { Activity, ClipboardCheck, Gauge, ListOrdered, Radio, Users } from 'lucide-react';
import { useDemo, type OperatorTab } from '../app/store';
import { DISTRICTS } from '../data/mockLocations';
import { SCENARIO_TEMPLATES, SEVERITY_LABEL } from '../data/mockScenarios';
import { DriversTab } from './DriversTab';
import { ImpactTab, LogTab } from './ImpactTab';
import { QueueTab } from './QueueTab';
import { ScenarioTab } from './ScenarioTab';

const TABS: { id: OperatorTab; label: string; icon: typeof Radio }[] = [
  { id: 'scenario', label: 'Scenario', icon: Radio },
  { id: 'queue', label: 'Requests', icon: ClipboardCheck },
  { id: 'drivers', label: 'Volunteers', icon: Users },
  { id: 'impact', label: 'Impact', icon: Gauge },
  { id: 'log', label: 'Log', icon: ListOrdered },
];

export function OperatorPanel() {
  const tab = useDemo((s) => s.ui.operator.tab);
  const setUi = useDemo((s) => s.setUi);
  const disaster = useDemo((s) => s.domain.disaster);
  const queueCount = useDemo((s) => s.domain.requests.filter((r) => ['under_review', 'blocked'].includes(r.status)).length);
  const awaiting = useDemo((s) => s.domain.missions.filter((m) => m.status === 'awaiting_confirmation').length);
  const pendingDrivers = useDemo((s) => Object.values(s.domain.drivers).filter((d) => d.eligibility === 'pending_review').length);
  const active = disaster.status === 'active';

  const counts: Partial<Record<OperatorTab, number>> = { queue: queueCount + awaiting, drivers: pendingDrivers };

  return (
    <section className="op" aria-label="Lifeline Admin">
      <header className="op-head">
        <div>
          <h2><Activity size={18} /> Lifeline Admin</h2>
          <p>Controls activation, approvals and confirmations · simulation only</p>
        </div>
        <span className={`op-mode ${active ? 'is-active' : ''}`}>
          {active ? `${SCENARIO_TEMPLATES[disaster.type].label} · ${DISTRICTS[disaster.districtId].label.replace('Demo ', '')} · ${SEVERITY_LABEL[disaster.severity]}` : disaster.status === 'resolved' ? 'Scenario resolved' : 'Lifeline inactive'}
        </span>
      </header>
      <nav className="op-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setUi('operator', { tab: t.id })}>
            <t.icon size={16} />
            <span>{t.label}</span>
            {counts[t.id] ? <em>{counts[t.id]}</em> : null}
          </button>
        ))}
      </nav>
      <div className="op-body">
        {tab === 'scenario' && <ScenarioTab />}
        {tab === 'queue' && <QueueTab />}
        {tab === 'drivers' && <DriversTab />}
        {tab === 'impact' && <ImpactTab />}
        {tab === 'log' && <LogTab />}
      </div>
    </section>
  );
}
