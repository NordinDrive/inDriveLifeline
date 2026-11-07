import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/data/initialState';
import { PHONE_DRIVER_ID } from '../src/data/mockDrivers';
import { routeStatusById } from '../src/domain/hazard';
import * as wf from '../src/domain/workflow';
import { evacuationInput, must, NOW, offeredEvacuation, quakeA, verifiedOnlineDriver } from './helpers';

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

  it('all routes are approved when no scenario is active', () => {
    const s = createInitialState();
    expect(routeStatusById('ROUTE-B2', s.disaster)).toBe('approved');
  });
});

describe('dispatch gates', () => {
  it('runs the full primary journey and offers the mission', () => {
    const { state, missionId } = offeredEvacuation();
    expect(state.missions.find((m) => m.id === missionId)?.status).toBe('offered');
  });

  it('evacuation requests cannot be submitted without an active scenario', () => {
    const out = wf.submitRequest(createInitialState(), evacuationInput(), NOW);
    expect(out.ok).toBe(false);
  });

  it('cannot approve or offer a blocked route', () => {
    let s = quakeA(verifiedOnlineDriver());
    const sub = wf.submitRequest(s, evacuationInput({ pickupId: 'P-BETA', destinationId: 'S-GREEN' }), NOW);
    s = must(sub);
    s = must(wf.verifyNeed(s, sub.id!, NOW));
    const approve = wf.approveRoute(s, sub.id!, NOW);
    expect(approve.ok).toBe(false);
    expect(approve.reasons.join()).toMatch(/ROUTE-B2/);
    const offer = wf.offerMission(s, sub.id!, NOW);
    expect(offer.ok).toBe(false);
    expect(s.missions.filter((m) => m.requestId === sub.id)).toHaveLength(0);
  });

  it('cannot offer an unverified request', () => {
    let s = quakeA(verifiedOnlineDriver());
    const sub = wf.submitRequest(s, evacuationInput(), NOW);
    s = must(sub);
    expect(wf.approveRoute(s, sub.id!, NOW).ok).toBe(false);
    expect(wf.offerMission(s, sub.id!, NOW).ok).toBe(false);
  });

  it('reports "No eligible Lifeline drivers available" instead of falling back', () => {
    let s = quakeA(createInitialState());
    const sub = wf.submitRequest(s, evacuationInput(), NOW);
    s = must(sub);
    s = must(wf.verifyNeed(s, sub.id!, NOW));
    s = must(wf.approveRoute(s, sub.id!, NOW));
    const offer = wf.offerMission(s, sub.id!, NOW);
    expect(offer.ok).toBe(false);
    expect(offer.reasons).toContain('No eligible Lifeline drivers available');
  });

  it('a mission can only be accepted by one driver', () => {
    let { state, missionId } = offeredEvacuation();
    state = must(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW));
    state = must(wf.reinstateDriver(state, 'DRV-003', NOW));
    const second = wf.acceptMission(state, missionId, 'DRV-003', NOW);
    expect(second.ok).toBe(false);
    expect(state.missions.find((m) => m.id === missionId)?.driverId).toBe(PHONE_DRIVER_ID);
  });

  it('withdraws open offers when the scenario changes and the route becomes blocked', () => {
    let { state, missionId } = offeredEvacuation();
    state = must(wf.activateScenario(state, { type: 'flood', districtId: 'A', severity: 'critical', name: '' }, NOW));
    expect(state.missions.find((m) => m.id === missionId)?.status).toBe('blocked');
  });

  it('resolving a scenario withdraws unaccepted disaster offers but keeps history', () => {
    let { state, missionId } = offeredEvacuation();
    state = must(wf.resolveScenario(state, NOW));
    expect(state.missions.find((m) => m.id === missionId)?.status).toBe('cancelled');
    expect(state.disaster.status).toBe('resolved');
  });

  it('duplicate submissions return the existing request', () => {
    let s = quakeA(createInitialState());
    const first = wf.submitRequest(s, evacuationInput(), NOW);
    s = must(first);
    const second = wf.submitRequest(s, evacuationInput(), NOW);
    expect(second.id).toBe(first.id);
    expect(second.state.requests).toHaveLength(s.requests.length);
  });
});
