import { createInitialState } from '../src/data/initialState';
import { PHONE_DRIVER_ID } from '../src/data/mockDrivers';
import { PASSENGER } from '../src/data/mockNGOs';
import * as wf from '../src/domain/workflow';
import type { DomainState, Outcome } from '../src/domain/types';

export const NOW = '2026-11-06T10:00:00.000Z';

export function must(o: Outcome): DomainState {
  if (!o.ok) throw new Error(`Expected ok, got: ${o.reasons.join('; ')}`);
  return o.state;
}

export function verifiedOnlineDriver(state = createInitialState()): DomainState {
  let s = must(
    wf.applyForLifeline(state, PHONE_DRIVER_ID, { safetyTraining: true, conductAccepted: true, vehicleChecked: true, seats: 3, accessible: false }, NOW),
  );
  s = must(wf.approveDriver(s, PHONE_DRIVER_ID, NOW));
  return must(wf.setDriverOnline(s, PHONE_DRIVER_ID, true, NOW));
}

export function quakeA(state: DomainState): DomainState {
  return must(wf.activateScenario(state, { type: 'earthquake', districtId: 'A', severity: 'high', name: '' }, NOW));
}

export function evacuationInput(overrides: Partial<wf.RequestInput> = {}): wf.RequestInput {
  return {
    source: 'passenger',
    requesterId: PASSENGER.id,
    service: 'evacuation_transfer',
    pickupId: 'P-ALPHA',
    destinationId: 'S-GREEN',
    passengers: 3,
    accessibility: 'none',
    note: '',
    acknowledged: true,
    ...overrides,
  };
}

/** Runs the primary journey up to an offered mission; returns state + ids. */
export function offeredEvacuation() {
  let s = quakeA(verifiedOnlineDriver());
  const sub = wf.submitRequest(s, evacuationInput(), NOW);
  s = must(sub);
  const reqId = sub.id!;
  s = must(wf.verifyNeed(s, reqId, NOW));
  s = must(wf.approveRoute(s, reqId, NOW));
  const off = wf.offerMission(s, reqId, NOW);
  s = must(off);
  return { state: s, reqId, missionId: off.id! };
}
