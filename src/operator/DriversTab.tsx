import { useDemo } from '../app/store';
import { Badge } from '../components/ui';
import { driverIsBusy } from '../domain/dispatch';
import { ELIGIBILITY_LABEL, ELIGIBILITY_TONE } from '../domain/labels';
import { approveDriver, reinstateDriver, setLifelineAvailability, suspendDriver } from '../domain/workflow';

export function DriversTab() {
  const domain = useDemo((s) => s.domain);
  const perform = useDemo((s) => s.perform);
  return (
    <div className="op-stack">
      <p className="op-muted">Drivers join Lifeline voluntarily and need extra verification on top of their inDrive account. Only verified volunteers who choose to be available can accept missions.</p>
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
            <div><dt>Lifeline availability</dt><dd>{driverIsBusy(domain, d.id) ? 'On a mission' : d.online && d.available ? 'Available' : d.online ? 'Online, not available' : 'Offline'}</dd></div>
          </dl>
          <div className="op-actions">
            {d.eligibility === 'pending_review' && <button className="op-btn op-btn--ok" onClick={() => perform((s, now) => approveDriver(s, d.id, now))}>Verify volunteer</button>}
            {d.eligibility === 'not_enrolled' && <span className="op-muted">Has not volunteered yet</span>}
            {d.eligibility === 'verified' && <button className="op-btn op-btn--danger-ghost" onClick={() => perform((s, now) => suspendDriver(s, d.id, now))}>Suspend</button>}
            {d.eligibility === 'suspended' && <button className="op-btn" onClick={() => perform((s, now) => reinstateDriver(s, d.id, now))}>Reinstate</button>}
            {!d.isPhoneDriver && d.eligibility === 'verified' && (
              <button className="op-btn" onClick={() => perform((s, now) => setLifelineAvailability(s, d.id, !d.available, now))}>
                Set {d.available ? 'not available' : 'available'}
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
