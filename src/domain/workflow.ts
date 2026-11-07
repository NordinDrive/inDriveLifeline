import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { DISTRICTS, findRoute, PICKUP_POINTS, pointById, routeById, SAFE_ROUTES } from '../data/mockLocations';
import { PASSENGER } from '../data/mockPassenger';
import { SCENARIO_CODE, SCENARIO_TEMPLATES, SEVERITY_LABEL } from '../data/mockScenarios';
import {
  acceptGates,
  ACTIVE_MISSION_STATUSES,
  failedReasons,
  IN_PROGRESS_STATUSES,
  missionFor,
  missionSafetyFailures,
  requestGates,
} from './dispatch';
import { routeStatusById } from './hazard';
import { canApproveBonus, LIFELINE_EARNINGS } from './rewards';
import type {
  AccessibilityNeed,
  Actor,
  BonusRecord,
  DisasterType,
  DistrictId,
  DomainState,
  Driver,
  Mission,
  MissionStatus,
  Notice,
  Outcome,
  PassengerRequest,
  RequestSource,
  Severity,
  Tone,
} from './types';

// Pure state transitions. Each returns a new state plus notices for the phones.
// Guards make every action idempotent: repeating a click never duplicates work.

export const SERVICE_LABEL = 'Shelter transport';
export const MAX_PASSENGERS = 4;

const pad = (n: number) => String(n).padStart(4, '0');

function done(state: DomainState, notices: Notice[] = [], id?: string): Outcome {
  return { state, ok: true, reasons: [], notices, id };
}

function fail(state: DomainState, reasons: string[] | string): Outcome {
  return { state, ok: false, reasons: Array.isArray(reasons) ? reasons : [reasons], notices: [] };
}

export function log(state: DomainState, actor: Actor, message: string, tone: Tone, now: string): DomainState {
  const n = state.counters.event + 1;
  return {
    ...state,
    counters: { ...state.counters, event: n },
    events: [{ id: `EVT-${pad(n)}`, at: now, actor, message, tone }, ...state.events].slice(0, 200),
  };
}

