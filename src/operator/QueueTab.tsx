import { CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useDemo } from '../app/store';
import { pointById } from '../data/mockLocations';
import { Badge } from '../components/ui';
import { ACTIVE_MISSION_STATUSES, eligibleDrivers, failedReasons, IN_PROGRESS_STATUSES, missionFor, requestGates } from '../domain/dispatch';
import { BONUS_LABEL, MISSION_LABEL, REQUEST_LABEL, shortTime } from '../domain/labels';
import type { DomainState, PassengerRequest } from '../domain/types';
import {
  approveRoute, cancelMission, clearSafetyHold, confirmCompletion, holdBonus, offerMission, rejectRequest, releaseBonus,
  revokeRouteApproval, routeLabel, SERVICE_LABEL, sourceLabel, verifyNeed,
} from '../domain/workflow';

const REJECT_REASONS = ['Outside Lifeline scope: refer to emergency services', 'Could not verify need', 'Duplicate request'];

function isOpen(state: DomainState, r: PassengerRequest) {
  const m = missionFor(state, r);
  if (m && m.status === 'confirmed') return false;
  return !['rejected', 'cancelled'].includes(r.status);
}

export function QueueTab() {
  const domain = useDemo((s) => s.domain);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const list = domain.requests.filter((r) => filter === 'all' || isOpen(domain, r));
  return (
    <div className="op-stack">
      <div className="op-filter">
        <button className={filter === 'open' ? 'is-on' : ''} onClick={() => setFilter('open')}>Open ({domain.requests.filter((r) => isOpen(domain, r)).length})</button>
        <button className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>All ({domain.requests.length})</button>
      </div>
      {list.length === 0 && <p className="op-muted">Queue is empty. New passenger, NGO, hotline and shelter requests appear here instantly.</p>}
      {list.map((r) => <RequestCard key={r.id} req={r} />)}
    </div>
  );
}

