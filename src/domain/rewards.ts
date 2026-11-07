import type { BonusRecord, BonusStatus } from './types';

// Fictional illustrative amounts (MAD). Not an inDrive rate card or incentive policy.
// The trip fare and the Lifeline bonus are always shown as separate lines.
export const LIFELINE_EARNINGS = { base: 25, bonus: 15 } as const;

export const BONUS_BUDGET = 5000;

/** The bonus can only be approved once, after a confirmed completion, and never while held. */
export function canApproveBonus(record: BonusRecord | undefined, missionConfirmed: boolean): { ok: boolean; reason?: string } {
  if (!record) return { ok: false, reason: 'No bonus record for this mission' };
  if (record.status === 'approved') return { ok: false, reason: 'Bonus already approved' };
  if (record.status === 'held') return { ok: false, reason: 'Bonus is held for review' };
  if (record.status === 'not_eligible') return { ok: false, reason: 'Mission not eligible for a bonus' };
  if (!missionConfirmed) return { ok: false, reason: 'Completion not yet confirmed' };
  return { ok: true };
}

export function bonusTotals(records: BonusRecord[], driverId: string) {
  const mine = records.filter((r) => r.driverId === driverId);
  const sum = (statuses: BonusStatus[], key: 'base' | 'bonus') =>
    mine.filter((r) => statuses.includes(r.status)).reduce((acc, r) => acc + r[key], 0);
  return {
    approvedBase: sum(['approved'], 'base'),
    approvedBonus: sum(['approved'], 'bonus'),
    pendingBase: sum(['pending_completion', 'pending_confirmation', 'held'], 'base'),
    pendingBonus: sum(['pending_completion', 'pending_confirmation', 'held'], 'bonus'),
  };
}