function patchRequest(state: DomainState, id: string, patch: Partial<PassengerRequest>): DomainState {
  return { ...state, requests: state.requests.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
}

function patchMission(state: DomainState, id: string, patch: Partial<Mission>): DomainState {
  return { ...state, missions: state.missions.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
}

function patchDriver(state: DomainState, id: string, patch: Partial<Driver>): DomainState {
  return { ...state, drivers: { ...state.drivers, [id]: { ...state.drivers[id], ...patch } } };
}

function patchBonus(state: DomainState, missionId: string, patch: Partial<BonusRecord>, now: string): DomainState {
  const current = state.bonuses[missionId];
  if (!current) return state;
  return { ...state, bonuses: { ...state.bonuses, [missionId]: { ...current, ...patch, updatedAt: now } } };
}

const isPhonePassenger = (req: PassengerRequest | undefined) => req?.source === 'passenger' && req.requesterId === PASSENGER.id;

function passengerNotice(req: PassengerRequest | undefined, message: string, tone: Tone = 'info'): Notice[] {
  return isPhonePassenger(req) ? [{ target: 'passenger', message, tone }] : [];
}

function driverNotice(driverId: string | undefined, message: string, tone: Tone = 'info'): Notice[] {
  return driverId === PHONE_DRIVER_ID ? [{ target: 'driver', message, tone }] : [];
}

const OPEN_REQUEST: PassengerRequest['status'][] = ['under_review', 'approved', 'blocked'];

// ---------------------------------------------------------------- requests

export interface RequestInput {
  source: RequestSource;
  requesterId?: string;
  requesterLabel?: string;
  pickupId: string;
  destinationId: string;
  passengers: number;
  accessibility: AccessibilityNeed;
}

export function validateRequest(state: DomainState, input: RequestInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const d = state.disaster;
  const pickup = pointById(input.pickupId);
  if (d.status !== 'active') errors.scenario = 'Lifeline transport is only available during an Admin-activated disaster scenario';
  if (!pickup || pickup.kind !== 'pickup') errors.pickupId = 'Choose a designated pickup point';
  else if (d.status === 'active' && pickup.districtId !== d.districtId) errors.pickupId = `Lifeline is only active in ${DISTRICTS[d.districtId].label}`;
  if (!input.destinationId || pointById(input.destinationId)?.kind !== 'shelter') errors.destinationId = 'Choose an approved shelter';
  else if (pickup && !findRoute(input.pickupId, input.destinationId)) errors.destinationId = 'No predefined route between these points';
  if (!Number.isInteger(input.passengers) || input.passengers < 1 || input.passengers > MAX_PASSENGERS)
    errors.passengers = `Passenger count must be between 1 and ${MAX_PASSENGERS}`;
  return errors;
}

export function submitRequest(state: DomainState, input: RequestInput, now: string): Outcome {
  const errors = validateRequest(state, input);
  if (Object.keys(errors).length) return fail(state, Object.values(errors));

  // Double-click guard: an identical open request is returned instead of duplicated.
  const dup = state.requests.find(
    (r) =>
      r.source === input.source &&
      r.requesterId === input.requesterId &&
      r.pickupId === input.pickupId &&
      r.destinationId === input.destinationId &&
      OPEN_REQUEST.includes(r.status) &&
      missionFor(state, r)?.status !== 'confirmed',
  );
  if (dup) return { ...done(state, [], dup.id), reasons: ['An identical request is already open'] };

  const n = state.counters.request + 1;
  const id = `REQ-${pad(n)}`;
  const route = findRoute(input.pickupId, input.destinationId);
  const req: PassengerRequest = {
    id,
    source: input.source,
    requesterId: input.requesterId,
    requesterLabel: input.requesterLabel ?? (input.source === 'passenger' ? PASSENGER.name : 'Resident'),
    pickupId: input.pickupId,
    destinationId: input.destinationId,
    routeId: route?.id,
    passengers: input.passengers,
    accessibility: input.accessibility,
    status: 'under_review',
    createdAt: now,
  };
  let next: DomainState = { ...state, requests: [req, ...state.requests], counters: { ...state.counters, request: n } };
  next = log(next, 'passenger', `${req.requesterLabel} requested ${id}: ${pointById(req.pickupId)?.label} → ${pointById(req.destinationId)?.label}, ${req.passengers} pax`, 'info', now);
  const rStatus = routeStatusById(route?.id, state.disaster);
  if (rStatus !== 'approved') next = log(next, 'system', `${id} uses ${route?.id} which is ${rStatus} in the current scenario`, 'warn', now);
  return done(
    next,
    [
      ...passengerNotice(req, 'Request sent. The Lifeline Admin will review the route.', 'success'),
      { target: 'operator', message: `New request ${id} needs review`, tone: 'info' },
    ],
    id,
  );
}

function getRequest(state: DomainState, id: string) {
  return state.requests.find((r) => r.id === id);
}

/** Admin approves the request's route; the mission is published to volunteer drivers at once. */
export function approveRequest(state: DomainState, requestId: string, now: string): Outcome {
  const req = getRequest(state, requestId);
  if (!req) return fail(state, 'Request not found');
  if (req.status === 'approved') return fail(state, 'Request already approved');
  if (!['under_review', 'blocked'].includes(req.status)) return fail(state, `Request is ${req.status.replace(/_/g, ' ')}`);
  const reasons = failedReasons(requestGates(state, req));
  if (reasons.length) return fail(state, reasons);

  const n = state.counters.mission + 1;
  const id = `MSN-${pad(n)}`;
  const mission: Mission = {
    id,
    requestId,
    pickupId: req.pickupId,
    destinationId: req.destinationId,
    routeId: req.routeId!,
    passengers: req.passengers,
    accessibility: req.accessibility,
    status: 'offered',
    baseCompensation: LIFELINE_EARNINGS.base,
    bonus: LIFELINE_EARNINGS.bonus,
    declinedBy: [],
    passengerConfirmed: false,
    createdAt: now,
    offeredAt: now,
  };
  let next: DomainState = { ...state, missions: [mission, ...state.missions], counters: { ...state.counters, mission: n } };
  next = patchRequest(next, requestId, { status: 'approved', reason: undefined, missionId: id });
  next = log(next, 'operator', `Approved ${req.routeId} for ${requestId} and published ${id} to volunteer drivers`, 'success', now);
  const phoneDriver = next.drivers[PHONE_DRIVER_ID];
  const phoneEligible = phoneDriver && failedReasons(acceptGates(next, mission, phoneDriver)).length === 0;
  return done(
    next,
    [
      ...passengerNotice(req, 'Route approved. Looking for a volunteer driver…', 'success'),
      ...(phoneEligible ? driverNotice(PHONE_DRIVER_ID, `New Lifeline mission at ${pointById(req.pickupId)?.label} · +${mission.bonus} MAD bonus`, 'success') : []),
    ],
    id,
  );
}

export function rejectRequest(state: DomainState, requestId: string, reason: string, block: boolean, now: string): Outcome {
  const req = getRequest(state, requestId);
  if (!req) return fail(state, 'Request not found');
  if (['rejected', 'cancelled'].includes(req.status)) return fail(state, `Request is already ${req.status}`);
  if (block && req.status === 'blocked') return fail(state, 'Request is already blocked');
  const mission = missionFor(state, req);
  if (mission && mission.status !== 'offered' && ACTIVE_MISSION_STATUSES.includes(mission.status))
    return fail(state, 'A driver is already on this mission');
  let next = patchRequest(state, requestId, { status: block ? 'blocked' : 'rejected', reason, missionId: block ? undefined : req.missionId });
  if (mission?.status === 'offered') next = patchMission(next, mission.id, { status: 'cancelled', blockedReason: reason });
  next = log(next, 'operator', `${block ? 'Blocked' : 'Rejected'} ${requestId}: ${reason}`, 'danger', now);
  return done(next, passengerNotice(req, block ? `Transport unavailable: ${reason}` : `Request not approved: ${reason}`, 'warn'));
}

export function cancelRequest(state: DomainState, requestId: string, now: string): Outcome {
  const req = getRequest(state, requestId);
  if (!req) return fail(state, 'Request not found');
  if (['rejected', 'cancelled'].includes(req.status)) return fail(state, 'Request already closed');
  const mission = missionFor(state, req);
  if (mission && ['onboard', 'arrived', 'awaiting_confirmation', 'confirmed'].includes(mission.status))
    return fail(state, 'Trip already in progress; contact support instead');
  let next = patchRequest(state, requestId, { status: 'cancelled', reason: 'Cancelled by requester' });
  const notices: Notice[] = [{ target: 'operator', message: `${requestId} cancelled by requester`, tone: 'warn' }];
  if (mission && ACTIVE_MISSION_STATUSES.includes(mission.status)) {
    next = patchMission(next, mission.id, { status: 'cancelled' });
    next = patchBonus(next, mission.id, { status: 'not_eligible' }, now);
    notices.push(...driverNotice(mission.driverId, `${mission.id} was cancelled by the passenger (no penalty)`, 'warn'));
  }
  next = log(next, 'passenger', `${requestId} cancelled by requester`, 'warn', now);
  return done(next, notices);
}

// ---------------------------------------------------------------- missions

export function acceptMission(state: DomainState, missionId: string, driverId: string, now: string): Outcome {
  const mission = state.missions.find((m) => m.id === missionId);
  const driver = state.drivers[driverId];
  if (!mission || !driver) return fail(state, 'Mission or driver not found');
  if (mission.driverId === driverId && mission.status !== 'offered') return fail(state, 'You already accepted this mission');
  const reasons = failedReasons(acceptGates(state, mission, driver));
  if (reasons.length) return fail(state, reasons);
  let next = patchMission(state, missionId, { driverId, status: 'accepted', acceptedAt: now });
  next = {
    ...next,
    bonuses: {
      ...next.bonuses,
      [missionId]: { missionId, driverId, base: mission.baseCompensation, bonus: mission.bonus, status: 'pending_completion', updatedAt: now },
    },
  };
  next = log(next, 'driver', `${driver.name} accepted ${missionId}`, 'success', now);
  const req = getRequest(state, mission.requestId);
  return done(next, [
    ...passengerNotice(req, `Volunteer driver assigned: ${driver.name} · ${driver.plate}`, 'success'),
    { target: 'operator', message: `${driver.name} accepted ${missionId}`, tone: 'success' },
  ]);
}

export function declineMission(state: DomainState, missionId: string, driverId: string, now: string): Outcome {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission || mission.status !== 'offered') return fail(state, 'Offer no longer open');
  if (mission.declinedBy.includes(driverId)) return fail(state, 'Already declined');
  let next = patchMission(state, missionId, { declinedBy: [...mission.declinedBy, driverId] });
  next = log(next, 'driver', `${state.drivers[driverId]?.name} declined ${missionId} (no penalty)`, 'info', now);
  return done(next);
}

export const MISSION_FLOW: MissionStatus[] = ['accepted', 'en_route', 'at_pickup', 'onboard', 'arrived', 'awaiting_confirmation'];

/** Driver button label for moving a mission out of each status. */
export const MISSION_ACTION: Partial<Record<MissionStatus, string>> = {
  accepted: 'On my way',
  en_route: 'Arrived at pickup',
  at_pickup: 'Passengers picked up',
  onboard: 'Arrived at shelter',
  arrived: 'Submit completion',
};

export function nextMissionStatus(status: MissionStatus): MissionStatus | null {
  const i = MISSION_FLOW.indexOf(status);
  return i >= 0 && i < MISSION_FLOW.length - 1 ? MISSION_FLOW[i + 1] : null;
}

export function advanceMission(state: DomainState, missionId: string, driverId: string, now: string): Outcome {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission) return fail(state, 'Mission not found');
  if (mission.driverId !== driverId) return fail(state, 'Mission is assigned to another driver');
  if (mission.safetyHold) return fail(state, `Paused for safety: ${mission.safetyHold.reason}`);
  const to = nextMissionStatus(mission.status);
  if (!to) return fail(state, 'No further driver step');
  const req = getRequest(state, mission.requestId);
  let next = patchMission(state, missionId, { status: to, ...(to === 'awaiting_confirmation' ? { completedAt: now } : {}) });
  if (to === 'awaiting_confirmation') next = patchBonus(next, missionId, { status: 'pending_confirmation' }, now);
  const labels: Record<string, [string, string]> = {
    en_route: ['is on the way to pickup', 'Your volunteer driver is on the way.'],
    at_pickup: ['arrived at pickup', 'Your driver has arrived at the pickup point.'],
    onboard: ['picked up passengers', 'Picked up. Heading to the shelter.'],
    arrived: ['arrived at the shelter', 'Arrived at the shelter.'],
    awaiting_confirmation: ['submitted completion', 'Trip complete. Please confirm you arrived safely.'],
  };
  const [opText, paxText] = labels[to];
  next = log(next, 'driver', `${state.drivers[driverId]?.name} ${opText} (${missionId})`, 'info', now);
  const notices: Notice[] = [...passengerNotice(req, paxText, to === 'awaiting_confirmation' ? 'success' : 'info')];
  if (to === 'awaiting_confirmation') notices.push({ target: 'operator', message: `${missionId} awaiting Admin confirmation`, tone: 'info' });
  return done(next, notices);
}

