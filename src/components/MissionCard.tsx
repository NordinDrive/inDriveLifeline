import { Accessibility, Package, Route, ShieldCheck, Users } from 'lucide-react';
import { pointById, routeById } from '../data/mockLocations';
import { routeDistanceKm, routeStatusById } from '../domain/hazard';
import { isTransport } from '../domain/eligibility';
import type { DomainState, Mission } from '../domain/types';
import { SERVICE_LABEL } from '../domain/workflow';
import { Badge, Reasons } from './ui';

export function missionSource(state: DomainState, m: Mission): string {
  const req = state.requests.find((r) => r.id === m.requestId);
  if (!req) return 'Lifeline';
  if (req.ngoId) return state.ngos.find((n) => n.id === req.ngoId)?.name ?? 'NGO partner';
  return req.source === 'passenger' ? 'Passenger request' : 'Lifeline coordinator';
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
  const transport = isTransport(mission.service);
  return (
    <article className="mcard">
      <header className="mcard-head">
        <Badge tone="lime">Lifeline</Badge>
        <span className="mcard-type">{SERVICE_LABEL[mission.service]}</span>
      </header>
      <p className="mcard-source">{missionSource(state, mission)} · {mission.id}</p>
      <div className="mcard-route">
        <div><span className="dot dot--from" />{pointById(mission.pickupId)?.label}</div>
        <div><span className="dot dot--to" />{pointById(mission.destinationId)?.label}</div>
      </div>
      <div className="mcard-meta">
        <span><Route size={15} />{routeDistanceKm(route)} km · {route?.id}</span>
        <span>{transport ? <><Users size={15} />{mission.passengers} pax</> : <><Package size={15} />{mission.load}</>}</span>
        {mission.accessibility !== 'none' && <span><Accessibility size={15} />{mission.accessibility === 'wheelchair' ? 'Wheelchair' : 'Reduced mobility'}</span>}
      </div>
      <div className="earn">
        <div><span>Base mission compensation</span><strong>{mission.baseCompensation} MAD</strong></div>
        <div className="earn-bonus"><span>Lifeline bonus</span><strong>+{mission.bonus} MAD</strong></div>
        <div className="earn-total"><span>Total potential earnings</span><strong>{mission.baseCompensation + mission.bonus} MAD</strong></div>
      </div>
      <div className={`mcard-safety ${st === 'approved' ? '' : 'is-bad'}`}>
        <ShieldCheck size={16} />
        {st === 'approved' ? 'Approved fictional route' : `Route ${st}: dispatch unavailable`}
      </div>
      <Reasons reasons={reasons} title="You can’t accept yet" />
      <div className="mcard-actions">
        <button className="btn-lime" onClick={onAccept} disabled={reasons.length > 0}>Accept</button>
        <button className="btn-dark" onClick={onDecline}>Decline</button>
        <button className="btn-link" onClick={onDetails}>View details</button>
      </div>
    </article>
  );
}
