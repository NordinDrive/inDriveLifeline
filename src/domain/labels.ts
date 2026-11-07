import type { BonusStatus, DriverEligibility, Mission, MissionStatus, PassengerRequest, RequestStatus, Tone } from './types';

export const ELIGIBILITY_LABEL: Record<DriverEligibility, string> = {
  not_enrolled: 'Not Enrolled',
  pending_review: 'Pending Review',
  verified: 'Lifeline Verified',
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
  submitted: 'Submitted',
  under_review: 'Needs Review',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
};

export const MISSION_LABEL: Record<MissionStatus, string> = {
  pending_offer: 'Pending offer',
  offered: 'Offered',
  accepted: 'Accepted',
  en_route: 'On my way',
  at_pickup: 'At pickup',
  onboard: 'Onboard',
  arrived: 'Arrived',
  awaiting_confirmation: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
};

/** Customer-facing tracker steps for the passenger (spec §5.4). */
export const TRACKER_STEPS = [
  'Submitted',
  'Needs Review',
  'Approved',
  'Searching for Driver',
  'Driver Assigned',
  'On the Way',
  'Picked Up',
  'Arrived',
  'Confirmed',
] as const;

export function trackerIndex(req: PassengerRequest, mission: Mission | undefined): number {
  if (mission && !['cancelled', 'blocked'].includes(mission.status)) {
    const map: Partial<Record<MissionStatus, number>> = {
      offered: 3,
      accepted: 4,
      en_route: 5,
      at_pickup: 5,
      onboard: 6,
      arrived: 7,
      awaiting_confirmation: 7,
      confirmed: 9,
    };
    return map[mission.status] ?? 3;
  }
  if (req.status === 'approved') return 2;
  if (req.status === 'verified' || req.status === 'under_review') return 1;
  return 0;
}

export function shortTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