export function passengerConfirmArrival(state: DomainState, missionId: string, now: string): Outcome {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission || !['arrived', 'awaiting_confirmation', 'confirmed'].includes(mission.status)) return fail(state, 'Trip has not arrived yet');
  if (mission.passengerConfirmed) return fail(state, 'Already confirmed');
  let next = patchMission(state, missionId, { passengerConfirmed: true });
  next = log(next, 'passenger', `Passenger confirmed safe arrival for ${missionId}`, 'success', now);
  return done(next, [{ target: 'operator', message: `Passenger confirmed safe arrival (${missionId})`, tone: 'success' }]);
}

export function confirmCompletion(state: DomainState, missionId: string, now: string): Outcome {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission) return fail(state, 'Mission not found');
  if (mission.status === 'confirmed') return fail(state, 'Mission already confirmed');
  if (mission.status !== 'awaiting_confirmation') return fail(state, 'Driver has not submitted completion yet');
  let next = patchMission(state, missionId, { status: 'confirmed', confirmedAt: now });
  const bonusCheck = canApproveBonus(next.bonuses[missionId], true);
  if (bonusCheck.ok) next = patchBonus(next, missionId, { status: 'approved' }, now);
  const req = getRequest(state, mission.requestId);
  next = log(next, 'operator', `Confirmed completion of ${missionId}`, 'success', now);
  if (bonusCheck.ok) next = log(next, 'system', `Bonus approved: ${mission.bonus} MAD for ${state.drivers[mission.driverId!]?.name}`, 'success', now);
  return done(next, [
    ...passengerNotice(req, 'Safe arrival confirmed by Lifeline. Thank you.', 'success'),
    ...driverNotice(
      mission.driverId,
      bonusCheck.ok ? `Completion confirmed · +${mission.bonus} MAD Lifeline bonus approved` : `Completion confirmed · bonus ${bonusCheck.reason?.toLowerCase()}`,
      'success',
    ),
  ]);
}

