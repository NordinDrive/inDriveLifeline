import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { findRoute, pointById, routeById, SAFE_ROUTES } from '../data/mockLocations';
import { PASSENGER } from '../data/mockNGOs';
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
import { isTransport } from './eligibility';
import { routeStatusById } from './hazard';
import { canApproveBonus, earningsFor } from './rewards';
import type {
  AccessibilityNeed,
  Actor,
  BonusRecord,
  DisasterType,
  DistrictId,
  DomainState,
  Driver,
  FundingSource,
  Mission,
  MissionStatus,
  Notice,
  Outcome,
  PassengerRequest,
  RequestSource,
  ServiceType,
  Severity,
  Tone,
} from './types';

// Pure state transitions. Each returns a new state plus notices for the phones.
// Guards make every action idempotent: repeating a click never duplicates work.

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

export const SERVICE_LABEL: Record<ServiceType, string> = {
  evacuation_transfer: 'Evacuation Transportation Assistance',
  transport_assistance: 'Transportation Assistance',
  essential_delivery: 'Essential Delivery',
  donation_pickup: 'Donation Pickup',
  ngo_logistics: 'NGO Logistics',
};

// ---------------------------------------------------------------- requests

export interface RequestInput {
  source: RequestSource;
  requesterId?: string;
  ngoId?: string;
  campaignId?: string;
  beneficiaryLabel?: string;
  service: ServiceType | '';
  pickupId: string;
  destinationId: string;
  passengers: number;
  load?: string;
  accessibility: AccessibilityNeed;
  note: string;
  acknowledged: boolean;
  funding?: FundingSource;
}

export function validateRequest(state: DomainState, input: RequestInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.service) errors.service = 'Choose a service type';
  if (!input.pickupId || !pointById(input.pickupId)) errors.pickupId = 'Choose a designated pickup point';
  if (!input.destinationId) errors.destinationId = 'Choose an approved destination';
  else if (input.pickupId && !findRoute(input.pickupId, input.destinationId))
    errors.destinationId = 'No predefined route between these points';
  if (input.service && isTransport(input.service)) {
    const max = input.source === 'passenger' ? 4 : 6;
    if (!Number.isInteger(input.passengers) || input.passengers < 1 || input.passengers > max)
      errors.passengers = `Passenger count must be between 1 and ${max}`;
  }
  if (input.service === 'evacuation_transfer' && state.disaster.status !== 'active')
    errors.service = 'Evacuation transport is only available during an active simulated scenario';
  if (input.note.length > 140) errors.note = 'Keep the note under 140 characters';
  if (input.source === 'passenger' && !input.acknowledged)
    errors.acknowledged = 'Please confirm you understand Lifeline’s limits';
  return errors;
}

