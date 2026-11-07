import { useState } from 'react';
import { useDemo } from '../app/store';
import { destinationsFrom, pointById } from '../data/mockLocations';
import { Reasons } from '../components/ui';
import { isTransport } from '../domain/eligibility';
import { campaignProgress } from '../domain/metrics';
import type { AccessibilityNeed, FundingSource, RequestSource, ServiceType } from '../domain/types';
import { SERVICE_LABEL, submitRequest, validateRequest, type RequestInput } from '../domain/workflow';

const NGO_SERVICES: { id: ServiceType; label: string }[] = [
  { id: 'essential_delivery', label: 'Food delivery' },
  { id: 'donation_pickup', label: 'Donation pickup' },
  { id: 'transport_assistance', label: 'Scheduled assisted transport' },
  { id: 'evacuation_transfer', label: 'Approved disaster transfer' },
  { id: 'ngo_logistics', label: 'NGO logistics' },
];

const PICKUPS: Record<ServiceType, string[]> = {
  essential_delivery: ['L-FOOD'],
  donation_pickup: ['L-DELTA'],
  transport_assistance: ['P-ALPHA', 'P-BETA'],
  evacuation_transfer: ['P-ALPHA', 'P-BETA'],
  ngo_logistics: ['L-FOOD', 'L-DELTA'],
};

const FUNDING: { id: FundingSource; label: string }[] = [
  { id: 'ngo', label: 'NGO-funded' },
  { id: 'sponsor', label: 'Sponsor-funded' },
  { id: 'volunteer', label: 'Volunteer-supported' },
  { id: 'indrive', label: 'inDrive-funded pilot' },
];