export function holdBonus(state: DomainState, missionId: string, reason: string, now: string): Outcome {
  const b = state.bonuses[missionId];
  if (!b) return fail(state, 'No bonus for this mission yet');
  if (!['pending_completion', 'pending_confirmation'].includes(b.status)) return fail(state, `Bonus is ${b.status.replace(/_/g, ' ')}`);
  let next = patchBonus(state, missionId, { status: 'held', heldReason: reason }, now);
  next = log(next, 'operator', `Held bonus for ${missionId}: ${reason}`, 'warn', now);
  return done(next, driverNotice(b.driverId, `Bonus for ${missionId} held for review`, 'warn'));
}

export function releaseBonus(state: DomainState, missionId: string, now: string): Outcome {
  const b = state.bonuses[missionId];
  const mission = state.missions.find((m) => m.id === missionId);
  if (!b || b.status !== 'held' || !mission) return fail(state, 'Bonus is not held');
  const confirmed = mission.status === 'confirmed';
  const status = confirmed ? 'approved' : mission.status === 'awaiting_confirmation' ? 'pending_confirmation' : 'pending_completion';
  let next = patchBonus(state, missionId, { status, heldReason: undefined }, now);
  next = log(next, 'operator', `Released bonus hold for ${missionId}${confirmed ? ': approved' : ''}`, 'info', now);
  return done(next, confirmed ? driverNotice(b.driverId, `+${b.bonus} MAD Lifeline bonus approved`, 'success') : []);
}

