import { CheckCircle2, XCircle } from 'lucide-react';
import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { pointById } from '../data/mockLocations';
import { FictionalMap } from '../components/FictionalMap';
import { missionSource } from '../components/MissionCard';
import { DemoTag, ScreenHeader } from '../components/ui';
import { acceptGates } from '../domain/dispatch';
import { routeById } from '../data/mockLocations';
import { routeDistanceKm } from '../domain/hazard';
import { SERVICE_LABEL } from '../domain/workflow';
import { useDriverMissions } from './useDriverMissions';

export function MissionDetails() {
  const setUi = useDemo((s) => s.setUi);
  const missionId = useDemo((s) => s.ui.driver.missionId);
  const { domain, driver, accept, decline } = useDriverMissions();
  const mission = domain.missions.find((m) => m.id === missionId);
  if (!mission) {
    return (
      <div className="screen scroll ll">
        <ScreenHeader title="Mission" onBack={() => setUi('driver', { screen: 'lifeline' })} />
        <p className="d-empty">This mission is no longer available.</p>
      </div>
    );
  }
  const gates = acceptGates(domain, mission, driver);
  const ok = gates.every((g) => g.pass);
  const offered = mission.status === 'offered' && !mission.declinedBy.includes(PHONE_DRIVER_ID);

  return (
    <div className="screen scroll ll">
      <ScreenHeader title={SERVICE_LABEL[mission.service]} subtitle={`${mission.id} · ${missionSource(domain, mission)}`} onBack={() => setUi('driver', { screen: 'lifeline' })} />
      <div className="trk-map"><FictionalMap variant="card" highlightRouteId={mission.routeId} focusPointIds={[mission.pickupId, mission.destinationId]} showLegend /></div>
      <div className="trk-route">
        <div><span className="dot dot--from" />{pointById(mission.pickupId)?.label}</div>
        <div><span className="dot dot--to" />{pointById(mission.destinationId)?.label}</div>
        <small>{routeDistanceKm(routeById(mission.routeId))} km indicative · {mission.passengers ? `${mission.passengers} passengers` : mission.load}</small>
      </div>
      <div className="earn">
        <div><span>Base mission compensation</span><strong>{mission.baseCompensation} MAD</strong></div>
        <div className="earn-bonus"><span>Lifeline bonus</span><strong>+{mission.bonus} MAD</strong></div>
        <div className="earn-total"><span>Total potential earnings</span><strong>{mission.baseCompensation + mission.bonus} MAD</strong></div>
      </div>
      <div className="ll-card">
        <h4>Dispatch checks</h4>
        <ul className="gates">
          {gates.map((g) => (
            <li key={g.id} className={g.pass ? 'pass' : 'fail'}>
              {g.pass ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              <span><strong>{g.label}</strong><small>{g.detail}</small></span>
            </li>
          ))}
        </ul>
      </div>
      <p className="fine pad">Bonus is paid only once, after the coordinator confirms completion. It never depends on speed. You can refuse without penalty.</p>
      {offered && (
        <div className="form-actions">
          <button className="btn-lime" disabled={!ok} onClick={() => accept(mission.id)}>Accept mission</button>
          <button className="btn-dark" onClick={() => { decline(mission.id); setUi('driver', { screen: 'lifeline' }); }}>Decline</button>
        </div>
      )}
      <div className="ll-foot"><DemoTag>Fictional route and amounts</DemoTag></div>
    </div>
  );
}
