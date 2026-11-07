import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { acceptGates, failedReasons, IN_PROGRESS_STATUSES } from '../domain/dispatch';
import { acceptMission, declineMission } from '../domain/workflow';

/** Offers visible to the phone driver, each with its accept-gate reasons. */
export function useDriverMissions() {
  const domain = useDemo((s) => s.domain);
  const perform = useDemo((s) => s.perform);
  const setUi = useDemo((s) => s.setUi);
  const driver = domain.drivers[PHONE_DRIVER_ID];
  const offers = domain.missions
    .filter((m) => m.status === 'offered' && !m.declinedBy.includes(PHONE_DRIVER_ID))
    .map((m) => ({ mission: m, reasons: failedReasons(acceptGates(domain, m, driver)) }));
  const active = domain.missions.find((m) => m.driverId === PHONE_DRIVER_ID && [...IN_PROGRESS_STATUSES, 'awaiting_confirmation'].includes(m.status));
  const history = domain.missions.filter((m) => m.driverId === PHONE_DRIVER_ID);

  const accept = (missionId: string) => {
    const out = perform((s, now) => acceptMission(s, missionId, PHONE_DRIVER_ID, now));
    if (out.ok) setUi('driver', { screen: 'active', missionId, menuOpen: false });
  };
  const decline = (missionId: string) => perform((s, now) => declineMission(s, missionId, PHONE_DRIVER_ID, now));
  const details = (missionId: string) => setUi('driver', { screen: 'mission', missionId });

  return { domain, driver, offers, active, history, accept, decline, details };
}
