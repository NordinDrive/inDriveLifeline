import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useDemo } from '../app/store';
import { destinationsFrom, findRoute, PICKUP_POINTS } from '../data/mockLocations';
import { PASSENGER } from '../data/mockPassenger';
import { pointAuthorizedById, routeStatus, routeStatusReason } from '../domain/hazard';
import type { AccessibilityNeed } from '../domain/types';
import { MAX_PASSENGERS, submitRequest, validateRequest, type RequestInput } from '../domain/workflow';
import { Badge, Reasons, ScreenHeader } from '../components/ui';

const ACCESS_OPTIONS: [AccessibilityNeed, string][] = [
  ['none', 'None'],
  ['wheelchair', 'Wheelchair'],
  ['reduced_mobility', 'Reduced mobility'],
];

export function RequestForm() {
  const setUi = useDemo((s) => s.setUi);
  const domain = useDemo((s) => s.domain);
  const perform = useDemo((s) => s.perform);
  const toast = useDemo((s) => s.toast);
  const pickups = PICKUP_POINTS.filter((p) => p.districtId === PASSENGER.districtId);

  const [pickupId, setPickupId] = useState(pickups[0]?.id ?? '');
  const [destinationId, setDestinationId] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [accessibility, setAccessibility] = useState<AccessibilityNeed>('none');
  const [showErrors, setShowErrors] = useState(false);

  const input: RequestInput = { source: 'passenger', requesterId: PASSENGER.id, pickupId, destinationId, passengers, accessibility };
  const errors = validateRequest(domain, input);
  const err = (k: string) => (showErrors && errors[k] ? <p className="field-error">{errors[k]}</p> : null);
  const route = destinationId ? findRoute(pickupId, destinationId) : undefined;
  const rStatus = route ? routeStatus(route, domain.disaster) : null;

  const submit = () => {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const out = perform((s, now) => submitRequest(s, input, now));
    if (out.ok) {
      if (out.reasons.length) toast('passenger', out.reasons[0], 'info');
      setUi('passenger', { screen: 'track' });
    }
  };

  return (
    <div className="screen scroll ll form">
      <ScreenHeader title="Transport to a shelter" subtitle="Lifeline" onBack={() => setUi('passenger', { screen: 'lifeline' })} />
      {showErrors && errors.scenario && <Reasons reasons={[errors.scenario]} title="Lifeline is not available" />}

      <section className="field">
        <label className="field-label">1 · Designated pickup point</label>
        <div className="options">
          {pickups.map((p) => {
            const ok = pointAuthorizedById(p.id, domain.disaster);
            return (
              <button key={p.id} className={`option ${pickupId === p.id ? 'is-on' : ''}`} onClick={() => { setPickupId(p.id); setDestinationId(''); }}>
                <span className="radio" />
                <span className="option-main">{p.label}</span>
                <Badge tone={ok ? 'success' : 'danger'}>{ok ? 'Designated' : 'In affected zone'}</Badge>
              </button>
            );
          })}
        </div>
        {err('pickupId')}
      </section>

      <section className="field">
        <label className="field-label">2 · Approved shelter</label>
        <div className="options">
          {destinationsFrom(pickupId).map((p) => {
            const r = findRoute(pickupId, p.id)!;
            const st = routeStatus(r, domain.disaster);
            return (
              <button key={p.id} className={`option ${destinationId === p.id ? 'is-on' : ''}`} onClick={() => setDestinationId(p.id)}>
                <span className="radio" />
                <span className="option-main">
                  {p.label}
                  <small>{r.id} · {r.label}{p.capacity ? ` · ${p.capacity - (p.occupancy ?? 0)} places` : ''}</small>
                </span>
                <Badge tone={st === 'approved' ? 'success' : st === 'blocked' ? 'danger' : 'muted'}>{st === 'approved' ? 'Route approved' : st === 'blocked' ? 'Blocked' : 'Unknown'}</Badge>
              </button>
            );
          })}
        </div>
        {err('destinationId')}
        {rStatus && rStatus !== 'approved' && (
          <div className="inline-warn">
            <strong>This route can’t be approved right now.</strong> {route?.id}: {routeStatusReason(rStatus)}. The Admin cannot send a driver on it. Choose a
            shelter with an approved route.
          </div>
        )}
      </section>

      <section className="field">
        <label className="field-label">3 · Passengers</label>
        <div className="stepper">
          <button onClick={() => setPassengers((n) => Math.max(1, n - 1))} aria-label="Fewer passengers"><Minus size={18} /></button>
          <span>{passengers}</span>
          <button onClick={() => setPassengers((n) => Math.min(MAX_PASSENGERS, n + 1))} aria-label="More passengers"><Plus size={18} /></button>
          <small>1–{MAX_PASSENGERS} people</small>
        </div>
        {err('passengers')}
      </section>

      <section className="field">
        <label className="field-label">4 · Accessibility needs</label>
        <div className="chips">
          {ACCESS_OPTIONS.map(([v, l]) => (
            <button key={v} className={`chip ${accessibility === v ? 'is-on' : ''}`} onClick={() => setAccessibility(v)} aria-pressed={accessibility === v}>
              {l}
            </button>
          ))}
        </div>
      </section>

      <p className="fine">Lifeline is not a rescue or ambulance service. Pickups happen only at designated points, never at home addresses.</p>
      <div className="form-actions">
        <button className="btn-lime" onClick={submit}>Submit request</button>
      </div>
    </div>
  );
}
