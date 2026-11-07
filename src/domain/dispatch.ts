import { pointById, routeById } from '../data/mockLocations';
import { driverIssues } from './eligibility';
import { pointAuthorizedById, routeStatusById, routeStatusReason } from './hazard';
import type { DomainState, Driver, Gate, Mission, MissionStatus, PassengerRequest } from './types';

// Centralised dispatch gates (spec §8). UI components only render these results.

export const ACTIVE_MISSION_STATUSES: MissionStatus[] = [
  'offered', 'accepted', 'en_route', 'at_pickup', 'onboard', 'arrived', 'awaiting_confirmation',
];
export const IN_PROGRESS_STATUSES: MissionStatus[] = ['accepted', 'en_route', 'at_pickup', 'onboard', 'arrived'];

export function missionFor(state: DomainState, req: PassengerRequest): Mission | undefined {
  return req.missionId ? state.missions.find((m) => m.id === req.missionId) : undefined;
}

export function driverIsBusy(state: DomainState, driverId: string): boolean {
  return state.missions.some((m) => m.driverId === driverId && IN_PROGRESS_STATUSES.includes(m.status));
}

export function eligibleDrivers(state: DomainState, req: Pick<PassengerRequest, 'service' | 'passengers' | 'accessibility'>): Driver[] {
  return Object.values(state.drivers).filter((d) => driverIssues(d, req, driverIsBusy(state, d.id)).length === 0);
}

/** Location/scenario gates shared by requests and missions. */
function safetyGates(
  state: DomainState,
  item: { service: PassengerRequest['service']; pickupId: string; destinationId: string; routeId?: string },
): Gate[] {
  const d = state.disaster;
  const isDisaster = item.service === 'evacuation_transfer';
  const rStatus = routeStatusById(item.routeId, d);
  const route = routeById(item.routeId);
  return [
    {
      id: 'scenario',
      label: 'Active simulated scenario',
      pass: !isDisaster || d.status === 'active',
      detail: isDisaster
        ? d.status === 'active' ? `${d.id} active` : 'Disaster transfers need an active simulated scenario'
        : 'Routine service: no scenario required',
    },
    {
      id: 'pickup',
      label: 'Pickup point authorized',
      pass: pointAuthorizedById(item.pickupId, d),
      detail: pointAuthorizedById(item.pickupId, d)
        ? `${pointById(item.pickupId)?.label} is a designated point`
        : `${pointById(item.pickupId)?.label ?? 'Pickup'} is inside the simulated affected zone`,
    },
    {
      id: 'destination',
      label: 'Destination authorized',
      pass: pointAuthorizedById(item.destinationId, d),
      detail: pointAuthorizedById(item.destinationId, d)
        ? `${pointById(item.destinationId)?.label} is a designated point`
        : `${pointById(item.destinationId)?.label ?? 'Destination'} is inside the simulated affected zone`,
    },
    {
      id: 'route',
      label: 'Predefined route approved in mock data',
      pass: Boolean(route) && rStatus === 'approved',
      detail: route ? `${route.id}: ${routeStatusReason(rStatus)}` : 'No predefined route between these points',
    },
  ];
}

export function requestGates(state: DomainState, req: PassengerRequest): Gate[] {
  const mission = missionFor(state, req);
  const assigned = Boolean(mission && ACTIVE_MISSION_STATUSES.includes(mission.status));
  const drivers = eligibleDrivers(state, req);
  return [
    ...safetyGates(state, req).slice(0, 1),
    { id: 'verified', label: 'Need verified by operator', pass: req.verified, detail: req.verified ? 'Verified (demo)' : 'Awaiting verification' },
    ...safetyGates(state, req).slice(1),
    {
      id: 'routeApproved',
      label: 'Route approved by operator',
      pass: req.routeApproved,
      detail: req.routeApproved ? `${req.routeId} approved for this request` : 'Operator has not approved the route',
    },
    {
      id: 'driver',
      label: 'Eligible verified driver available',
      pass: drivers.length > 0,
      detail: drivers.length > 0 ? drivers.map((d) => d.name).join(', ') : 'No eligible Lifeline drivers available',
    },
    {
      id: 'unassigned',
      label: 'Not already dispatched',
      pass: !assigned,
      detail: assigned ? `${mission?.id} is ${mission?.status.replace(/_/g, ' ')}` : 'No active mission',
    },
  ];
}

export function failedReasons(gates: Gate[]): string[] {
  return gates.filter((g) => !g.pass).map((g) => g.detail);
}

/** Gates for one specific driver accepting one specific offered mission. */
export function acceptGates(state: DomainState, mission: Mission, driver: Driver): Gate[] {
  const issues = driverIssues(driver, mission, driverIsBusy(state, driver.id));
  return [
    ...safetyGates(state, mission),
    {
      id: 'driver',
      label: 'Driver eligible for this mission',
      pass: issues.length === 0,
      detail: issues.length === 0 ? 'Lifeline Verified, online, capacity matches' : issues.join(' · '),
    },
    {
      id: 'unassigned',
      label: 'Mission still open',
      pass: mission.status === 'offered' && !mission.driverId,
      detail: mission.status === 'offered' ? 'Open offer' : `Mission is ${mission.status.replace(/_/g, ' ')}`,
    },
  ];
}

/** Route/scenario reasons that should stop an offered or running mission. */
export function missionSafetyFailures(state: DomainState, mission: Mission): string[] {
  return failedReasons(safetyGates(state, mission));
}
