import type { AccessibilityNeed, BonusStatus, DriverEligibility, Mission, MissionStatus, PassengerRequest, RequestStatus, Tone } from './types';

export const ELIGIBILITY_LABEL: Record<DriverEligibility, string> = {
  not_enrolled: 'Not Enrolled',
  pending_review: 'Pending Review',
  verified: 'Verified Volunteer',
  suspended: 'Suspended',
  expired: 'Expired',
};

export const ELIGIBILITY_TONE: Record<DriverEligibility, Tone> = {
  not_enrolled: 'info',
  pending_review: 'warn',
  verified: 'success',
  suspended: 'danger',
  expired: 'danger',
};

export const BONUS_LABEL: Record<BonusStatus, string> = {
  not_eligible: 'Not Eligible',
  pending_completion: 'Pending',
  pending_confirmation: 'Pending confirmation',
  approved: 'Approved',
  held: 'Held for Review',
};

export const REQUEST_LABEL: Record<RequestStatus, string> = {
  under_review: 'Needs Review',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
};

export const MISSION_LABEL: Record<MissionStatus, string> = {
  offered: 'Waiting for volunteer',
  accepted: 'Accepted',
  en_route: 'On the way',
  at_pickup: 'At pickup',
  onboard: 'Passengers picked up',
  arrived: 'Arrived at shelter',
  awaiting_confirmation: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
};

/** Passenger tracker steps. Steps before the current index are done. */
export const TRACKER_STEPS = [
  'Submitted',
  'Admin review',
  'Route approved',
  'Volunteer driver assigned',
  'Driver on the way',
  'Picked up',
  'Arrived at shelter',
  'Admin confirmed',
] as const;

export function trackerIndex(req: PassengerRequest, mission: Mission | undefined): number {
  if (mission && !['cancelled', 'blocked'].includes(mission.status)) {
    const map: Partial<Record<MissionStatus, number>> = {
      offered: 3,
      accepted: 4,
      en_route: 4,
      at_pickup: 5,
      onboard: 6,
      arrived: 7,
      awaiting_confirmation: 7,
      confirmed: TRACKER_STEPS.length,
    };
    return map[mission.status] ?? 3;
  }
  if (req.status === 'approved') return 3;
  return 1;
}

export const ACCESSIBILITY_LABEL: Record<AccessibilityNeed, string> = {
  none: 'No accessibility needs',
  wheelchair: 'Wheelchair accessible vehicle',
  reduced_mobility: 'Reduced mobility',
};

export function shortTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