export function submitRequest(state: DomainState, input: RequestInput, now: string): Outcome {
  const errors = validateRequest(state, input);
  if (Object.keys(errors).length) return fail(state, Object.values(errors));
  const service = input.service as ServiceType;

  // Double-click guard: an identical open request is returned instead of duplicated.
  const dup = state.requests.find(
    (r) =>
      r.source === input.source &&
      r.requesterId === input.requesterId &&
      r.ngoId === input.ngoId &&
      r.service === service &&
      r.pickupId === input.pickupId &&
      r.destinationId === input.destinationId &&
      ['submitted', 'under_review', 'verified', 'approved'].includes(r.status) &&
      !(missionFor(state, r) && missionFor(state, r)!.status === 'confirmed'),
  );
  if (dup) return { ...done(state, [], dup.id), reasons: ['An identical request is already open'] };

  const n = state.counters.request + 1;
  const id = `REQ-${pad(n)}`;
  const route = findRoute(input.pickupId, input.destinationId);
  const transport = isTransport(service);
  const req: PassengerRequest = {
    id,
    source: input.source,
    requesterId: input.requesterId,
    ngoId: input.ngoId,
    campaignId: input.campaignId,
    beneficiaryLabel: input.beneficiaryLabel ?? (input.source === 'passenger' ? PASSENGER.name : 'Beneficiary (Demo)'),
    service,
    pickupId: input.pickupId,
    destinationId: input.destinationId,
    routeId: route?.id,
    passengers: transport ? input.passengers : 0,
    load: transport ? undefined : input.load || 'Supplies (demo)',
    accessibility: transport ? input.accessibility : 'none',
    note: input.note.trim(),
    funding: input.funding ?? (input.source === 'passenger' ? 'indrive' : 'ngo'),
    status: 'under_review',
    verified: false,
    routeApproved: false,
    createdAt: now,
  };
  let next: DomainState = { ...state, requests: [req, ...state.requests], counters: { ...state.counters, request: n } };
  const who = input.source === 'passenger' ? 'Passenger' : `${sourceLabel(input.source)}${input.ngoId ? ` · ${ngoName(state, input.ngoId)}` : ''}`;
  next = log(next, input.source === 'passenger' ? 'passenger' : 'ngo', `${who} submitted ${id}: ${SERVICE_LABEL[service]}, ${pointById(req.pickupId)?.label} → ${pointById(req.destinationId)?.label}`, 'info', now);
  const rStatus = routeStatusById(route?.id, state.disaster);
  if (rStatus !== 'approved') next = log(next, 'system', `${id} uses ${route?.id} which is ${rStatus} in the current scenario`, 'warn', now);
  return done(
    next,
    [
      ...passengerNotice(req, 'Request submitted. A coordinator will review it.', 'success'),
      { target: 'operator', message: `New request ${id} in the queue`, tone: 'info' },
    ],
    id,
  );
}

export function sourceLabel(source: RequestSource): string {
  return { passenger: 'Passenger app', ngo: 'NGO partner', hotline: 'Hotline', shelter: 'Shelter', coordinator: 'Community coordinator' }[source];
}

function ngoName(state: DomainState, id: string) {
  return state.ngos.find((n) => n.id === id)?.name ?? id;
}

function getRequest(state: DomainState, id: string) {
  return state.requests.find((r) => r.id === id);
}

export function verifyNeed(state: DomainState, requestId: string, now: string): Outcome {
  const req = getRequest(state, requestId);
  if (!req) return fail(state, 'Request not found');
  if (req.verified) return fail(state, 'Need already verified');
  if (req.status !== 'under_review') return fail(state, `Request is ${req.status.replace(/_/g, ' ')}`);
  let next = patchRequest(state, requestId, { verified: true, status: 'verified' });
  next = log(next, 'operator', `Verified need for ${requestId} (simulated check)`, 'success', now);
  return done(next, passengerNotice(req, 'Your request was verified by a Lifeline coordinator.', 'success'));
}

export function approveRoute(state: DomainState, requestId: string, now: string): Outcome {
  const req = getRequest(state, requestId);
  if (!req) return fail(state, 'Request not found');
  if (req.routeApproved) return fail(state, 'Route already approved');
  if (!req.verified) return fail(state, 'Verify the need before approving a route');
  if (!['verified', 'blocked'].includes(req.status)) return fail(state, `Request is ${req.status}`);
  const gates = requestGates(state, req).filter((g) => ['scenario', 'pickup', 'destination', 'route'].includes(g.id));
  const reasons = failedReasons(gates);
  if (reasons.length) return fail(state, reasons);
  let next = patchRequest(state, requestId, { routeApproved: true, status: 'approved', reason: undefined });
  next = log(next, 'operator', `Approved safe demo route ${req.routeId} for ${requestId}`, 'success', now);
  return done(next, passengerNotice(req, 'Approved: we are looking for a verified driver.', 'success'));
}

export function revokeRouteApproval(state: DomainState, requestId: string, now: string): Outcome {
  const req = getRequest(state, requestId);
  if (!req || !req.routeApproved) return fail(state, 'Route is not approved');
  const mission = missionFor(state, req);
  if (mission && ACTIVE_MISSION_STATUSES.includes(mission.status)) return fail(state, 'Already dispatched; cancel the mission instead');
  let next = patchRequest(state, requestId, { routeApproved: false, status: 'verified' });
  next = log(next, 'operator', `Revoked route approval for ${requestId}`, 'warn', now);
  return done(next);
}

