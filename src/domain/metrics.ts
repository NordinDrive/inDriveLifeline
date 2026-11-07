import { isTransport } from './eligibility';
import { BONUS_BUDGET } from './rewards';
import type { Campaign, DomainState, ImpactMetrics } from './types';

// Impact counters are derived from state, so they can never double-count:
// only confirmed missions contribute to outputs.
export function computeImpact(state: DomainState): ImpactMetrics {
  const confirmed = state.missions.filter((m) => m.status === 'confirmed');
  const reqById = new Map(state.requests.map((r) => [r.id, r]));
  const approvedBonuses = Object.values(state.bonuses).filter((b) => b.status === 'approved');
  const acceptTimes = state.missions
    .filter((m) => m.offeredAt && m.acceptedAt)
    .map((m) => (Date.parse(m.acceptedAt!) - Date.parse(m.offeredAt!)) / 1000)
    .sort((a, b) => a - b);
  const blockedIds = new Set([
    ...state.requests.filter((r) => r.status === 'blocked').map((r) => r.id),
    ...state.missions.filter((m) => m.status === 'blocked').map((m) => m.requestId),
  ]);
  return {
    requestsReceived: state.requests.length,
    requestsVerified: state.requests.filter((r) => r.verified).length,
    approvedMissions: state.missions.filter((m) => !['cancelled', 'blocked'].includes(m.status)).length,
    confirmedMissions: confirmed.length,
    peopleTransported: confirmed.filter((m) => isTransport(m.service)).reduce((acc, m) => acc + m.passengers, 0),
    deliveriesCompleted: confirmed.filter((m) => !isTransport(m.service)).length,
    activeVerifiedDrivers: Object.values(state.drivers).filter((d) => d.eligibility === 'verified').length,
    ngoPartnerMissions: confirmed.filter((m) => {
      const r = reqById.get(m.requestId);
      return r && r.source !== 'passenger';
    }).length,
    blockedRequests: blockedIds.size,
    bonusesApprovedCount: approvedBonuses.length,
    bonusesApprovedTotal: approvedBonuses.reduce((acc, b) => acc + b.bonus, 0),
    bonusBudget: BONUS_BUDGET,
    medianAcceptSeconds: acceptTimes.length ? acceptTimes[Math.floor(acceptTimes.length / 2)] : null,
  };
}

export function campaignProgress(state: DomainState, campaign: Campaign) {
  const reqIds = new Set(state.requests.filter((r) => r.campaignId === campaign.id).map((r) => r.id));
  const fromDemo = state.missions.filter((m) => m.status === 'confirmed' && reqIds.has(m.requestId)).length;
  const completed = campaign.baselineCompleted + fromDemo;
  return { completed, fromDemo, pct: Math.min(100, Math.round((completed / campaign.goal) * 100)) };
}
