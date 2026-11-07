import { CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useDemo } from '../app/store';
import { pointById } from '../data/mockLocations';
import { Badge } from '../components/ui';
import { ACTIVE_MISSION_STATUSES, eligibleDrivers, failedReasons, IN_PROGRESS_STATUSES, missionFor, requestGates } from '../domain/dispatch';
import { ACCESSIBILITY_LABEL, BONUS_LABEL, MISSION_LABEL, REQUEST_LABEL, shortTime } from '../domain/labels';
import type { DomainState, PassengerRequest } from '../domain/types';
import {
  approveRequest, cancelMission, clearSafetyHold, confirmCompletion, holdBonus, rejectRequest, releaseBonus, routeLabel,
} from '../domain/workflow';

const REJECT_REASONS = ['Outside Lifeline scope: refer to emergency services', 'Could not verify the request', 'Duplicate request'];

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
      {list.length === 0 && (
        <p className="op-muted">
          {domain.disaster.status === 'active'
            ? 'No requests yet. Shelter transport requests from the selected area appear here instantly for review.'
            : 'Lifeline is inactive. Activate a scenario in the Scenario tab before passengers can request transport.'}
        </p>
      )}
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
  const underway = mission && ACTIVE_MISSION_STATUSES.includes(mission.status) && mission.status !== 'offered';
  const reviewable = ['under_review', 'blocked'].includes(req.status);
  const approveReasons = failedReasons(gates);
  const matches = eligibleDrivers(domain, req);

  return (
    <article className={`op-req ${selected ? 'is-selected' : ''}`}>
      <header>
        <div>
          <strong>{req.id}</strong> · Shelter transport
          <small>{req.requesterLabel} · {shortTime(req.createdAt)}</small>
        </div>
        <Badge tone={req.status === 'approved' ? 'success' : ['rejected', 'blocked', 'cancelled'].includes(req.status) ? 'danger' : 'warn'}>{REQUEST_LABEL[req.status]}</Badge>
      </header>
      <dl className="op-kv">
        <div><dt>Pickup → Shelter</dt><dd>{pointById(req.pickupId)?.label} → {pointById(req.destinationId)?.label}</dd></div>
        <div><dt>Route</dt><dd>{routeLabel(req.routeId)}</dd></div>
        <div><dt>Passengers</dt><dd>{req.passengers}</dd></div>
        <div><dt>Accessibility</dt><dd>{ACCESSIBILITY_LABEL[req.accessibility]}</dd></div>
        {(reviewable || mission?.status === 'offered') && (
          <div><dt>Volunteers able to accept</dt><dd>{matches.length ? matches.map((d) => d.name).join(', ') : 'None available right now'}</dd></div>
        )}
        <div><dt>Mission</dt><dd>{mission ? `${mission.id} · ${MISSION_LABEL[mission.status]}${driver ? ` · ${driver.name}` : ''}` : 'Not published'}</dd></div>
        {bonus && <div><dt>Bonus</dt><dd>{bonus.bonus} MAD · {BONUS_LABEL[bonus.status]}</dd></div>}
        {req.reason && <div><dt>Reason</dt><dd>{req.reason}</dd></div>}
        {mission?.safetyHold && <div><dt>Safety</dt><dd className="danger">Paused: {mission.safetyHold.reason}</dd></div>}
        {mission?.passengerConfirmed && <div><dt>Passenger</dt><dd>Confirmed safe arrival</dd></div>}
      </dl>

      {reviewable && (
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
        {reviewable && (
          <button
            className="op-btn op-btn--lime"
            disabled={approveReasons.length > 0}
            title={approveReasons.length ? approveReasons.join('\n') : 'Approves the predefined route and publishes the mission to volunteer drivers'}
            onClick={() => perform((s, now) => approveRequest(s, req.id, now))}
          >
            {approveReasons.length ? 'Route can’t be approved' : 'Approve route & publish'}
          </button>
        )}
        {mission?.status === 'awaiting_confirmation' && (
          <button className="op-btn op-btn--lime" onClick={() => perform((s, now) => confirmCompletion(s, mission.id, now))}>Confirm completion</button>
        )}
        {bonus && ['pending_completion', 'pending_confirmation'].includes(bonus.status) && (
          <button className="op-btn" onClick={() => perform((s, now) => holdBonus(s, mission!.id, 'Random quality review (demo)', now))}>Hold bonus for review</button>
        )}
        {bonus?.status === 'held' && <button className="op-btn" onClick={() => perform((s, now) => releaseBonus(s, mission!.id, now))}>Release bonus</button>}
        {mission?.safetyHold && <button className="op-btn" onClick={() => perform((s, now) => clearSafetyHold(s, mission.id, now))}>Resume after review</button>}
        {mission && IN_PROGRESS_STATUSES.includes(mission.status) && (
          <button className="op-btn op-btn--danger-ghost" onClick={() => perform((s, now) => cancelMission(s, mission.id, 'Cancelled by the Admin for safety', now))}>Cancel mission</button>
        )}
      </div>

      {!underway && !['rejected', 'cancelled'].includes(req.status) && mission?.status !== 'confirmed' && (
        <div className="op-reject">
          <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reject reason">
            {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className="op-btn op-btn--danger-ghost" onClick={() => perform((s, now) => rejectRequest(s, req.id, reason, false, now))}>
            {mission?.status === 'offered' ? 'Withdraw & reject' : 'Reject'}
          </button>
          {req.status !== 'blocked' && (
            <button className="op-btn op-btn--danger-ghost" onClick={() => perform((s, now) => rejectRequest(s, req.id, 'Route not safe for dispatch', true, now))}>Block</button>
          )}
        </div>
      )}
    </article>
  );
}