export function rejectRequest(state: DomainState, requestId: string, reason: string, block: boolean, now: string): Outcome {
  const req = getRequest(state, requestId);
  if (!req) return fail(state, 'Request not found');
  if (['rejected', 'cancelled'].includes(req.status)) return fail(state, `Request is already ${req.status}`);
  if (block && req.status === 'blocked') return fail(state, 'Request is already blocked');
  const mission = missionFor(state, req);
  if (mission && IN_PROGRESS_STATUSES.concat('awaiting_confirmation').includes(mission.status))
    return fail(state, 'A driver is already on this mission');
  let next = patchRequest(state, requestId, { status: block ? 'blocked' : 'rejected', reason, routeApproved: false });
  if (mission && mission.status === 'offered') next = patchMission(next, mission.id, { status: 'cancelled', blockedReason: reason });
  next = log(next, 'operator', `${block ? 'Blocked' : 'Rejected'} ${requestId}: ${reason}`, 'danger', now);
  return done(next, passengerNotice(req, block ? `Dispatch unavailable: ${reason}` : `Request not approved: ${reason}`, 'warn'));
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
    notices.push(...driverNotice(mission.driverId, `${mission.id} was cancelled by the requester`, 'warn'));
  }
  next = log(next, req.source === 'passenger' ? 'passenger' : 'ngo', `${requestId} cancelled by requester`, 'warn', now);
  return done(next, notices);
}

// ---------------------------------------------------------------- missions

export function offerMission(state: DomainState, requestId: string, now: string): Outcome {
  const req = getRequest(state, requestId);
  if (!req) return fail(state, 'Request not found');
  if (req.status !== 'approved') return fail(state, 'Approve the request route first');
  const reasons = failedReasons(requestGates(state, req));
  if (reasons.length) return fail(state, reasons);
  const n = state.counters.mission + 1;
  const id = `MSN-${pad(n)}`;
  const { base, bonus } = earningsFor(req.service);
  const mission: Mission = {
    id,
    requestId,
    service: req.service,
    pickupId: req.pickupId,
    destinationId: req.destinationId,
    routeId: req.routeId!,
    passengers: req.passengers,
    load: req.load,
    accessibility: req.accessibility,
    status: 'offered',
    baseCompensation: base,
    bonus,
    funding: req.funding,
    declinedBy: [],
    passengerConfirmed: false,
    createdAt: now,
    offeredAt: now,
  };
  let next: DomainState = { ...state, missions: [mission, ...state.missions], counters: { ...state.counters, mission: n } };
  next = patchRequest(next, requestId, { missionId: id });
  next = log(next, 'operator', `Offered ${id} to eligible verified drivers`, 'info', now);
  const phoneDriver = next.drivers[PHONE_DRIVER_ID];
  const phoneEligible = phoneDriver && failedReasons(acceptGates(next, mission, phoneDriver)).length === 0;
  return done(
    next,
    [
      ...passengerNotice(req, 'Searching for a verified Lifeline driver…'),
      ...(phoneEligible ? driverNotice(PHONE_DRIVER_ID, `New Lifeline mission: ${SERVICE_LABEL[req.service]} · ${base} + ${bonus} MAD bonus`, 'success') : []),
    ],
    id,
  );
}

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
    ...passengerNotice(req, `Driver assigned: ${driver.name} · ${driver.plate}`, 'success'),
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
  const transport = isTransport(mission.service);
  let next = patchMission(state, missionId, { status: to, ...(to === 'awaiting_confirmation' ? { completedAt: now } : {}) });
  if (to === 'awaiting_confirmation') next = patchBonus(next, missionId, { status: 'pending_confirmation' }, now);
  const labels: Record<string, [string, string]> = {
    en_route: ['is on the way to pickup', 'Your driver is on the way.'],
    at_pickup: ['arrived at pickup', 'Your driver has arrived at the pickup point.'],
    onboard: [transport ? 'picked up passengers' : 'collected the delivery', transport ? 'Picked up. Heading to your destination.' : 'Delivery collected.'],
    arrived: ['arrived at destination', 'Arrived at destination.'],
    awaiting_confirmation: ['submitted completion', 'Trip complete. Please confirm safe arrival.'],
  };
  const [opText, paxText] = labels[to];
  next = log(next, 'driver', `${state.drivers[driverId]?.name} ${opText} (${missionId})`, 'info', now);
  const notices: Notice[] = [...passengerNotice(req, paxText, to === 'awaiting_confirmation' ? 'success' : 'info')];
  if (to === 'awaiting_confirmation') notices.push({ target: 'operator', message: `${missionId} awaiting confirmation`, tone: 'info' });
  return done(next, notices);
}