function RequestCard({ req }: { req: PassengerRequest }) {
  const domain = useDemo((s) => s.domain);
  const perform = useDemo((s) => s.perform);
  const selected = useDemo((s) => s.ui.operator.selectedRequestId === req.id);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const mission = missionFor(domain, req);
  const gates = requestGates(domain, req);
  const bonus = mission ? domain.bonuses[mission.id] : undefined;
  const driver = mission?.driverId ? domain.drivers[mission.driverId] : undefined;
  const dispatched = mission && ACTIVE_MISSION_STATUSES.includes(mission.status);
  const offerReasons = failedReasons(gates);
  const routeReasons = failedReasons(gates.filter((g) => ['scenario', 'pickup', 'destination', 'route'].includes(g.id)));
  const matches = eligibleDrivers(domain, req);

  return (
    <article className={`op-req ${selected ? 'is-selected' : ''}`}>
      <header>
        <div>
          <strong>{req.id}</strong> · {SERVICE_LABEL[req.service]}
          <small>{sourceLabel(req.source)}{req.ngoId ? ` · ${domain.ngos.find((n) => n.id === req.ngoId)?.name}` : ''} · {shortTime(req.createdAt)}</small>
        </div>
        <Badge tone={req.status === 'approved' ? 'success' : ['rejected', 'blocked', 'cancelled'].includes(req.status) ? 'danger' : 'warn'}>{REQUEST_LABEL[req.status]}</Badge>
      </header>
      <dl className="op-kv">
        <div><dt>Beneficiary</dt><dd>{req.beneficiaryLabel}</dd></div>
        <div><dt>{req.passengers ? 'Passengers' : 'Load'}</dt><dd>{req.passengers || req.load}</dd></div>
        <div><dt>Accessibility</dt><dd>{req.accessibility === 'none' ? 'None' : req.accessibility === 'wheelchair' ? 'Wheelchair' : 'Reduced mobility'}</dd></div>
        <div><dt>Pickup → Destination</dt><dd>{pointById(req.pickupId)?.label} → {pointById(req.destinationId)?.label}</dd></div>
        <div><dt>Route</dt><dd>{routeLabel(req.routeId)}</dd></div>
        {!dispatched && mission?.status !== 'confirmed' && (
          <div><dt>Driver match</dt><dd>{matches.length ? matches.map((d) => d.name).join(', ') : 'No eligible Lifeline drivers available'}</dd></div>
        )}
        <div><dt>Mission</dt><dd>{mission ? `${mission.id} · ${MISSION_LABEL[mission.status]}${driver ? ` · ${driver.name}` : ''}` : 'Not dispatched'}</dd></div>
        {bonus && <div><dt>Bonus</dt><dd>{bonus.bonus} MAD · {BONUS_LABEL[bonus.status]}</dd></div>}
        {req.reason && <div><dt>Reason</dt><dd>{req.reason}</dd></div>}
        {mission?.safetyHold && <div><dt>Safety</dt><dd className="danger">Paused: {mission.safetyHold.reason}</dd></div>}
        {mission?.passengerConfirmed && <div><dt>Passenger</dt><dd>Confirmed safe arrival</dd></div>}
      </dl>

      {!dispatched && !['rejected', 'cancelled'].includes(req.status) && (
        <ul className="gates gates--op">
          {gates.map((g) => (
            <li key={g.id} className={g.pass ? 'pass' : 'fail'}>
              {g.pass ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              <span><strong>{g.label}</strong><small>{g.detail}</small></span>
            </li>
          ))}
        </ul>
      )}

      <div className="op-actions">
        {req.status === 'under_review' && <button className="op-btn op-btn--ok" onClick={() => perform((s, now) => verifyNeed(s, req.id, now))}>Verify Need</button>}
        {req.verified && !req.routeApproved && ['verified', 'blocked'].includes(req.status) && (
          <button
            className="op-btn op-btn--ok"
            disabled={routeReasons.length > 0}
            title={routeReasons.length ? routeReasons.join('\n') : 'Only preconfigured routes that are approved in the scenario'}
            onClick={() => perform((s, now) => approveRoute(s, req.id, now))}
          >
            {routeReasons.length ? 'Route not approvable' : 'Approve Safe Demo Route'}
          </button>
        )}
        {req.status === 'approved' && !dispatched && (
          <>
            <button className="op-btn op-btn--lime" disabled={offerReasons.length > 0} title={offerReasons.join('\n')} onClick={() => perform((s, now) => offerMission(s, req.id, now))}>
              Offer to Eligible Drivers
            </button>
            <button className="op-btn" onClick={() => perform((s, now) => revokeRouteApproval(s, req.id, now))}>Revoke approval</button>
          </>
        )}
        {mission?.status === 'awaiting_confirmation' && (
          <button className="op-btn op-btn--lime" onClick={() => perform((s, now) => confirmCompletion(s, mission.id, now))}>Confirm Safe Arrival</button>
        )}
        {bonus && ['pending_completion', 'pending_confirmation'].includes(bonus.status) && (
          <button className="op-btn" onClick={() => perform((s, now) => holdBonus(s, mission!.id, 'Random quality review (demo)', now))}>Hold Bonus for Review</button>
        )}
        {bonus?.status === 'held' && <button className="op-btn" onClick={() => perform((s, now) => releaseBonus(s, mission!.id, now))}>Release bonus</button>}
        {mission?.safetyHold && <button className="op-btn" onClick={() => perform((s, now) => clearSafetyHold(s, mission.id, now))}>Resume after review</button>}
        {mission && IN_PROGRESS_STATUSES.includes(mission.status) && (
          <button className="op-btn op-btn--danger-ghost" onClick={() => perform((s, now) => cancelMission(s, mission.id, 'Cancelled by coordinator for safety', now))}>Cancel mission</button>
        )}
      </div>

      {!dispatched && !['rejected', 'cancelled'].includes(req.status) && (
        <div className="op-reject">
          <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reject reason">
            {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className="op-btn op-btn--danger-ghost" onClick={() => perform((s, now) => rejectRequest(s, req.id, reason, false, now))}>Reject</button>
          {req.status !== 'blocked' && (
            <button className="op-btn op-btn--danger-ghost" onClick={() => perform((s, now) => rejectRequest(s, req.id, 'Route not approved for dispatch', true, now))}>Block</button>
          )}
        </div>
      )}
    </article>
  );
}
