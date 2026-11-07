// Domain model for the Lifeline simulation. Everything here describes
// fictional demo state only: no real people, roads, payouts or alerts.
// Lifeline has one job: voluntary transport from a designated pickup point to
// an approved shelter while an Admin-activated disaster scenario is running.

export type DisasterType = 'earthquake' | 'flood' | 'wildfire' | 'storm';
export type Severity = 'advisory' | 'high' | 'critical';
export type DisasterStatus = 'inactive' | 'active' | 'resolved';
export type RouteStatus = 'approved' | 'blocked' | 'unknown';
export type DriverEligibility = 'not_enrolled' | 'pending_review' | 'verified' | 'suspended' | 'expired';
export type BonusStatus = 'not_eligible' | 'pending_completion' | 'pending_confirmation' | 'approved' | 'held';
export type DistrictId = 'A' | 'B' | 'C';

/** Who created the request: the demo passenger phone, or a simulated resident (Admin tool). */
export type RequestSource = 'passenger' | 'resident';

export type RequestStatus = 'under_review' | 'approved' | 'rejected' | 'cancelled' | 'blocked';

export type MissionStatus =
  | 'offered'
  | 'accepted'
  | 'en_route'
  | 'at_pickup'
  | 'onboard'
  | 'arrived'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'blocked';

export type AccessibilityNeed = 'none' | 'wheelchair' | 'reduced_mobility';
export type Actor = 'passenger' | 'driver' | 'operator' | 'system';
export type Tone = 'info' | 'success' | 'warn' | 'danger';

export interface Point {
  x: number;
  y: number;
}

export interface District {
  id: DistrictId;
  label: string;
  center: Point;
}

export interface SafePoint {
  id: string;
  label: string;
  kind: 'pickup' | 'shelter';
  districtId: DistrictId;
  /** Fictional, Admin-controlled simulation flag. Not a real safety assessment. */
  approved: boolean;
  mapX: number;
  mapY: number;
  capacity?: number;
  occupancy?: number;
}

export interface SafeRoute {
  id: string;
  label: string;
  pickupPointId: string;
  destinationPointId: string;
  path: Point[];
}

export interface ScenarioTemplate {
  type: DisasterType;
  label: string;
  /** Hazard outline relative to the district centre, at "high" severity. */
  shape: Point[];
  /** Routes passing within this distance of the zone are marked "unknown". */
  unknownBuffer: number;
}

export interface DisasterScenario {
  id: string;
  name: string;
  type: DisasterType;
  severity: Severity;
  status: DisasterStatus;
  districtId: DistrictId;
  activatedAt?: string;
  resolvedAt?: string;
  /** Increases on every activation/update so phones can re-show the alert. */
  revision: number;
}

export interface Driver {
  id: string;
  name: string;
  accountStatus: string;
  eligibility: DriverEligibility;
  vehicle: string;
  plate: string;
  /** Passenger seats, excluding the driver's seat. */
  seats: number;
  accessible: boolean;
  districtId: DistrictId;
  online: boolean;
  /** Volunteer's own choice to receive Lifeline missions (separate from going online). */
  available: boolean;
  rating: string;
  training: { safety: boolean; conduct: boolean; vehicleCheck: boolean };
  /** True for the driver shown on the Driver phone. */
  isPhoneDriver: boolean;
}

export interface PassengerRequest {
  id: string;
  source: RequestSource;
  requesterId?: string;
  requesterLabel: string;
  pickupId: string;
  destinationId: string;
  routeId?: string;
  passengers: number;
  accessibility: AccessibilityNeed;
  status: RequestStatus;
  reason?: string;
  missionId?: string;
  createdAt: string;
}

export interface Mission {
  id: string;
  requestId: string;
  pickupId: string;
  destinationId: string;
  routeId: string;
  passengers: number;
  accessibility: AccessibilityNeed;
  status: MissionStatus;
  driverId?: string;
  baseCompensation: number;
  bonus: number;
  declinedBy: string[];
  safetyHold?: { reason: string; source: 'system' | 'driver' };
  blockedReason?: string;
  passengerConfirmed: boolean;
  createdAt: string;
  offeredAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  confirmedAt?: string;
}

export interface BonusRecord {
  missionId: string;
  driverId: string;
  base: number;
  bonus: number;
  status: BonusStatus;
  heldReason?: string;
  updatedAt: string;
}

export interface EventLogEntry {
  id: string;
  at: string;
  actor: Actor;
  message: string;
  tone: Tone;
}

export interface LayerToggles {
  affected: boolean;
  pickups: boolean;
  shelters: boolean;
  routes: boolean;
}

export interface DomainState {
  disaster: DisasterScenario;
  layers: LayerToggles;
  drivers: Record<string, Driver>;
  requests: PassengerRequest[];
  missions: Mission[];
  bonuses: Record<string, BonusRecord>;
  events: EventLogEntry[];
  counters: { request: number; mission: number; event: number };
}

export interface ImpactMetrics {
  requestsReceived: number;
  approvedRequests: number;
  confirmedMissions: number;
  peopleTransported: number;
  verifiedVolunteers: number;
  availableVolunteers: number;
  blockedRequests: number;
  bonusesApprovedCount: number;
  bonusesApprovedTotal: number;
  bonusesPendingTotal: number;
  bonusBudget: number;
  medianAcceptSeconds: number | null;
}

export interface Gate {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface Notice {
  target: 'passenger' | 'driver' | 'operator';
  message: string;
  tone: Tone;
}

export interface Outcome {
  state: DomainState;
  ok: boolean;
  reasons: string[];
  notices: Notice[];
  id?: string;
}
