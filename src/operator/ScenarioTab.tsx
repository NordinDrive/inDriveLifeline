import { useEffect, useState } from 'react';
import { useDemo } from '../app/store';
import { DISTRICTS, SAFE_ROUTES } from '../data/mockLocations';
import { PASSENGER } from '../data/mockPassenger';
import { SCENARIO_TEMPLATES, SEVERITY_LABEL } from '../data/mockScenarios';
import { FictionalMap } from '../components/FictionalMap';
import { DISASTER_ICON } from '../components/PhoneOverlays';
import { Badge } from '../components/ui';
import { routeStatus, routeStatusReason } from '../domain/hazard';
import type { DisasterType, DistrictId, LayerToggles, Severity } from '../domain/types';
import { activateScenario, resolveScenario, scenarioName, simulateResidentRequest } from '../domain/workflow';

const TYPES = Object.keys(SCENARIO_TEMPLATES) as DisasterType[];
const SEVERITIES: Severity[] = ['advisory', 'high', 'critical'];

export function ScenarioTab() {
  const disaster = useDemo((s) => s.domain.disaster);
  const layers = useDemo((s) => s.domain.layers);
  const perform = useDemo((s) => s.perform);
  const setUi = useDemo((s) => s.setUi);
  const active = disaster.status === 'active';

  const [type, setType] = useState<DisasterType>(disaster.type);
  const [districtId, setDistrict] = useState<DistrictId>(disaster.districtId);
  const [severity, setSeverity] = useState<Severity>(disaster.severity);
  const [name, setName] = useState(active ? disaster.name : '');

  // Keep the form in step with resets or guided-demo actions.
  useEffect(() => {
    setType(disaster.type);
    setDistrict(disaster.districtId);
    setSeverity(disaster.severity);
    setName(disaster.status === 'active' ? disaster.name : '');
  }, [disaster.revision, disaster.type, disaster.districtId, disaster.severity, disaster.status, disaster.name]);

  const placeholder = scenarioName({ type, districtId, severity });
  const changed = active && (type !== disaster.type || districtId !== disaster.districtId || severity !== disaster.severity || (name || placeholder) !== disaster.name);
  const cfg = { type, districtId, severity, name: name || placeholder };

  const setLayer = (k: keyof LayerToggles) =>
    useDemo.setState((s) => ({ domain: { ...s.domain, layers: { ...s.domain.layers, [k]: !s.domain.layers[k] } } }));

  return (
    <div className="op-stack">
      <div className="op-card">
        <div className={`op-status ${active ? 'is-active' : ''}`}>
          <strong>{active ? 'Lifeline is ACTIVE' : disaster.status === 'resolved' ? 'Scenario resolved · Lifeline closed' : 'Lifeline is INACTIVE'}</strong>
          <span>
            {active
              ? `Passengers in ${DISTRICTS[disaster.districtId].label} can request shelter transport. Volunteers see approved missions.`
              : 'Passengers see an inactive message and cannot request transport. Only the Admin can activate.'}
          </span>
        </div>

        <label className="op-label">Disaster type</label>
        <div className="op-types">
          {TYPES.map((t) => {
            const Icon = DISASTER_ICON[t];
            return (
              <button key={t} className={type === t ? 'is-on' : ''} onClick={() => setType(t)} aria-pressed={type === t}>
                <Icon size={18} />
                {SCENARIO_TEMPLATES[t].label}
              </button>
            );
          })}
        </div>
        <div className="op-row">
          <div>
            <label className="op-label" htmlFor="op-district">Affected area</label>
            <select id="op-district" value={districtId} onChange={(e) => setDistrict(e.target.value as DistrictId)}>
              {Object.values(DISTRICTS).map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="op-label">Severity</label>
            <div className="op-seg op-seg--sm">
              {SEVERITIES.map((s) => (
                <button key={s} className={severity === s ? `is-on sev-${s}` : ''} onClick={() => setSeverity(s)}>{SEVERITY_LABEL[s]}</button>
              ))}
            </div>
          </div>
        </div>
        {districtId !== PASSENGER.districtId && (
          <p className="op-note">The demo passenger lives in {DISTRICTS[PASSENGER.districtId].label}, and all designated pickup points are there. Choose it to show Lifeline on the Passenger phone.</p>
        )}
        <label className="op-label" htmlFor="op-name">Scenario name</label>
        <input id="op-name" value={name} placeholder={placeholder} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <div className="op-actions">
          <button className="op-btn op-btn--danger" disabled={active} onClick={() => perform((s, now) => activateScenario(s, cfg, now))}>Activate Lifeline</button>
          <button className="op-btn" disabled={!changed} onClick={() => perform((s, now) => activateScenario(s, cfg, now))}>Update scenario</button>
          <button className="op-btn op-btn--ok" disabled={!active} onClick={() => perform((s, now) => resolveScenario(s, now))}>Resolve scenario</button>
        </div>
      </div>

      <div className="op-card">
        <div className="op-map"><FictionalMap variant="operator" network showLegend /></div>
        <div className="op-toggles">
          {([['affected', 'Affected areas'], ['pickups', 'Pickup points'], ['shelters', 'Shelters'], ['routes', 'Route statuses']] as const).map(([k, l]) => (
            <label key={k}><input type="checkbox" checked={layers[k]} onChange={() => setLayer(k)} />{l}</label>
          ))}
        </div>
        <table className="op-table">
          <thead><tr><th>Route</th><th>Status</th><th>Why</th></tr></thead>
          <tbody>
            {SAFE_ROUTES.map((r) => {
              const st = routeStatus(r, disaster);
              return (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td><Badge tone={st === 'approved' ? 'success' : st === 'blocked' ? 'danger' : 'muted'}>{st}</Badge></td>
                  <td>{routeStatusReason(st)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="op-actions">
          <button
            className="op-btn"
            disabled={!active}
            title={active ? 'Adds a request from another fictional resident' : 'Activate Lifeline first'}
            onClick={() => {
              const out = perform((s, now) => simulateResidentRequest(s, now));
              if (out.ok) setUi('operator', { tab: 'queue', selectedRequestId: out.id });
            }}
          >
            Simulate resident request
          </button>
        </div>
      </div>
    </div>
  );
}
