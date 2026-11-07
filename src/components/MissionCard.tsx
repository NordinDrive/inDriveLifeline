import type { ReactNode } from 'react';
import { Accessibility, MapPin, Route, ShieldCheck, Users } from 'lucide-react';
import { pointById, routeById } from '../data/mockLocations';
import { routeDistanceKm, routeStatusById } from '../domain/hazard';
import { ACCESSIBILITY_LABEL } from '../domain/labels';
import type { DomainState, Mission } from '../domain/types';
import { SERVICE_LABEL } from '../domain/workflow';
import { Badge, Reasons } from './ui';

export function missionSource(state: DomainState, m: Mission): string {
  const req = state.requests.find((r) => r.id === m.requestId);
  return req ? req.requesterLabel : 'Lifeline';
}

/** Trip fare and Lifeline bonus, always on separate lines. */
export function EarningsLines({ base, bonus, status }: { base: number; bonus: number; status?: ReactNode }) {
  return (
    <div className="earn">
      <div className="earn-bonus"><span>Lifeline bonus</span><strong>+{bonus} MAD {status}</strong></div>
      <div><span>Trip fare (separate from bonus)</span><strong>{base} MAD</strong></div>
    </div>
  );
}

interface Props {
  state: DomainState;
  mission: Mission;
  reasons: string[];
  onAccept: () => void;
  onDecline: () => void;
  onDetails: () => void;
}

/** Driver-facing Lifeline offer card: clearly distinct from a passenger alert. */
export function MissionCard({ state, mission, reasons, onAccept, onDecline, onDetails }: Props) {
  const route = routeById(mission.routeId);
  const st = routeStatusById(mission.routeId, state.disaster);
  return (
    <article className="mcard">
      <header className="mcard-head">
        <Badge tone="lime">Lifeline</Badge>
        <span className="mcard-type">{SERVICE_LABEL}</span>
        <span className="mcard-id">{mission.id}</span>
      </header>
      <dl className="mcard-facts">
        <div><dt><MapPin size={14} />Pickup point</dt><dd>{pointById(mission.pickupId)?.label}</dd></div>
        <div><dt><ShieldCheck size={14} />Destination shelter</dt><dd>{pointById(mission.destinationId)?.label}</dd></div>
        <div><dt><Users size={14} />Passengers</dt><dd>{mission.passengers}</dd></div>
        <div><dt><Accessibility size={14} />Accessibility</dt><dd>{ACCESSIBILITY_LABEL[mission.accessibility]}</dd></div>
        <div className="mcard-wide">
          <dt><Route size={14} />Route</dt>
          <dd className={st === 'approved' ? 'ok' : 'bad'}>
            {route?.id} · {route?.label} · {routeDistanceKm(route)} km · {st === 'approved' ? 'Approved' : `${st[0].toUpperCase()}${st.slice(1)}: unavailable`}
          </dd>
        </div>
      </dl>
      <EarningsLines base={mission.baseCompensation} bonus={mission.bonus} />
      <Reasons reasons={reasons} title="You can’t accept yet" />
      <div className="mcard-actions">
        <button className="btn-lime" onClick={onAccept} disabled={reasons.length > 0}>Accept</button>
        <button className="btn-dark" onClick={onDecline}>Decline</button>
        <button className="btn-link" onClick={onDetails}>View details · decline carries no penalty</button>
      </div>
    </article>
  );
}
