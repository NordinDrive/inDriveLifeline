import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/data/initialState';
import { PHONE_DRIVER_ID } from '../src/data/mockDrivers';
import { lifelineOpenIn } from '../src/domain/dispatch';
import { routeStatusById } from '../src/domain/hazard';
import * as wf from '../src/domain/workflow';
import { availableVolunteer, must, NOW, publishedMission, quakeA, runToAwaiting, shelterInput } from './helpers';

describe('reset state', () => {
  it('starts inactive with no requests, missions or bonuses', () => {
    const s = createInitialState();
    expect(s.disaster.status).toBe('inactive');
    expect(s.requests).toHaveLength(0);
    expect(s.missions).toHaveLength(0);
    expect(Object.keys(s.bonuses)).toHaveLength(0);
    expect(s).not.toHaveProperty('ngos');
    expect(s).not.toHaveProperty('campaigns');
  });
});

describe('scenario geometry', () => {
  it('Demo District A earthquake approves ROUTE-A1 and blocks ROUTE-B2', () => {
    const s = quakeA(createInitialState());
    expect(routeStatusById('ROUTE-A1', s.disaster)).toBe('approved');
    expect(routeStatusById('ROUTE-B2', s.disaster)).toBe('blocked');
  });

  it('flood changes route availability, not only the title', () => {
    const s = must(wf.activateScenario(createInitialState(), { type: 'flood', districtId: 'A', severity: 'high', name: '' }, NOW));
    expect(routeStatusById('ROUTE-A1', s.disaster)).toBe('unknown');
    expect(routeStatusById('ROUTE-D4', s.disaster)).toBe('blocked');
    expect(routeStatusById('ROUTE-C3', s.disaster)).toBe('approved');
  });

  it('Lifeline opens only in the Admin-selected area', () => {
    const s = must(wf.activateScenario(createInitialState(), { type: 'storm', districtId: 'B', severity: 'high', name: '' }, NOW));
    expect(lifelineOpenIn(s, 'B')).toBe(true);
    expect(lifelineOpenIn(s, 'A')).toBe(false);
  });
});

describe('inactive restrictions', () => {
  it('requests cannot be submitted without an active scenario', () => {
    const out = wf.submitRequest(createInitialState(), shelterInput(), NOW);
    expect(out.ok).toBe(false);
    expect(out.reasons.join()).toMatch(/Admin-activated/);
  });

  it('requests from outside the selected area are refused', () => {
    const s = must(wf.activateScenario(createInitialState(), { type: 'earthquake', districtId: 'C', severity: 'high', name: '' }, NOW));
    expect(wf.submitRequest(s, shelterInput(), NOW).ok).toBe(false);
  });

  it('only designated pickup points and approved shelters are accepted', () => {
    const s = quakeA(createInitialState());
    expect(wf.validateRequest(s, shelterInput({ pickupId: 'S-GREEN' })).pickupId).toBeDefined();
    expect(wf.validateRequest(s, shelterInput({ destinationId: 'P-BETA' })).destinationId).toBeDefined();
  });

  it('resolving stops new requests and offers but keeps completed history and earnings', () => {
    const done = publishedMission();
    let s = must(wf.confirmCompletion(runToAwaiting(done.state, done.missionId), done.missionId, NOW));
    const open = wf.submitRequest(s, shelterInput({ pickupId: 'P-BETA', destinationId: 'S-NORTH' }), NOW);
    s = must(open);
    const offered = wf.approveRequest(s, open.id!, NOW);
    s = must(offered);
    s = must(wf.resolveScenario(s, NOW));
    expect(s.disaster.status).toBe('resolved');
    expect(s.missions.find((m) => m.id === offered.id)?.status).toBe('cancelled');
    expect(s.requests.find((r) => r.id === open.id)?.status).toBe('cancelled');
    expect(s.missions.find((m) => m.id === done.missionId)?.status).toBe('confirmed');
    expect(s.bonuses[done.missionId].status).toBe('approved');
    expect(wf.submitRequest(s, shelterInput(), NOW).ok).toBe(false);
  });

  it('a trip under way can still finish after the scenario is resolved', () => {
    let { state, missionId } = publishedMission();
    state = must(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW));
    state = must(wf.resolveScenario(state, NOW));
    const m = state.missions.find((x) => x.id === missionId)!;
    expect(m.status).toBe('accepted');
    expect(m.safetyHold).toBeUndefined();
    state = must(wf.advanceMission(state, missionId, PHONE_DRIVER_ID, NOW));
  });
});

