import { createInitialState } from '../src/data/initialState';
import { PHONE_DRIVER_ID } from '../src/data/mockDrivers';
import { PASSENGER } from '../src/data/mockPassenger';
import * as wf from '../src/domain/workflow';
import type { DomainState, Outcome } from '../src/domain/types';

export const NOW = '2026-11-06T10:00:00.000Z';

export function must(o: Outcome): DomainState {
  if (!o.ok) throw new Error(`Expected ok, got: ${o.reasons.join('; ')}`);
  return o.state;
}

/** Phone driver volunteers, is verified by the Admin and opts in to Lifeline missions. */
export function availableVolunteer(state = createInitialState()): DomainState {
  let s = must(
    wf.applyForLifeline(state, PHONE_DRIVER_ID, { safetyTraining: true, conductAccepted: true, vehicleChecked: true, seats: 3, accessible: false }, NOW),
  );
  s = must(wf.approveDriver(s, PHONE_DRIVER_ID, NOW));
  return must(wf.setLifelineAvailability(s, PHONE_DRIVER_ID, true, NOW));
}

export function quakeA(state: DomainState): DomainState {
  return must(wf.activateScenario(state, { type: 'earthquake', districtId: 'A', severity: 'high', name: '' }, NOW));
}

export function shelterInput(overrides: Partial<wf.RequestInput> = {}): wf.RequestInput {
  return {
    source: 'passenger',
    requesterId: PASSENGER.id,
    pickupId: 'P-ALPHA',
    destinationId: 'S-GREEN',
    passengers: 3,
    accessibility: 'none',
    ...overrides,
  };
}

/** Admin activates, passenger requests, Admin approves: returns the published mission. */
export function publishedMission(overrides: Partial<wf.RequestInput> = {}) {
  let s = quakeA(availableVolunteer());
  const sub = wf.submitRequest(s, shelterInput(overrides), NOW);
  s = must(sub);
  const approved = wf.approveRequest(s, sub.id!, NOW);
  s = must(approved);
  return { state: s, reqId: sub.id!, missionId: approved.id! };
}

export function runToAwaiting(state: DomainState, missionId: string) {
  let s = must(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW));
  for (let i = 0; i < 5; i++) s = must(wf.advanceMission(s, missionId, PHONE_DRIVER_ID, NOW));
  return s;
}
