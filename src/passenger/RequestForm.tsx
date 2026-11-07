import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useDemo } from '../app/store';
import { destinationsFrom, findRoute, pointById } from '../data/mockLocations';
import { PASSENGER } from '../data/mockNGOs';
import { isTransport } from '../domain/eligibility';
import { pointAuthorizedById, routeStatus, routeStatusReason } from '../domain/hazard';
import type { AccessibilityNeed, ServiceType } from '../domain/types';
import { SERVICE_LABEL, submitRequest, validateRequest, type RequestInput } from '../domain/workflow';
import { Badge, ScreenHeader } from '../components/ui';

const TRANSPORT_PICKUPS = ['P-ALPHA', 'P-BETA'];

export function RequestForm() {
  const setUi = useDemo((s) => s.setUi);
  const preset = useDemo((s) => s.ui.passenger.requestPreset);
  const domain = useDemo((s) => s.domain);
  const perform = useDemo((s) => s.perform);
  const toast = useDemo((s) => s.toast);
  const active = domain.disaster.status === 'active';

  const services: ServiceType[] = active ? ['evacuation_transfer', 'essential_delivery'] : ['transport_assistance', 'essential_delivery'];
  const initialService: ServiceType = preset && services.includes(preset) ? preset : services[0];

  const [service, setService] = useState<ServiceType>(initialService);
  const [pickupId, setPickupId] = useState(isTransport(initialService) ? 'P-ALPHA' : 'L-FOOD');
  const [destinationId, setDestinationId] = useState('');
  const [passengers, setPassengers] = useState(isTransport(initialService) ? 3 : 1);
  const [accessibility, setAccessibility] = useState<AccessibilityNeed>('none');
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const transport = isTransport(service);
  const pickups = transport ? TRANSPORT_PICKUPS : ['L-FOOD'];
  const destinations = destinationsFrom(pickupId);

  const input: RequestInput = {
    source: 'passenger',
    requesterId: PASSENGER.id,
    service,
    pickupId,
    destinationId,
    passengers,
    load: transport ? undefined : 'Essential supplies (demo)',
    accessibility,
    note,
    acknowledged,
  };
  const errors = validateRequest(domain, input);
  const err = (k: string) => (showErrors && errors[k] ? <p className="field-error">{errors[k]}</p> : null);
  const route = destinationId ? findRoute(pickupId, destinationId) : undefined;
  const rStatus = route ? routeStatus(route, domain.disaster) : null;

  const changeService = (s: ServiceType) => {
    setService(s);
    setPickupId(isTransport(s) ? 'P-ALPHA' : 'L-FOOD');
    setDestinationId('');
  };

  const submit = () => {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const out = perform((s, now) => submitRequest(s, input, now));
    if (out.ok) {
      if (out.reasons.length) toast('passenger', out.reasons[0], 'info');
      setUi('passenger', { screen: 'track', requestPreset: undefined });
    }
  };

  return (
    <div className="screen scroll ll form">
      <ScreenHeader title="Request assistance" subtitle="Lifeline · simulated request" onBack={() => setUi('passenger', { screen: 'lifeline' })} />

      <section className="field">
        <label className="field-label">Service type</label>
        <div className="chips">
          {services.map((s) => (
            <button key={s} className={`chip ${service === s ? 'is-on' : ''}`} onClick={() => changeService(s)} aria-pressed={service === s}>
              {SERVICE_LABEL[s]}
            </button>
          ))}
        </div>
        {err('service')}
      </section>

      <section className="field">
        <label className="field-label">{transport ? 'Safe pickup / assembly point' : 'Collection point'}</label>
        <div className="options">
          {pickups.map((id) => {
            const ok = pointAuthorizedById(id, domain.disaster);
            return (
              <button key={id} className={`option ${pickupId === id ? 'is-on' : ''}`} onClick={() => { setPickupId(id); setDestinationId(''); }}>
                <span className="radio" />
                <span className="option-main">{pointById(id)?.label}</span>
                <Badge tone={ok ? 'success' : 'danger'}>{ok ? 'Designated' : 'In affected zone'}</Badge>
              </button>
            );
          })}
        </div>
        {err('pickupId')}
      </section>

      <section className="field">
        <label className="field-label">{transport ? 'Approved destination / shelter' : 'Deliver to'}</label>
        <div className="options">
          {destinations.map((p) => {
            const r = findRoute(pickupId, p.id)!;
            const st = routeStatus(r, domain.disaster);
            return (
              <button key={p.id} className={`option ${destinationId === p.id ? 'is-on' : ''}`} onClick={() => setDestinationId(p.id)}>
                <span className="radio" />
                <span className="option-main">
                  {p.label}
                  <small>{r.id} · {r.label}</small>
                </span>
                <Badge tone={st === 'approved' ? 'success' : st === 'blocked' ? 'danger' : 'muted'}>{st === 'approved' ? 'Approved' : st === 'blocked' ? 'Blocked' : 'Unknown'}</Badge>
              </button>
            );
          })}
        </div>
        {err('destinationId')}
        {rStatus && rStatus !== 'approved' && (
          <div className="inline-warn">
            <strong>Dispatch unavailable: route not approved.</strong> {route?.id}: {routeStatusReason(rStatus)}. A coordinator cannot dispatch a driver on
            this route in the simulation. Choose another destination if one is approved.
          </div>
        )}
      </section>

      {transport && (
        <>
          <section className="field">
            <label className="field-label">Passengers</label>
            <div className="stepper">
              <button onClick={() => setPassengers((n) => Math.max(1, n - 1))} aria-label="Fewer passengers"><Minus size={18} /></button>
              <span>{passengers}</span>
              <button onClick={() => setPassengers((n) => Math.min(4, n + 1))} aria-label="More passengers"><Plus size={18} /></button>
              <small>1–4 people</small>
            </div>
            {err('passengers')}
          </section>
          <section className="field">
            <label className="field-label">Accessible transport</label>
            <div className="chips">
              {([['none', 'Not needed'], ['wheelchair', 'Wheelchair'], ['reduced_mobility', 'Reduced mobility']] as const).map(([v, l]) => (
                <button key={v} className={`chip ${accessibility === v ? 'is-on' : ''}`} onClick={() => setAccessibility(v)} aria-pressed={accessibility === v}>
                  {l}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="field">
        <label className="field-label" htmlFor="req-note">Short note (optional)</label>
        <textarea id="req-note" maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. we have two small bags" rows={2} />
        <small className="field-help">Notes are never used as a pickup location.</small>
        {err('note')}
      </section>

      <label className="ack">
        <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
        <span>I understand Lifeline is not an emergency or rescue service and only travels between approved points.</span>
      </label>
      {err('acknowledged')}

      <div className="form-actions">
        <button className="btn-lime" onClick={submit}>Request assistance</button>
      </div>
    </div>
  );
}