describe('dispatch gates', () => {
  it('Admin approval publishes the mission to volunteers', () => {
    const { state, reqId, missionId } = publishedMission();
    expect(state.requests.find((r) => r.id === reqId)?.status).toBe('approved');
    expect(state.missions.find((m) => m.id === missionId)?.status).toBe('offered');
  });

  it('approval is idempotent: a second click does not create a second mission', () => {
    const { state, reqId } = publishedMission();
    const again = wf.approveRequest(state, reqId, NOW);
    expect(again.ok).toBe(false);
    expect(again.state.missions).toHaveLength(1);
  });

  it('cannot approve a blocked route', () => {
    let s = quakeA(availableVolunteer());
    const sub = wf.submitRequest(s, shelterInput({ pickupId: 'P-BETA', destinationId: 'S-GREEN' }), NOW);
    s = must(sub);
    const approve = wf.approveRequest(s, sub.id!, NOW);
    expect(approve.ok).toBe(false);
    expect(approve.reasons.join()).toMatch(/ROUTE-B2/);
    expect(approve.state.missions).toHaveLength(0);
  });

  it('cannot approve an unknown route', () => {
    let s = must(wf.activateScenario(availableVolunteer(), { type: 'flood', districtId: 'A', severity: 'high', name: '' }, NOW));
    const sub = wf.submitRequest(s, shelterInput(), NOW);
    s = must(sub);
    expect(wf.approveRequest(s, sub.id!, NOW).ok).toBe(false);
  });

  it('a mission can only be accepted by one driver', () => {
    let { state, missionId } = publishedMission();
    state = must(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW));
    state = must(wf.reinstateDriver(state, 'DRV-003', NOW));
    state = must(wf.setLifelineAvailability(state, 'DRV-003', true, NOW));
    const second = wf.acceptMission(state, missionId, 'DRV-003', NOW);
    expect(second.ok).toBe(false);
    expect(state.missions.find((m) => m.id === missionId)?.driverId).toBe(PHONE_DRIVER_ID);
  });

  it('withdraws open offers when the scenario changes and the route becomes blocked', () => {
    let { state, missionId } = publishedMission();
    state = must(wf.activateScenario(state, { type: 'flood', districtId: 'A', severity: 'critical', name: '' }, NOW));
    expect(state.missions.find((m) => m.id === missionId)?.status).toBe('blocked');
  });

  it('pauses a trip under way when its route becomes unsafe', () => {
    let { state, missionId } = publishedMission();
    state = must(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW));
    state = must(wf.activateScenario(state, { type: 'flood', districtId: 'A', severity: 'critical', name: '' }, NOW));
    expect(state.missions.find((m) => m.id === missionId)?.safetyHold?.source).toBe('system');
    expect(wf.advanceMission(state, missionId, PHONE_DRIVER_ID, NOW).ok).toBe(false);
  });

  it('declining carries no penalty and keeps the offer open for others', () => {
    let { state, missionId } = publishedMission();
    state = must(wf.declineMission(state, missionId, PHONE_DRIVER_ID, NOW));
    const m = state.missions.find((x) => x.id === missionId)!;
    expect(m.status).toBe('offered');
    expect(state.drivers[PHONE_DRIVER_ID].eligibility).toBe('verified');
  });

  it('duplicate submissions return the existing request', () => {
    let s = quakeA(createInitialState());
    const first = wf.submitRequest(s, shelterInput(), NOW);
    s = must(first);
    const second = wf.submitRequest(s, shelterInput(), NOW);
    expect(second.id).toBe(first.id);
    expect(second.state.requests).toHaveLength(s.requests.length);
  });
});
