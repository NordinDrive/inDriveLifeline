import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/data/initialState';
import { PHONE_DRIVER_ID } from '../src/data/mockDrivers';
import * as wf from '../src/domain/workflow';
import { evacuationInput, must, NOW, offeredEvacuation, quakeA, verifiedOnlineDriver } from './helpers';

describe('driver eligibility', () => {
  it('an unenrolled driver cannot accept the seeded mission', () => {
    let s = createInitialState();
    s = must(wf.setDriverOnline(s, PHONE_DRIVER_ID, true, NOW));
    const out = wf.acceptMission(s, 'MSN-0001', PHONE_DRIVER_ID, NOW);
    expect(out.ok).toBe(false);
    expect(out.reasons.join()).toMatch(/verification required/i);
  });

  it('a pending driver cannot accept until the operator approves', () => {
    let s = createInitialState();
    s = must(wf.applyForLifeline(s, PHONE_DRIVER_ID, { safetyTraining: true, conductAccepted: true, vehicleChecked: true, seats: 3, accessible: false }, NOW));
    s = must(wf.setDriverOnline(s, PHONE_DRIVER_ID, true, NOW));
    expect(wf.acceptMission(s, 'MSN-0001', PHONE_DRIVER_ID, NOW).ok).toBe(false);
    s = must(wf.approveDriver(s, PHONE_DRIVER_ID, NOW));
    expect(wf.acceptMission(s, 'MSN-0001', PHONE_DRIVER_ID, NOW).ok).toBe(true);
  });

  it('enrollment requires training, conduct and vehicle check', () => {
    const out = wf.applyForLifeline(createInitialState(), PHONE_DRIVER_ID, { safetyTraining: false, conductAccepted: true, vehicleChecked: true, seats: 3, accessible: false }, NOW);
    expect(out.ok).toBe(false);
  });

  it('suspended drivers cannot accept', () => {
    let { state, missionId } = offeredEvacuation();
    state = must(wf.suspendDriver(state, PHONE_DRIVER_ID, NOW));
    expect(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW).ok).toBe(false);
  });

  it('passenger count is validated against capacity', () => {
    let s = quakeA(verifiedOnlineDriver());
    const sub = wf.submitRequest(s, evacuationInput({ passengers: 4 }), NOW);
    s = must(sub);
    s = must(wf.verifyNeed(s, sub.id!, NOW));
    s = must(wf.approveRoute(s, sub.id!, NOW));
    const offer = wf.offerMission(s, sub.id!, NOW);
    expect(offer.ok).toBe(false); // Alex has 3 seats, Yasmin is offline
  });

  it('wheelchair requests need an accessible vehicle', () => {
    let s = verifiedOnlineDriver();
    s = must(wf.verifyNeed(s, 'REQ-0002', NOW));
    s = must(wf.approveRoute(s, 'REQ-0002', NOW));
    expect(wf.offerMission(s, 'REQ-0002', NOW).ok).toBe(false);
    s = must(wf.setDriverOnline(s, 'DRV-002', true, NOW));
    const offer = wf.offerMission(s, 'REQ-0002', NOW);
    s = must(offer);
    expect(wf.acceptMission(s, offer.id!, PHONE_DRIVER_ID, NOW).ok).toBe(false);
    expect(wf.acceptMission(s, offer.id!, 'DRV-002', NOW).ok).toBe(true);
  });

  it('passenger form rejects more than 4 passengers', () => {
    const s = quakeA(createInitialState());
    expect(wf.validateRequest(s, evacuationInput({ passengers: 5 })).passengers).toBeDefined();
  });
});