export function NgoTab() {
  const domain = useDemo((s) => s.domain);
  const perform = useDemo((s) => s.perform);
  const setUi = useDemo((s) => s.setUi);
  const [ngoId, setNgoId] = useState(domain.ngos[0].id);
  const [source, setSource] = useState<RequestSource>('ngo');
  const [campaignId, setCampaignId] = useState('');
  const [service, setService] = useState<ServiceType>('essential_delivery');
  const [pickupId, setPickupId] = useState('L-FOOD');
  const [destinationId, setDestinationId] = useState('P-BETA');
  const [passengers, setPassengers] = useState(2);
  const [load, setLoad] = useState('20 food parcels');
  const [accessibility, setAccessibility] = useState<AccessibilityNeed>('none');
  const [funding, setFunding] = useState<FundingSource>('ngo');
  const [beneficiary, setBeneficiary] = useState('Person without phone access (Demo)');
  const [errors, setErrors] = useState<string[]>([]);

  const transport = isTransport(service);
  const changeService = (s: ServiceType) => {
    setService(s);
    const p = PICKUPS[s][0];
    setPickupId(p);
    setDestinationId(destinationsFrom(p)[0]?.id ?? '');
  };

  const input: RequestInput = {
    source, ngoId, campaignId: campaignId || undefined, beneficiaryLabel: beneficiary, service, pickupId, destinationId,
    passengers, load, accessibility, note: '', acknowledged: true, funding,
  };

  const create = () => {
    const v = validateRequest(domain, input);
    if (Object.keys(v).length) return setErrors(Object.values(v));
    setErrors([]);
    const out = perform((s, now) => submitRequest(s, input, now));
    if (out.ok) setUi('operator', { tab: 'queue', selectedRequestId: out.id });
  };

  const ngoRequests = domain.requests.filter((r) => r.source !== 'passenger');
  const count = (pred: (r: (typeof ngoRequests)[number]) => boolean) => ngoRequests.filter(pred).length;
  const confirmed = (r: (typeof ngoRequests)[number]) => domain.missions.some((m) => m.id === r.missionId && m.status === 'confirmed');

  return (
    <div className="op-stack">
      <div className="op-card">
        <h3 className="op-h3">Create Request on Behalf</h3>
        <p className="op-muted">For people without a smartphone or internet. Enters the same verification and dispatch workflow.</p>
        <div className="op-row">
          <div>
            <label className="op-label">Verified partner</label>
            <select value={ngoId} onChange={(e) => setNgoId(e.target.value)}>
              {domain.ngos.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
          <div>
            <label className="op-label">Request source</label>
            <select value={source} onChange={(e) => setSource(e.target.value as RequestSource)}>
              <option value="ngo">NGO partner</option>
              <option value="hotline">Hotline</option>
              <option value="shelter">Shelter</option>
              <option value="coordinator">Community coordinator</option>
            </select>
          </div>
        </div>
        <label className="op-label">Mission type</label>
        <div className="op-chips">
          {NGO_SERVICES.map((s) => (
            <button key={s.id} className={service === s.id ? 'is-on' : ''} onClick={() => changeService(s.id)}>{s.label}</button>
          ))}
        </div>
        <div className="op-row">
          <div>
            <label className="op-label">Pickup</label>
            <select value={pickupId} onChange={(e) => { setPickupId(e.target.value); setDestinationId(destinationsFrom(e.target.value)[0]?.id ?? ''); }}>
              {PICKUPS[service].map((id) => <option key={id} value={id}>{pointById(id)?.label}</option>)}
            </select>
          </div>
          <div>
            <label className="op-label">Destination</label>
            <select value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
              {destinationsFrom(pickupId).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="op-row">
          {transport ? (
            <>
              <div>
                <label className="op-label">Passengers</label>
                <input type="number" min={1} max={6} value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} />
              </div>
              <div>
                <label className="op-label">Accessibility</label>
                <select value={accessibility} onChange={(e) => setAccessibility(e.target.value as AccessibilityNeed)}>
                  <option value="none">None</option>
                  <option value="wheelchair">Wheelchair</option>
                  <option value="reduced_mobility">Reduced mobility</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="op-label">Load</label>
              <input value={load} onChange={(e) => setLoad(e.target.value)} maxLength={40} />
            </div>
          )}
        </div>
        <div className="op-row">
          <div>
            <label className="op-label">Beneficiary label</label>
            <input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} maxLength={60} />
          </div>
          <div>
            <label className="op-label">Funding (demo terms)</label>
            <select value={funding} onChange={(e) => setFunding(e.target.value as FundingSource)}>
              {FUNDING.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
        </div>
        <label className="op-label">Campaign (optional)</label>
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
          <option value="">No campaign</option>
          {domain.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Reasons reasons={errors} title="Can’t create yet" />
        <div className="op-actions">
          <button className="op-btn op-btn--lime" onClick={create}>Create {SERVICE_LABEL[service]} request</button>
        </div>
      </div>

      {domain.campaigns.map((c) => {
        const p = campaignProgress(domain, c);
        return (
          <div key={c.id} className="op-card">
            <h3 className="op-h3">{c.name}</h3>
            <p className="op-muted">{domain.ngos.find((n) => n.id === c.ngoId)?.name} · fictional campaign</p>
            <div className="op-progress"><span style={{ width: `${p.pct}%` }} /></div>
            <p className="op-progress-label"><strong>{p.completed}</strong> of {c.goal} {c.unit} · {p.pct}%{p.fromDemo ? ` · +${p.fromDemo} confirmed in this demo` : ''}</p>
          </div>
        );
      })}

      <div className="op-card">
        <h3 className="op-h3">Partner request status</h3>
        <div className="op-kpis op-kpis--5">
          <div><span>Submitted</span><strong>{ngoRequests.length}</strong></div>
          <div><span>Verified</span><strong>{count((r) => r.verified)}</strong></div>
          <div><span>Completed</span><strong>{count(confirmed)}</strong></div>
          <div><span>Rejected</span><strong>{count((r) => r.status === 'rejected')}</strong></div>
          <div><span>Blocked</span><strong>{count((r) => r.status === 'blocked')}</strong></div>
        </div>
      </div>
    </div>
  );
}
