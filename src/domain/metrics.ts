import { BONUS_BUDGET } from './rewards';
import type { DomainState, ImpactMetrics } from './types';

// Impact counters are derived from state, so they can never double-count:
// only confirmed missions contribute to outputs.
export function computeImpact(state: DomainState): ImpactMetrics {
  const confirmed = state.missions.filter((m) => m.status === 'confirmed');
  const bonuses = Object.values(state.bonuses);
  const approvedBonuses = bonuses.filter((b) => b.status === 'approved');
  const acceptTimes = state.missions
    .filter((m) => m.offeredAt && m.acceptedAt)
    .map((m) => (Date.parse(m.acceptedAt!) - Date.parse(m.offeredAt!)) / 1000)
    .sort((a, b) => a - b);
  const blockedIds = new Set([
    ...state.requests.filter((r) => r.status === 'blocked').map((r) => r.id),
    ...state.missions.filter((m) => m.status === 'blocked').map((m) => m.requestId),
  ]);
  const drivers = Object.values(state.drivers);
  return {
    requestsReceived: state.requests.length,
    approvedRequests: state.missions.length,
    confirmedMissions: confirmed.length,
    peopleTransported: confirmed.reduce((acc, m) => acc + m.passengers, 0),
    verifiedVolunteers: drivers.filter((d) => d.eligibility === 'verified').length,
    availableVolunteers: drivers.filter((d) => d.eligibility === 'verified' && d.online && d.available).length,
    blockedRequests: blockedIds.size,
    bonusesApprovedCount: approvedBonuses.length,
    bonusesApprovedTotal: approvedBonuses.reduce((acc, b) => acc + b.bonus, 0),
    bonusesPendingTotal: bonuses
      .filter((b) => ['pending_completion', 'pending_confirmation', 'held'].includes(b.status))
      .reduce((acc, b) => acc + b.bonus, 0),
    bonusBudget: BONUS_BUDGET,
    medianAcceptSeconds: acceptTimes.length ? acceptTimes[Math.floor(acceptTimes.length / 2)] : null,
  };
}
