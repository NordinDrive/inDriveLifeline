import { describe, expect, it } from 'vitest';
import { PHONE_DRIVER_ID } from '../src/data/mockDrivers';
import { computeImpact } from '../src/domain/metrics';
import * as wf from '../src/domain/workflow';
import type { DomainState } from '../src/domain/types';
import { must, NOW, offeredEvacuation } from './helpers';

function runToAwaiting(state: DomainState, missionId: string) {
  let s = must(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW));
  for (let i = 0; i < 5; i++) s = must(wf.advanceMission(s, missionId, PHONE_DRIVER_ID, NOW));
  return s;
}

describe('bonus and impact invariants', () => {
  it('shows base compensation and bonus separately (25 + 15)', () => {
    const { state, missionId } = offeredEvacuation();
    const m = state.missions.find((x) => x.id === missionId)!;
    expect([m.baseCompensation, m.bonus]).toEqual([25, 15]);
  });

  it('bonus is not approved before confirmed completion', () => {
    const { state, missionId } = offeredEvacuation();
    const s = runToAwaiting(state, missionId);
    expect(s.bonuses[missionId].status).toBe('pending_confirmation');
    expect(computeImpact(s).bonusesApprovedCount).toBe(0);
    expect(computeImpact(s).peopleTransported).toBe(0);
  });

  it('confirmation approves the bonus exactly once and counts impact once', () => {
    const { state, missionId } = offeredEvacuation();
    let s = runToAwaiting(state, missionId);
    s = must(wf.confirmCompletion(s, missionId, NOW));
    const again = wf.confirmCompletion(s, missionId, NOW);
    expect(again.ok).toBe(false);
    const impact = computeImpact(again.state);
    expect(again.state.bonuses[missionId].status).toBe('approved');
    expect(impact.bonusesApprovedCount).toBe(1);
    expect(impact.bonusesApprovedTotal).toBe(15);
    expect(impact.peopleTransported).toBe(3);
    expect(impact.confirmedMissions).toBe(1);
  });

  it('held bonuses stay held after confirmation until released', () => {
    const { state, missionId } = offeredEvacuation();
    let s = runToAwaiting(state, missionId);
    s = must(wf.holdBonus(s, missionId, 'Spot check', NOW));
    s = must(wf.confirmCompletion(s, missionId, NOW));
    expect(s.bonuses[missionId].status).toBe('held');
    s = must(wf.releaseBonus(s, missionId, NOW));
    expect(s.bonuses[missionId].status).toBe('approved');
  });

  it('driver cannot advance past awaiting confirmation or skip ahead while paused', () => {
    const { state, missionId } = offeredEvacuation();
    let s = must(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW));
    s = must(wf.reportSafetyIssue(s, missionId, PHONE_DRIVER_ID, NOW));
    expect(wf.advanceMission(s, missionId, PHONE_DRIVER_ID, NOW).ok).toBe(false);
    s = must(wf.clearSafetyHold(s, missionId, NOW));
    for (let i = 0; i < 5; i++) s = must(wf.advanceMission(s, missionId, PHONE_DRIVER_ID, NOW));
    expect(wf.advanceMission(s, missionId, PHONE_DRIVER_ID, NOW).ok).toBe(false);
  });

  it('cancelled missions are not eligible for a bonus', () => {
    const { state, missionId } = offeredEvacuation();
    let s = must(wf.acceptMission(state, missionId, PHONE_DRIVER_ID, NOW));
    s = must(wf.cancelMission(s, missionId, 'Test', NOW));
    expect(s.bonuses[missionId].status).toBe('not_eligible');
  });

  it('submitting a request does not increment completed outputs', () => {
    const { state } = offeredEvacuation();
    expect(computeImpact(state).confirmedMissions).toBe(0);
  });
});