export function passengerConfirmArrival(state: DomainState, missionId: string, now: string): Outcome {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission || !['arrived', 'awaiting_confirmation', 'confirmed'].includes(mission.status)) return fail(state, 'Trip has not arrived yet');
  if (mission.passengerConfirmed) return fail(state, 'Already confirmed');
  let next = patchMission(state, missionId, { passengerConfirmed: true });
  next = log(next, 'passenger', `Passenger confirmed safe arrival for ${missionId}`, 'success', now);
  return done(next, [{ target: 'operator', message: `Passenger confirmed arrival (${missionId})`, tone: 'success' }]);
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
  const transport = isTransport(mission.service);
  next = log(next, 'operator', `Confirmed ${transport ? 'safe arrival' : 'delivery'} for ${missionId}`, 'success', now);
  if (bonusCheck.ok) next = log(next, 'system', `Bonus approved: ${mission.bonus} MAD for ${state.drivers[mission.driverId!]?.name} (demo, no payout)`, 'success', now);
  return done(next, [
    ...passengerNotice(req, transport ? 'Safe arrival confirmed. Thank you.' : 'Delivery confirmed.', 'success'),
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
    ...passengerNotice(getRequest(state, mission.requestId), `Trip cancelled by coordinator: ${reason}`, 'warn'),
    ...driverNotice(mission.driverId, `${missionId} cancelled by coordinator (no penalty)`, 'warn'),
  ]);
}

// ---------------------------------------------------------------- drivers

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
  next = log(next, 'driver', `${d.name} applied for the Lifeline Partner Program`, 'info', now);
  return done(next, [{ target: 'operator', message: `${d.name} awaiting Lifeline review`, tone: 'info' }]);
}

export function approveDriver(state: DomainState, driverId: string, now: string): Outcome {
  const d = state.drivers[driverId];
  if (!d) return fail(state, 'Driver not found');
  if (d.eligibility === 'verified') return fail(state, 'Driver already verified');
  if (d.eligibility !== 'pending_review') return fail(state, d.eligibility === 'not_enrolled' ? 'Driver has not applied yet' : `Driver is ${d.eligibility}`);
  let next = patchDriver(state, driverId, { eligibility: 'verified' });
  next = log(next, 'operator', `Approved ${d.name}: Lifeline Verified (simulated review)`, 'success', now);
  return done(next, driverNotice(driverId, 'You are now Lifeline Verified', 'success'));
}

