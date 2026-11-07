import { useDemo } from '../app/store';
import { shortTime } from '../domain/labels';
import { computeImpact } from '../domain/metrics';

export function ImpactTab() {
  const domain = useDemo((s) => s.domain);
  const m = computeImpact(domain);
  const spent = m.bonusesApprovedTotal;
  const kpis: [string, string | number][] = [
    ['Requests received', m.requestsReceived],
    ['Routes approved', m.approvedRequests],
    ['Trips confirmed', m.confirmedMissions],
    ['People taken to shelters', m.peopleTransported],
    ['Verified volunteers', m.verifiedVolunteers],
    ['Volunteers available now', m.availableVolunteers],
    ['Blocked / unsafe route', m.blockedRequests],
    ['Bonuses approved', `${m.bonusesApprovedCount} · ${m.bonusesApprovedTotal} MAD`],
    ['Bonuses pending', `${m.bonusesPendingTotal} MAD`],
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
        <h3 className="op-h3">Bonus budget</h3>
        <div className="op-progress"><span style={{ width: `${Math.min(100, (spent / m.bonusBudget) * 100)}%` }} /></div>
        <p className="op-progress-label">{spent} MAD of {m.bonusBudget} MAD approved</p>
      </div>
      <div className="op-card">
        <h3 className="op-h3">How these numbers are counted</h3>
        <ul className="op-list">
          <li>Trips and people count only after the Admin confirms completion, once per mission.</li>
          <li>A submitted request is never counted as a completed ride.</li>
          <li>Cancelled missions never earn a bonus.</li>
        </ul>
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
          <span className={`op-actor op-actor--${e.actor}`}>{e.actor === 'operator' ? 'admin' : e.actor}</span>
          <p>{e.message}</p>
        </li>
      ))}
    </ol>
  );
}