export function reportSafetyIssue(state: DomainState, missionId: string, driverId: string, now: string): Outcome {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission || mission.driverId !== driverId || !IN_PROGRESS_STATUSES.includes(mission.status)) return fail(state, 'No active mission to pause');
  if (mission.safetyHold) return fail(state, 'Mission already paused');
  let next = patchMission(state, missionId, { safetyHold: { reason: 'Driver reported a safety concern', source: 'driver' } });
  next = log(next, 'driver', `${state.drivers[driverId]?.name} paused ${missionId}: safety concern reported (no penalty)`, 'danger', now);
  return done(next, [{ target: 'operator', message: `Safety concern on ${missionId}`, tone: 'danger' }]);
}

export function clearSafetyHold(state: DomainState, missionId: string, now: string): Outcome {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission?.safetyHold) return fail(state, 'Mission is not paused');
  const reasons = missionSafetyFailures(state, mission);
  if (reasons.length) return fail(state, reasons);
  let next = patchMission(state, missionId, { safetyHold: undefined });
  next = log(next, 'operator', `Resumed ${missionId} after safety review`, 'info', now);
  return done(next, driverNotice(mission.driverId, `${missionId} may resume`, 'info'));
}

export function cancelMission(state: DomainState, missionId: string, reason: string, now: string): Outcome {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission || !ACTIVE_MISSION_STATUSES.includes(mission.status)) return fail(state, 'Mission is not active');
  let next = patchMission(state, missionId, { status: 'cancelled', blockedReason: reason });
  next = patchBonus(next, missionId, { status: 'not_eligible' }, now);
  next = patchRequest(next, mission.requestId, { status: 'cancelled', reason });
  next = log(next, 'operator', `Cancelled ${missionId}: ${reason}`, 'danger', now);
  return done(next, [
    ...passengerNotice(getRequest(state, mission.requestId), `Trip cancelled by Lifeline: ${reason}`, 'warn'),
    ...driverNotice(mission.driverId, `${missionId} cancelled by the Admin (no penalty)`, 'warn'),
  ]);
}

