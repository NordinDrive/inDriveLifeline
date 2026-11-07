import { Car, CheckCircle2, MapPin, Phone } from 'lucide-react';
import { useDemo } from '../app/store';
import { pointById } from '../data/mockLocations';
import { PASSENGER } from '../data/mockPassenger';
import { FictionalMap } from '../components/FictionalMap';
import { Badge, DemoTag, ScreenHeader } from '../components/ui';
import { lifelineOpenIn } from '../domain/dispatch';
import { ACCESSIBILITY_LABEL, REQUEST_LABEL, shortTime, TRACKER_STEPS, trackerIndex } from '../domain/labels';
import { routeStatusById, routeStatusReason } from '../domain/hazard';
import { cancelRequest, passengerConfirmArrival, SERVICE_LABEL } from '../domain/workflow';

export function RequestTracker() {
  const setUi = useDemo((s) => s.setUi);
  const perform = useDemo((s) => s.perform);
  const domain = useDemo((s) => s.domain);
  const mine = domain.requests.filter((r) => r.requesterId === PASSENGER.id);
  const req = mine[0];
  const canRequest = lifelineOpenIn(domain, PASSENGER.districtId);

  if (!req) {
    return (
      <div className="screen scroll ll">
        <ScreenHeader title="Track my request" onBack={() => setUi('passenger', { screen: 'lifeline' })} />
        <div className="empty">
          <MapPin size={34} />
          <p>No requests yet.</p>
          {canRequest && <button className="btn-lime" onClick={() => setUi('passenger', { screen: 'request' })}>Request transport to a shelter</button>}
        </div>
      </div>
    );
  }

  const mission = domain.missions.find((m) => m.id === req.missionId);
  const driver = mission?.driverId ? domain.drivers[mission.driverId] : undefined;
  const closed = ['rejected', 'cancelled', 'blocked'].includes(req.status) && !(mission && ['accepted', 'en_route', 'at_pickup', 'onboard', 'arrived', 'awaiting_confirmation', 'confirmed'].includes(mission.status));
  const idx = trackerIndex(req, mission);
  const canCancel = !closed && !(mission && ['onboard', 'arrived', 'awaiting_confirmation', 'confirmed'].includes(mission.status));
  const canConfirm = mission && ['arrived', 'awaiting_confirmation', 'confirmed'].includes(mission.status) && !mission.passengerConfirmed;

  return (
    <div className="screen scroll ll">
      <ScreenHeader title="Track my request" subtitle={`${req.id} · ${SERVICE_LABEL}`} onBack={() => setUi('passenger', { screen: 'lifeline' })} />

      <div className="trk-map">
        <FictionalMap variant="card" highlightRouteId={req.routeId} focusPointIds={[req.pickupId, req.destinationId]} />
      </div>

      <div className="trk-route">
        <div><span className="dot dot--from" />{pointById(req.pickupId)?.label}</div>
        <div><span className="dot dot--to" />{pointById(req.destinationId)?.label}</div>
        <small>{req.passengers} passenger{req.passengers > 1 ? 's' : ''} · {ACCESSIBILITY_LABEL[req.accessibility]} · submitted {shortTime(req.createdAt)}</small>
      </div>

      {!closed && !mission && routeStatusById(req.routeId, domain.disaster) !== 'approved' && (
        <div className="inline-warn">
          <strong>Route not approved.</strong> {req.routeId}: {routeStatusReason(routeStatusById(req.routeId, domain.disaster))}. The Admin cannot send a driver on this route.
        </div>
      )}

      {closed ? (
        <div className="trk-closed">
          <Badge tone="danger">{REQUEST_LABEL[req.status]}</Badge>
          <p>{req.reason ?? 'This request is closed.'}</p>
          {canRequest && <button className="btn-dark" onClick={() => setUi('passenger', { screen: 'request' })}>New request</button>}
        </div>
      ) : (
        <ol className="trk-steps" aria-label="Request progress">
          {TRACKER_STEPS.map((label, i) => (
            <li key={label} className={i < idx ? 'done' : i === idx ? 'current' : ''}>
              <span className="trk-dot">{i < idx ? <CheckCircle2 size={16} /> : null}</span>
              <span>{label}</span>
              {i === idx && i === 1 && <small>The Lifeline Admin is checking the route to the shelter</small>}
              {i === idx && i === 3 && <small>Waiting for a verified volunteer driver to accept</small>}
              {i === idx && mission?.status === 'at_pickup' && <small>Your driver is at the pickup point</small>}
              {i === idx && mission?.status === 'awaiting_confirmation' && <small>Driver submitted completion · waiting for the Admin</small>}
            </li>
          ))}
        </ol>
      )}

      {driver && mission && !['cancelled', 'blocked'].includes(mission.status) && (
        <div className="driver-card">
          <span className="driver-avatar"><Car size={22} /></span>
          <div>
            <strong>{driver.name}</strong>
            <small>{driver.vehicle} · {driver.plate}</small>
            <Badge tone="lime">Verified volunteer</Badge>
          </div>
          <button className="round-btn round-btn--sm" aria-label="Contact driver (simulated)" onClick={() => useDemo.getState().toast('passenger', 'Calls are simulated in this demo')}>
            <Phone size={18} />
          </button>
        </div>
      )}

      {mission?.passengerConfirmed && <p className="trk-note"><CheckCircle2 size={16} /> You confirmed safe arrival{mission.status !== 'confirmed' ? '. Waiting for the Admin to confirm.' : '.'}</p>}

      <div className="form-actions">
        {canConfirm && (
          <button className="btn-lime" onClick={() => perform((s, now) => passengerConfirmArrival(s, mission!.id, now))}>
            I’ve arrived safely
          </button>
        )}
        {canCancel && (
          <button className="btn-dark" onClick={() => perform((s, now) => cancelRequest(s, req.id, now))}>Cancel request</button>
        )}
      </div>
      {mine.length > 1 && (
        <div className="ll-card">
          <h4>Earlier requests</h4>
          {mine.slice(1).map((r) => (
            <div key={r.id} className="mini-row"><span>{r.id} · {SERVICE_LABEL}</span><Badge tone="muted">{REQUEST_LABEL[r.status]}</Badge></div>
          ))}
        </div>
      )}
      <div className="ll-foot"><DemoTag>Simulated tracking · fictional data</DemoTag></div>
    </div>
  );
}
