import { describe, expect, it } from 'vitest';
import { PHONE_DRIVER_ID } from '../src/data/mockDrivers';
import { computeImpact } from '../src/domain/metrics';
import { bonusTotals } from '../src/domain/rewards';
import * as wf from '../src/domain/workflow';
import { must, NOW, publishedMission, runToAwaiting } from './helpers';

describe('bonus and impact invariants', () => {
  it('shows trip fare and bonus separately before acceptance (25 + 15)', () => {
    const { state, missionId } = publishedMission();
    const m = state.missions.find((x) => x.id === missionId)!;
    expect([m.baseCompensation, m.bonus]).toEqual([25, 15]);
    expect(state.bonuses[missionId]).toBeUndefined();
  });

  it('runs the complete journey: activate → request → approve → accept → pickup → shelter → confirm → bonus', () => {
    let { state, reqId, missionId } = publishedMission();
    state = must(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW));
    const statuses = [];
    for (let i = 0; i < 5; i++) {
      state = must(wf.advanceMission(state, missionId, PHONE_DRIVER_ID, NOW));
      statuses.push(state.missions.find((m) => m.id === missionId)!.status);
    }
    expect(statuses).toEqual(['en_route', 'at_pickup', 'onboard', 'arrived', 'awaiting_confirmation']);
    state = must(wf.passengerConfirmArrival(state, missionId, NOW));
    state = must(wf.confirmCompletion(state, missionId, NOW));
    expect(state.requests.find((r) => r.id === reqId)?.status).toBe('approved');
    expect(state.missions.find((m) => m.id === missionId)?.status).toBe('confirmed');
    expect(state.bonuses[missionId].status).toBe('approved');
    expect(bonusTotals(Object.values(state.bonuses), PHONE_DRIVER_ID)).toMatchObject({ approvedBase: 25, approvedBonus: 15, pendingBonus: 0 });
  });

  it('bonus stays pending until the Admin confirms completion', () => {
    const { state, missionId } = publishedMission();
    const s = runToAwaiting(state, missionId);
    expect(s.bonuses[missionId].status).toBe('pending_confirmation');
    expect(bonusTotals(Object.values(s.bonuses), PHONE_DRIVER_ID).pendingBonus).toBe(15);
    expect(computeImpact(s).bonusesApprovedCount).toBe(0);
    expect(computeImpact(s).peopleTransported).toBe(0);
  });

  it('confirmation approves the bonus exactly once and counts impact once', () => {
    const { state, missionId } = publishedMission();
    let s = runToAwaiting(state, missionId);
    s = must(wf.confirmCompletion(s, missionId, NOW));
    const again = wf.confirmCompletion(s, missionId, NOW);
    expect(again.ok).toBe(false);
    expect(wf.releaseBonus(s, missionId, NOW).ok).toBe(false);
    const impact = computeImpact(again.state);
    expect(again.state.bonuses[missionId].status).toBe('approved');
    expect(impact.bonusesApprovedCount).toBe(1);
    expect(impact.bonusesApprovedTotal).toBe(15);
    expect(impact.peopleTransported).toBe(3);
    expect(impact.confirmedMissions).toBe(1);
  });

  it('held bonuses stay held after confirmation until released', () => {
    const { state, missionId } = publishedMission();
    let s = runToAwaiting(state, missionId);
    s = must(wf.holdBonus(s, missionId, 'Spot check', NOW));
    s = must(wf.confirmCompletion(s, missionId, NOW));
    expect(s.bonuses[missionId].status).toBe('held');
    s = must(wf.releaseBonus(s, missionId, NOW));
    expect(s.bonuses[missionId].status).toBe('approved');
  });

  it('driver cannot advance past awaiting confirmation or while paused', () => {
    const { state, missionId } = publishedMission();
    let s = must(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW));
    s = must(wf.reportSafetyIssue(s, missionId, PHONE_DRIVER_ID, NOW));
    expect(wf.advanceMission(s, missionId, PHONE_DRIVER_ID, NOW).ok).toBe(false);
    s = must(wf.clearSafetyHold(s, missionId, NOW));
    for (let i = 0; i < 5; i++) s = must(wf.advanceMission(s, missionId, PHONE_DRIVER_ID, NOW));
    expect(wf.advanceMission(s, missionId, PHONE_DRIVER_ID, NOW).ok).toBe(false);
  });

  it('cancelled missions never earn a bonus', () => {
    const { state, missionId } = publishedMission();
    let s = must(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW));
    s = must(wf.cancelMission(s, missionId, 'Test', NOW));
    expect(s.bonuses[missionId].status).toBe('not_eligible');
    expect(wf.confirmCompletion(s, missionId, NOW).ok).toBe(false);
    expect(bonusTotals(Object.values(s.bonuses), PHONE_DRIVER_ID)).toMatchObject({ approvedBonus: 0, pendingBonus: 0 });
  });

  it('submitting a request does not increment completed outputs', () => {
    const { state } = publishedMission();
    expect(computeImpact(state).confirmedMissions).toBe(0);
  });
});
