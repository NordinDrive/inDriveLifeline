import { useDemo } from '../app/store';
import { DemoTag } from '../components/ui';
import { shortTime } from '../domain/labels';
import { computeImpact } from '../domain/metrics';

export function ImpactTab() {
  const domain = useDemo((s) => s.domain);
  const m = computeImpact(domain);
  const spent = m.bonusesApprovedTotal;
  const kpis: [string, string | number][] = [
    ['Requests received', m.requestsReceived],
    ['Requests verified', m.requestsVerified],
    ['Approved missions', m.approvedMissions],
    ['Verified missions completed', m.confirmedMissions],
    ['People transported', m.peopleTransported],
    ['Essential deliveries', m.deliveriesCompleted],
    ['Verified Lifeline drivers', m.activeVerifiedDrivers],
    ['NGO partner missions', m.ngoPartnerMissions],
    ['Blocked / unsafe-route', m.blockedRequests],
    ['Bonuses approved', `${m.bonusesApprovedCount} · ${m.bonusesApprovedTotal} MAD`],
    ['Median time to accept', m.medianAcceptSeconds === null ? '—' : `${Math.round(m.medianAcceptSeconds)} s`],
  ];
  return (
    <div className="op-stack">
      <div className="op-kpis">
        {kpis.map(([l, v]) => (
          <div key={l}><span>{l}</span><strong>{v}</strong></div>
        ))}
      </div>
      <div className="op-card">
        <h3 className="op-h3">Fictional bonus budget</h3>
        <div className="op-progress"><span style={{ width: `${Math.min(100, (spent / m.bonusBudget) * 100)}%` }} /></div>
        <p className="op-progress-label">{spent} MAD of {m.bonusBudget} MAD approved</p>
      </div>
      <div className="op-card">
        <h3 className="op-h3">How these numbers are counted</h3>
        <ul className="op-list">
          <li>Outputs (trips, deliveries) count only after coordinator confirmation, once per mission.</li>
          <li>A submitted request is never counted as a completed ride.</li>
          <li>Potential value: trusted NGO partnerships, coordinated missions, driver engagement and traceable support costs. These are hypotheses, not results.</li>
        </ul>
        <DemoTag>Illustrative / Demo Data: not inDrive operational data</DemoTag>
      </div>
    </div>
  );
}

export function LogTab() {
  const events = useDemo((s) => s.domain.events);
  return (
    <ol className="op-log">
      {events.map((e) => (
        <li key={e.id} className={`tone-${e.tone}`}>
          <time>{shortTime(e.at)}</time>
          <span className={`op-actor op-actor--${e.actor}`}>{e.actor}</span>
          <p>{e.message}</p>
        </li>
      ))}
    </ol>
  );
}
