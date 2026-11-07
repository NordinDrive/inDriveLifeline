import { useDemo } from '../app/store';
import { Badge } from '../components/ui';
import { driverIsBusy } from '../domain/dispatch';
import { ELIGIBILITY_LABEL, ELIGIBILITY_TONE } from '../domain/labels';
import { approveDriver, reinstateDriver, setDriverOnline, suspendDriver } from '../domain/workflow';

export function DriversTab() {
  const domain = useDemo((s) => s.domain);
  const perform = useDemo((s) => s.perform);
  return (
    <div className="op-stack">
      <p className="op-muted">Lifeline needs extra verification on top of the standard inDrive driver account. Approvals here are simulated reviews.</p>
      {Object.values(domain.drivers).map((d) => (
        <article key={d.id} className="op-req">
          <header>
            <div>
              <strong>{d.name}</strong>{d.isPhoneDriver && <span className="op-phone-tag">Driver phone</span>}
              <small>{d.id} · {d.vehicle} · {d.plate}</small>
            </div>
            <Badge tone={ELIGIBILITY_TONE[d.eligibility]}>{ELIGIBILITY_LABEL[d.eligibility]}</Badge>
          </header>
          <dl className="op-kv">
            <div><dt>inDrive account</dt><dd>{d.accountStatus}</dd></div>
            <div><dt>Seats / accessible</dt><dd>{d.seats} · {d.accessible ? 'Wheelchair accessible' : 'Standard'}</dd></div>
            <div><dt>Training</dt><dd>{d.training.safety && d.training.conduct && d.training.vehicleCheck ? 'Complete' : 'Not completed'}</dd></div>
            <div><dt>Availability</dt><dd>{d.online ? (driverIsBusy(domain, d.id) ? 'On a mission' : 'Online') : 'Offline'}</dd></div>
          </dl>
          <div className="op-actions">
            {d.eligibility === 'pending_review' && <button className="op-btn op-btn--ok" onClick={() => perform((s, now) => approveDriver(s, d.id, now))}>Approve: Lifeline Verified</button>}
            {d.eligibility === 'not_enrolled' && <span className="op-muted">Waiting for the driver to apply in the app</span>}
            {d.eligibility === 'verified' && <button className="op-btn op-btn--danger-ghost" onClick={() => perform((s, now) => suspendDriver(s, d.id, now))}>Suspend</button>}
            {d.eligibility === 'suspended' && <button className="op-btn" onClick={() => perform((s, now) => reinstateDriver(s, d.id, now))}>Reinstate</button>}
            {!d.isPhoneDriver && (
              <button className="op-btn" onClick={() => perform((s, now) => setDriverOnline(s, d.id, !d.online, now))}>Set {d.online ? 'offline' : 'online'}</button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