// ---------------------------------------------------------------- volunteers

export interface EnrollmentForm {
  safetyTraining: boolean;
  conductAccepted: boolean;
  vehicleChecked: boolean;
  seats: number;
  accessible: boolean;
}

export function applyForLifeline(state: DomainState, driverId: string, form: EnrollmentForm, now: string): Outcome {
  const d = state.drivers[driverId];
  if (!d) return fail(state, 'Driver not found');
  if (!['not_enrolled', 'expired'].includes(d.eligibility)) return fail(state, `Application already ${d.eligibility.replace(/_/g, ' ')}`);
  const missing: string[] = [];
  if (!form.safetyTraining) missing.push('Complete the Lifeline safety training');
  if (!form.conductAccepted) missing.push('Accept the Code of Conduct and safeguarding rules');
  if (!form.vehicleChecked) missing.push('Confirm vehicle suitability');
  if (form.seats < 1 || form.seats > 6) missing.push('Seat count must be 1–6');
  if (missing.length) return fail(state, missing);
  let next = patchDriver(state, driverId, {
    eligibility: 'pending_review',
    seats: form.seats,
    accessible: form.accessible,
    training: { safety: true, conduct: true, vehicleCheck: true },
  });
  next = log(next, 'driver', `${d.name} volunteered for Lifeline`, 'info', now);
  return done(next, [{ target: 'operator', message: `${d.name} awaiting Lifeline review`, tone: 'info' }]);
}

export function approveDriver(state: DomainState, driverId: string, now: string): Outcome {
  const d = state.drivers[driverId];
  if (!d) return fail(state, 'Driver not found');
  if (d.eligibility === 'verified') return fail(state, 'Driver already verified');
  if (d.eligibility !== 'pending_review') return fail(state, d.eligibility === 'not_enrolled' ? 'Driver has not volunteered yet' : `Driver is ${d.eligibility}`);
  let next = patchDriver(state, driverId, { eligibility: 'verified' });
  next = log(next, 'operator', `Verified ${d.name} as a Lifeline volunteer`, 'success', now);
  return done(next, driverNotice(driverId, 'You are now a verified Lifeline volunteer', 'success'));
}

export function suspendDriver(state: DomainState, driverId: string, now: string): Outcome {
  const d = state.drivers[driverId];
  if (!d || d.eligibility !== 'verified') return fail(state, 'Only verified drivers can be suspended');
  let next = patchDriver(state, driverId, { eligibility: 'suspended', available: false });
  next = log(next, 'operator', `Suspended ${d.name} from Lifeline`, 'danger', now);
  return done(next, driverNotice(driverId, 'Your Lifeline status is suspended', 'warn'));
}

