import { Activity, ClipboardCheck, Gauge, HandHeart, ListOrdered, Radio, Users } from 'lucide-react';
import { useDemo, type OperatorTab } from '../app/store';
import { DISTRICTS } from '../data/mockLocations';
import { SCENARIO_TEMPLATES, SEVERITY_LABEL } from '../data/mockScenarios';
import { DriversTab } from './DriversTab';
import { ImpactTab, LogTab } from './ImpactTab';
import { NgoTab } from './NgoTab';
import { QueueTab } from './QueueTab';
import { ScenarioTab } from './ScenarioTab';

const TABS: { id: OperatorTab; label: string; icon: typeof Radio }[] = [
  { id: 'scenario', label: 'Scenario', icon: Radio },
  { id: 'queue', label: 'Queue', icon: ClipboardCheck },
  { id: 'drivers', label: 'Drivers', icon: Users },
  { id: 'ngo', label: 'NGO desk', icon: HandHeart },
  { id: 'impact', label: 'Impact', icon: Gauge },
  { id: 'log', label: 'Log', icon: ListOrdered },
];

export function OperatorPanel() {
  const tab = useDemo((s) => s.ui.operator.tab);
  const setUi = useDemo((s) => s.setUi);
  const disaster = useDemo((s) => s.domain.disaster);
  const queueCount = useDemo((s) => s.domain.requests.filter((r) => ['under_review', 'verified', 'approved', 'blocked'].includes(r.status) && !r.missionId).length);
  const awaiting = useDemo((s) => s.domain.missions.filter((m) => m.status === 'awaiting_confirmation').length);
  const pendingDrivers = useDemo((s) => Object.values(s.domain.drivers).filter((d) => d.eligibility === 'pending_review').length);
  const active = disaster.status === 'active';

  const counts: Partial<Record<OperatorTab, number>> = { queue: queueCount + awaiting, drivers: pendingDrivers };

  return (
    <section className="op" aria-label="Operator control center">
      <header className="op-head">
        <div>
          <h2><Activity size={18} /> Lifeline Control Center</h2>
          <p>Operator remote · simulation only</p>
        </div>
        <span className={`op-mode ${active ? 'is-active' : ''}`}>
          {active ? `${SCENARIO_TEMPLATES[disaster.type].label} · ${DISTRICTS[disaster.districtId].label.replace('Demo ', '')} · ${SEVERITY_LABEL[disaster.severity]}` : disaster.status === 'resolved' ? 'Scenario resolved' : 'Normal operations'}
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
        {tab === 'ngo' && <NgoTab />}
        {tab === 'impact' && <ImpactTab />}
        {tab === 'log' && <LogTab />}
      </div>
    </section>
  );
}