export function suspendDriver(state: DomainState, driverId: string, now: string): Outcome {
  const d = state.drivers[driverId];
  if (!d || d.eligibility !== 'verified') return fail(state, 'Only verified drivers can be suspended');
  let next = patchDriver(state, driverId, { eligibility: 'suspended' });
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

export function setDriverOnline(state: DomainState, driverId: string, online: boolean, now: string): Outcome {
  const d = state.drivers[driverId];
  if (!d || d.online === online) return fail(state, 'No change');
  let next = patchDriver(state, driverId, { online });
  next = log(next, 'driver', `${d.name} is ${online ? 'online' : 'offline'}`, 'info', now);
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
  return `Demo District ${cfg.districtId} ${SCENARIO_TEMPLATES[cfg.type].label}`;
}

/** Re-applies safety gates after the scenario changes: blocks offers, pauses running trips. */
export function reconcile(state: DomainState, now: string): { state: DomainState; notices: Notice[] } {
  let next = state;
  const notices: Notice[] = [];
  for (const m of state.missions) {
    const reasons = missionSafetyFailures(next, m);
    if (m.status === 'offered' && reasons.length) {
      next = patchMission(next, m.id, { status: 'blocked', blockedReason: reasons[0] });
      next = patchRequest(next, m.requestId, { status: 'blocked', routeApproved: false, reason: reasons[0] });
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
  for (const r of next.requests) {
    if (r.status === 'approved' && !(r.missionId && ACTIVE_MISSION_STATUSES.includes(missionFor(next, r)!.status))) {
      const reasons = failedReasons(requestGates(next, r).filter((g) => ['scenario', 'pickup', 'destination', 'route'].includes(g.id)));
      if (reasons.length) {
        next = patchRequest(next, r.id, { status: 'blocked', routeApproved: false, reason: reasons[0] });
        next = log(next, 'system', `${r.id} route approval withdrawn: ${reasons[0]}`, 'warn', now);
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
    `${wasActive ? 'Updated' : 'Activated'} simulated ${SCENARIO_TEMPLATES[cfg.type].label.toLowerCase()}: ${disaster.name}, ${SEVERITY_LABEL[cfg.severity]}`,
    'danger',
    now,
  );
  const rec = reconcile(next, now);
  const statuses = SAFE_ROUTES.filter((r) => ['P-ALPHA', 'P-BETA'].includes(r.pickupPointId))
    .map((r) => `${r.id} ${routeStatusById(r.id, disaster)}`)
    .join(', ');
  next = log(rec.state, 'system', `Route statuses: ${statuses}`, 'info', now);
  const msg = `SIMULATED ALERT: ${disaster.name} (${SEVERITY_LABEL[cfg.severity]})`;
  return done(next, [
    { target: 'passenger', message: msg, tone: 'danger' },
    { target: 'driver', message: msg, tone: 'danger' },
    ...rec.notices,
  ]);
}

export function resolveScenario(state: DomainState, now: string): Outcome {
  if (state.disaster.status !== 'active') return fail(state, 'No active scenario');
  let next: DomainState = { ...state, disaster: { ...state.disaster, status: 'resolved', resolvedAt: now, revision: state.disaster.revision + 1 } };
  for (const m of next.missions) {
    if (m.status === 'offered' && m.service === 'evacuation_transfer') {
      next = patchMission(next, m.id, { status: 'cancelled', blockedReason: 'Scenario resolved' });
      next = patchRequest(next, m.requestId, { status: 'cancelled', reason: 'Scenario resolved before dispatch' });
      next = log(next, 'system', `${m.id} withdrawn: scenario resolved`, 'warn', now);
    }
  }
  next = log(next, 'operator', `Resolved ${state.disaster.name}. Completed records kept until reset`, 'success', now);
  const rec = reconcile(next, now);
  return done(rec.state, [
    { target: 'passenger', message: 'Simulated scenario resolved', tone: 'success' },
    { target: 'driver', message: 'Simulated scenario resolved', tone: 'success' },
    ...rec.notices,
  ]);
}

/** Operator "Simulate new request": a shelter coordinator asks for a transfer on someone's behalf. */
export function simulateIncomingRequest(state: DomainState, now: string): Outcome {
  const active = state.disaster.status === 'active';
  const service: ServiceType = active ? 'evacuation_transfer' : 'transport_assistance';
  const candidates = SAFE_ROUTES.filter((r) => ['P-ALPHA', 'P-BETA'].includes(r.pickupPointId));
  const open = (routeId: string) =>
    state.requests.some((r) => r.routeId === routeId && r.source === 'shelter' && ['under_review', 'verified', 'approved'].includes(r.status));
  const route = candidates.find((r) => !open(r.id)) ?? candidates[0];
  const n = state.counters.request + 1;
  return submitRequest(
    state,
    {
      source: 'shelter',
      ngoId: 'NGO-NAC',
      beneficiaryLabel: `Family of 2 · via shelter desk (Demo #${n})`,
      service,
      pickupId: route.pickupPointId,
      destinationId: route.destinationPointId,
      passengers: 2,
      accessibility: 'none',
      note: 'Created by shelter coordinator (simulated)',
      acknowledged: true,
      funding: 'ngo',
    },
    now,
  );
}

export function routeLabel(routeId: string | undefined) {
  const r = routeById(routeId);
  return r ? `${r.id} · ${r.label}` : 'No route';
}