export function reinstateDriver(state: DomainState, driverId: string, now: string): Outcome {
  const d = state.drivers[driverId];
  if (!d || d.eligibility !== 'suspended') return fail(state, 'Driver is not suspended');
  let next = patchDriver(state, driverId, { eligibility: 'verified' });
  next = log(next, 'operator', `Reinstated ${d.name}`, 'info', now);
  return done(next, driverNotice(driverId, 'Your Lifeline status was reinstated', 'success'));
}

/** Going offline also ends Lifeline availability; going online does not start it. */
export function setDriverOnline(state: DomainState, driverId: string, online: boolean, now: string): Outcome {
  const d = state.drivers[driverId];
  if (!d || d.online === online) return fail(state, 'No change');
  let next = patchDriver(state, driverId, { online, ...(online ? {} : { available: false }) });
  next = log(next, 'driver', `${d.name} is ${online ? 'online' : 'offline'}`, 'info', now);
  return done(next);
}

/** The volunteer's own opt-in to Lifeline missions. Becoming available also puts them online. */
export function setLifelineAvailability(state: DomainState, driverId: string, available: boolean, now: string): Outcome {
  const d = state.drivers[driverId];
  if (!d) return fail(state, 'Driver not found');
  if (d.available === available) return fail(state, 'No change');
  if (available && d.eligibility !== 'verified') return fail(state, 'Only verified volunteers can make themselves available');
  let next = patchDriver(state, driverId, { available, ...(available ? { online: true } : {}) });
  next = log(next, 'driver', `${d.name} is ${available ? 'available' : 'not available'} for Lifeline missions`, 'info', now);
  return done(next);
}

// ---------------------------------------------------------------- scenarios

export interface ScenarioConfig {
  type: DisasterType;
  districtId: DistrictId;
  severity: Severity;
  name: string;
}

export function scenarioName(cfg: Omit<ScenarioConfig, 'name'>): string {
  return `District ${cfg.districtId} ${SCENARIO_TEMPLATES[cfg.type].label}`;
}

/** Re-applies safety gates after the scenario changes: withdraws offers, pauses unsafe trips. */
export function reconcile(state: DomainState, now: string): { state: DomainState; notices: Notice[] } {
  let next = state;
  const notices: Notice[] = [];
  for (const m of state.missions) {
    const reasons = missionSafetyFailures(next, m);
    if (m.status === 'offered' && reasons.length) {
      next = patchMission(next, m.id, { status: 'blocked', blockedReason: reasons[0] });
      next = patchRequest(next, m.requestId, { status: 'blocked', reason: reasons[0], missionId: undefined });
      next = log(next, 'system', `${m.id} offer withdrawn: ${reasons[0]}`, 'danger', now);
    } else if (IN_PROGRESS_STATUSES.includes(m.status)) {
      if (reasons.length && !m.safetyHold) {
        next = patchMission(next, m.id, { safetyHold: { reason: reasons[0], source: 'system' } });
        next = log(next, 'system', `${m.id} paused for safety: ${reasons[0]}`, 'danger', now);
        notices.push(...driverNotice(m.driverId, `Mission paused for safety: ${reasons[0]}`, 'danger'));
      } else if (!reasons.length && m.safetyHold?.source === 'system') {
        next = patchMission(next, m.id, { safetyHold: undefined });
        next = log(next, 'system', `${m.id} safety pause cleared`, 'info', now);
      }
    }
  }
  return { state: next, notices };
}

