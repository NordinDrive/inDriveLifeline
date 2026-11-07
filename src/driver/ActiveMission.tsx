import { AlertOctagon, CheckCircle2, Clock } from 'lucide-react';
import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { pointById } from '../data/mockLocations';
import { FictionalMap } from '../components/FictionalMap';
import { Badge, ScreenHeader } from '../components/ui';
import { EarningsLines } from '../components/MissionCard';
import { BONUS_LABEL } from '../domain/labels';
import { advanceMission, MISSION_ACTION, MISSION_FLOW, reportSafetyIssue, SERVICE_LABEL } from '../domain/workflow';

export function ActiveMission() {
  const setUi = useDemo((s) => s.setUi);
  const perform = useDemo((s) => s.perform);
  const missionId = useDemo((s) => s.ui.driver.missionId);
  const domain = useDemo((s) => s.domain);
  const mission = domain.missions.find((m) => m.id === missionId && m.driverId === PHONE_DRIVER_ID);

  if (!mission) {
    return (
      <div className="screen scroll ll">
        <ScreenHeader title="Mission" onBack={() => setUi('driver', { screen: 'lifeline' })} />
        <p className="d-empty">No active mission.</p>
      </div>
    );
  }

  const labels = ['Accepted', 'On my way', 'Arrived at pickup', 'Passengers picked up', 'Arrived at shelter', 'Completion submitted'];
  const idx = MISSION_FLOW.indexOf(mission.status);
  const bonus = domain.bonuses[mission.id];
  const terminal = ['confirmed', 'cancelled', 'blocked'].includes(mission.status);

  return (
    <div className="screen scroll ll">
      <ScreenHeader title={SERVICE_LABEL} subtitle={`${mission.id} · ${mission.passengers} passenger${mission.passengers > 1 ? 's' : ''}`} onBack={() => setUi('driver', { screen: 'lifeline' })} />
      <div className="trk-map"><FictionalMap variant="card" highlightRouteId={mission.routeId} focusPointIds={[mission.pickupId, mission.destinationId]} /></div>
      {mission.safetyHold && (
        <div className="inline-warn inline-warn--danger">
          <strong>Paused for safety.</strong> {mission.safetyHold.reason}. Stay at a safe location and wait for the Lifeline Admin. No penalty applies.
        </div>
      )}
      <div className="trk-route">
        <div><span className="dot dot--from" />{pointById(mission.pickupId)?.label}</div>
        <div><span className="dot dot--to" />{pointById(mission.destinationId)?.label}</div>
      </div>
      <ol className="trk-steps">
        {labels.map((l, i) => (
          <li key={l} className={mission.status === 'confirmed' || i <= idx ? 'done' : i === idx + 1 ? 'current' : ''}>
            <span className="trk-dot">{mission.status === 'confirmed' || i <= idx ? <CheckCircle2 size={16} /> : null}</span>
            <span>{l}</span>
          </li>
        ))}
        <li className={mission.status === 'confirmed' ? 'done' : mission.status === 'awaiting_confirmation' ? 'current' : ''}>
          <span className="trk-dot">{mission.status === 'confirmed' ? <CheckCircle2 size={16} /> : null}</span>
          <span>Admin confirmation</span>
        </li>
      </ol>
      {bonus && (
        <EarningsLines
          base={bonus.base}
          bonus={bonus.bonus}
          status={<Badge tone={bonus.status === 'approved' ? 'success' : bonus.status === 'held' ? 'warn' : bonus.status === 'not_eligible' ? 'danger' : 'muted'}>{BONUS_LABEL[bonus.status]}</Badge>}
        />
      )}
      {mission.status === 'awaiting_confirmation' && (
        <p className="trk-note"><Clock size={16} /> Completion submitted. Your bonus stays pending until the Lifeline Admin confirms completion.</p>
      )}
      {mission.status === 'confirmed' && <p className="trk-note"><CheckCircle2 size={16} /> Mission confirmed and bonus approved. Thank you for volunteering.</p>}
      {mission.status === 'cancelled' && <p className="trk-note">This mission was cancelled. No penalty applies, and cancelled missions do not earn a bonus.</p>}
      <div className="form-actions">
        {MISSION_ACTION[mission.status] && (
          <button className="btn-lime" disabled={Boolean(mission.safetyHold)} onClick={() => perform((s, now) => advanceMission(s, mission.id, PHONE_DRIVER_ID, now))}>
            {MISSION_ACTION[mission.status]}
          </button>
        )}
        {!terminal && mission.status !== 'awaiting_confirmation' && !mission.safetyHold && (
          <button className="btn-danger-ghost" onClick={() => perform((s, now) => reportSafetyIssue(s, mission.id, PHONE_DRIVER_ID, now))}>
            <AlertOctagon size={18} /> Report safety concern &amp; pause
          </button>
        )}
      </div>
    </div>
  );
}
