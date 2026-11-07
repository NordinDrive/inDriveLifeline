import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/data/initialState';
import { PHONE_DRIVER_ID } from '../src/data/mockDrivers';
import * as wf from '../src/domain/workflow';
import { must, NOW, publishedMission, quakeA } from './helpers';

const FORM = { safetyTraining: true, conductAccepted: true, vehicleChecked: true, seats: 3, accessible: false };

/** Publishes a mission while the phone driver is in a given (non-ready) state. */
function missionWithDriver(prepare: (s: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>) {
  let s = quakeA(prepare(createInitialState()));
  const sub = wf.submitRequest(s, { source: 'passenger', pickupId: 'P-ALPHA', destinationId: 'S-GREEN', passengers: 2, accessibility: 'none' }, NOW);
  s = must(sub);
  const pub = wf.approveRequest(s, sub.id!, NOW);
  return { state: must(pub), missionId: pub.id! };
}

describe('volunteer eligibility', () => {
  it('a driver who has not joined Lifeline cannot accept', () => {
    const { state, missionId } = missionWithDriver((s) => must(wf.setDriverOnline(s, PHONE_DRIVER_ID, true, NOW)));
    const out = wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW);
    expect(out.ok).toBe(false);
    expect(out.reasons.join()).toMatch(/Join Lifeline/);
  });

  it('a pending volunteer cannot accept or become available until the Admin verifies them', () => {
    const { state, missionId } = missionWithDriver((s) => must(wf.setDriverOnline(must(wf.applyForLifeline(s, PHONE_DRIVER_ID, FORM, NOW)), PHONE_DRIVER_ID, true, NOW)));
    expect(wf.setLifelineAvailability(state, PHONE_DRIVER_ID, true, NOW).ok).toBe(false);
    expect(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW).ok).toBe(false);
    let s = must(wf.approveDriver(state, PHONE_DRIVER_ID, NOW));
    s = must(wf.setLifelineAvailability(s, PHONE_DRIVER_ID, true, NOW));
    expect(wf.acceptMission(s, missionId, PHONE_DRIVER_ID, NOW).ok).toBe(true);
  });

  it('a verified volunteer must also choose to be available', () => {
    const { state, missionId } = missionWithDriver((s) =>
      must(wf.setDriverOnline(must(wf.approveDriver(must(wf.applyForLifeline(s, PHONE_DRIVER_ID, FORM, NOW)), PHONE_DRIVER_ID, NOW)), PHONE_DRIVER_ID, true, NOW)),
    );
    const out = wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW);
    expect(out.ok).toBe(false);
    expect(out.reasons.join()).toMatch(/Not available/);
  });

  it('going offline ends Lifeline availability', () => {
    let { state } = publishedMission();
    state = must(wf.setDriverOnline(state, PHONE_DRIVER_ID, false, NOW));
    expect(state.drivers[PHONE_DRIVER_ID].available).toBe(false);
  });

  it('enrollment requires training, conduct and vehicle check', () => {
    const out = wf.applyForLifeline(createInitialState(), PHONE_DRIVER_ID, { ...FORM, safetyTraining: false }, NOW);
    expect(out.ok).toBe(false);
  });

  it('suspended drivers cannot accept', () => {
    let { state, missionId } = publishedMission();
    state = must(wf.suspendDriver(state, PHONE_DRIVER_ID, NOW));
    expect(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW).ok).toBe(false);
  });

  it('drivers need enough seats', () => {
    const { state, missionId } = publishedMission({ passengers: 4 });
    const out = wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW);
    expect(out.ok).toBe(false); // Alex declares 3 passenger seats
    expect(out.reasons.join()).toMatch(/seats/);
  });

  it('wheelchair requests need an accessible vehicle', () => {
    let { state, missionId } = publishedMission({ accessibility: 'wheelchair', passengers: 1 });
    expect(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW).ok).toBe(false);
    state = must(wf.setLifelineAvailability(state, 'DRV-002', true, NOW));
    expect(wf.acceptMission(state, missionId, 'DRV-002', NOW).ok).toBe(true);
  });

  it('passenger form rejects more than 4 passengers', () => {
    const s = quakeA(createInitialState());
    expect(wf.validateRequest(s, { source: 'passenger', pickupId: 'P-ALPHA', destinationId: 'S-GREEN', passengers: 5, accessibility: 'none' }).passengers).toBeDefined();
  });
});