export function activateScenario(state: DomainState, cfg: ScenarioConfig, now: string): Outcome {
  const wasActive = state.disaster.status === 'active';
  const disaster = {
    ...state.disaster,
    id: `SCENARIO-${SCENARIO_CODE[cfg.type]}-01`,
    type: cfg.type,
    districtId: cfg.districtId,
    severity: cfg.severity,
    name: cfg.name.trim() || scenarioName(cfg),
    status: 'active' as const,
    activatedAt: wasActive ? state.disaster.activatedAt : now,
    resolvedAt: undefined,
    revision: state.disaster.revision + 1,
  };
  let next: DomainState = { ...state, disaster };
  next = log(
    next,
    'operator',
    `${wasActive ? 'Updated' : 'Activated'} ${SCENARIO_TEMPLATES[cfg.type].label.toLowerCase()}: ${disaster.name}, ${SEVERITY_LABEL[cfg.severity]}`,
    'danger',
    now,
  );
  const rec = reconcile(next, now);
  const statuses = SAFE_ROUTES.map((r) => `${r.id} ${routeStatusById(r.id, disaster)}`).join(', ');
  next = log(rec.state, 'system', `Route statuses: ${statuses}`, 'info', now);
  const msg = `ALERT: ${disaster.name} (${SEVERITY_LABEL[cfg.severity]})`;
  return done(next, [
    ...(cfg.districtId === PASSENGER.districtId ? [{ target: 'passenger' as const, message: msg, tone: 'danger' as const }] : []),
    { target: 'driver', message: msg, tone: 'danger' },
    ...rec.notices,
  ]);
}

/**
 * Ends the scenario: no new requests or offers. Open offers and unassigned requests
 * close; trips under way may finish (still subject to safety pauses), and completed
 * history and earnings are kept.
 */
export function resolveScenario(state: DomainState, now: string): Outcome {
  if (state.disaster.status !== 'active') return fail(state, 'No active scenario');
  let next: DomainState = { ...state, disaster: { ...state.disaster, status: 'resolved', resolvedAt: now, revision: state.disaster.revision + 1 } };
  for (const m of next.missions) {
    if (m.status === 'offered') {
      next = patchMission(next, m.id, { status: 'cancelled', blockedReason: 'Scenario resolved' });
      next = log(next, 'system', `${m.id} withdrawn: scenario resolved`, 'warn', now);
    }
  }
  for (const r of next.requests) {
    const m = missionFor(next, r);
    const underway = m && ACTIVE_MISSION_STATUSES.includes(m.status);
    if (OPEN_REQUEST.includes(r.status) && !underway && m?.status !== 'confirmed') {
      next = patchRequest(next, r.id, { status: 'cancelled', reason: 'Scenario resolved before a driver was assigned' });
      next = log(next, 'system', `${r.id} closed: scenario resolved`, 'warn', now);
    }
  }
  next = log(next, 'operator', `Resolved ${state.disaster.name}. New requests closed; history and earnings kept`, 'success', now);
  const rec = reconcile(next, now);
  return done(rec.state, [
    { target: 'passenger', message: 'Scenario resolved. Lifeline requests are closed.', tone: 'success' },
    { target: 'driver', message: 'Scenario resolved. No new Lifeline missions.', tone: 'success' },
    ...rec.notices,
  ]);
}

/** Admin tool: another (fictional) resident in the area asks for shelter transport. */
export function simulateResidentRequest(state: DomainState, now: string): Outcome {
  const d = state.disaster;
  if (d.status !== 'active') return fail(state, 'Activate a scenario first');
  const pickups = PICKUP_POINTS.filter((p) => p.districtId === d.districtId).map((p) => p.id);
  const candidates = SAFE_ROUTES.filter((r) => pickups.includes(r.pickupPointId));
  if (!candidates.length) return fail(state, `No designated pickup points in ${DISTRICTS[d.districtId].label}`);
  const open = (routeId: string) => state.requests.some((r) => r.routeId === routeId && r.source === 'resident' && OPEN_REQUEST.includes(r.status));
  const route = candidates.find((r) => routeStatusById(r.id, d) === 'approved' && !open(r.id)) ?? candidates.find((r) => !open(r.id)) ?? candidates[0];
  const n = state.counters.request + 1;
  return submitRequest(
    state,
    {
      source: 'resident',
      requesterLabel: `Resident family #${n}`,
      pickupId: route.pickupPointId,
      destinationId: route.destinationPointId,
      passengers: 2,
      accessibility: 'none',
    },
    now,
  );
}

export function routeLabel(routeId: string | undefined) {
  const r = routeById(routeId);
  return r ? `${r.id} · ${r.label}` : 'No route';
}
