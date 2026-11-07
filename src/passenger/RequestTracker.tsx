import { Car, CheckCircle2, MapPin, Phone } from 'lucide-react';
import { useDemo } from '../app/store';
import { pointById } from '../data/mockLocations';
import { PASSENGER } from '../data/mockNGOs';
import { FictionalMap } from '../components/FictionalMap';
import { Badge, DemoTag, ScreenHeader } from '../components/ui';
import { REQUEST_LABEL, shortTime, TRACKER_STEPS, trackerIndex } from '../domain/labels';
import { routeStatusById, routeStatusReason } from '../domain/hazard';
import { cancelRequest, passengerConfirmArrival, SERVICE_LABEL } from '../domain/workflow';

export function RequestTracker() {
  const setUi = useDemo((s) => s.setUi);
  const perform = useDemo((s) => s.perform);
  const domain = useDemo((s) => s.domain);
  const mine = domain.requests.filter((r) => r.requesterId === PASSENGER.id);
  const req = mine[0];

  if (!req) {
    return (
      <div className="screen scroll ll">
        <ScreenHeader title="Track My Request" onBack={() => setUi('passenger', { screen: 'lifeline' })} />
        <div className="empty">
          <MapPin size={34} />
          <p>No requests yet.</p>
          <button className="btn-lime" onClick={() => setUi('passenger', { screen: 'request' })}>Request assistance</button>
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
      <ScreenHeader title="Track My Request" subtitle={`${req.id} · ${SERVICE_LABEL[req.service]}`} onBack={() => setUi('passenger', { screen: 'lifeline' })} />

      <div className="trk-map">
        <FictionalMap variant="card" highlightRouteId={req.routeId} focusPointIds={[req.pickupId, req.destinationId]} />
      </div>

      <div className="trk-route">
        <div><span className="dot dot--from" />{pointById(req.pickupId)?.label}</div>
        <div><span className="dot dot--to" />{pointById(req.destinationId)?.label}</div>
        <small>{req.passengers ? `${req.passengers} passenger${req.passengers > 1 ? 's' : ''}` : req.load} · submitted {shortTime(req.createdAt)}</small>
      </div>

      {!closed && !mission && routeStatusById(req.routeId, domain.disaster) !== 'approved' && (
        <div className="inline-warn">
          <strong>Dispatch unavailable: route not approved.</strong> {req.routeId}: {routeStatusReason(routeStatusById(req.routeId, domain.disaster))}. A coordinator will contact you about alternatives.
        </div>
      )}

      {closed ? (
        <div className="trk-closed">
          <Badge tone="danger">{REQUEST_LABEL[req.status]}</Badge>
          <p>{req.reason ?? 'This request is closed.'}</p>
          <button className="btn-dark" onClick={() => setUi('passenger', { screen: 'request' })}>New request</button>
        </div>
      ) : (
        <ol className="trk-steps" aria-label="Request progress">
          {TRACKER_STEPS.map((label, i) => (
            <li key={label} className={i < idx ? 'done' : i === idx ? 'current' : ''}>
              <span className="trk-dot">{i < idx ? <CheckCircle2 size={16} /> : null}</span>
              <span>{label}</span>
              {i === idx && i === 3 && <small>Matching with verified Lifeline drivers…</small>}
              {i === idx && mission?.status === 'at_pickup' && i === 5 && <small>Your driver is at the pickup point</small>}
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
            <Badge tone="lime">Lifeline Verified</Badge>
          </div>
          <button className="round-btn round-btn--sm" aria-label="Contact driver (simulated)" onClick={() => useDemo.getState().toast('passenger', 'Calls are simulated in this demo')}>
            <Phone size={18} />
          </button>
        </div>
      )}

      {mission?.passengerConfirmed && <p className="trk-note"><CheckCircle2 size={16} /> You confirmed safe arrival{mission.status !== 'confirmed' ? '. Waiting for coordinator confirmation.' : '.'}</p>}

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
            <div key={r.id} className="mini-row"><span>{r.id} · {SERVICE_LABEL[r.service]}</span><Badge tone="muted">{REQUEST_LABEL[r.status]}</Badge></div>
          ))}
        </div>
      )}
      <div className="ll-foot"><DemoTag>Simulated tracking · fictional data</DemoTag></div>
    </div>
  );
}
