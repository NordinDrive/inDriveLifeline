import { DISTRICTS, pointById, routeById } from '../data/mockLocations';
import { driverIssues } from './eligibility';
import { pointAuthorizedById, routeStatusById, routeStatusReason } from './hazard';
import type { DomainState, Driver, Gate, Mission, MissionStatus, PassengerRequest } from './types';

// Centralised dispatch gates. UI components only render these results.

export const ACTIVE_MISSION_STATUSES: MissionStatus[] = [
  'offered', 'accepted', 'en_route', 'at_pickup', 'onboard', 'arrived', 'awaiting_confirmation',
];
export const IN_PROGRESS_STATUSES: MissionStatus[] = ['accepted', 'en_route', 'at_pickup', 'onboard', 'arrived'];

/** Gate ids that only matter for new requests and offers, not for trips already under way. */
const NEW_WORK_GATES = ['scenario', 'area'];

export function missionFor(state: DomainState, req: PassengerRequest): Mission | undefined {
  return req.missionId ? state.missions.find((m) => m.id === req.missionId) : undefined;
}

export function driverIsBusy(state: DomainState, driverId: string): boolean {
  return state.missions.some((m) => m.driverId === driverId && IN_PROGRESS_STATUSES.includes(m.status));
}

export function eligibleDrivers(state: DomainState, req: Pick<PassengerRequest, 'passengers' | 'accessibility'>): Driver[] {
  return Object.values(state.drivers).filter((d) => driverIssues(d, req, driverIsBusy(state, d.id)).length === 0);
}

/** True when Lifeline is open for people in this district. */
export function lifelineOpenIn(state: DomainState, districtId: string): boolean {
  return state.disaster.status === 'active' && state.disaster.districtId === districtId;
}

/** Scenario, area, location and route gates shared by requests and missions. */
export function safetyGates(state: DomainState, item: { pickupId: string; destinationId: string; routeId?: string }): Gate[] {
  const d = state.disaster;
  const rStatus = routeStatusById(item.routeId, d);
  const route = routeById(item.routeId);
  const pickup = pointById(item.pickupId);
  const destination = pointById(item.destinationId);
  const inArea = Boolean(pickup && pickup.districtId === d.districtId);
  return [
    {
      id: 'scenario',
      label: 'Admin-activated scenario',
      pass: d.status === 'active',
      detail: d.status === 'active' ? `${d.name} is active` : 'Lifeline needs an active, Admin-controlled disaster scenario',
    },
    {
      id: 'area',
      label: 'Pickup in the selected area',
      pass: inArea,
      detail: inArea ? `${pickup?.label} is in ${DISTRICTS[d.districtId].label}` : `Lifeline is only active in ${DISTRICTS[d.districtId].label}`,
    },
    {
      id: 'pickup',
      label: 'Designated pickup point',
      pass: pickup?.kind === 'pickup' && pointAuthorizedById(item.pickupId, d),
      detail:
        pickup?.kind !== 'pickup'
          ? 'Not a designated pickup point'
          : pointAuthorizedById(item.pickupId, d)
            ? `${pickup.label} is a designated pickup point`
            : `${pickup.label} is inside the simulated affected zone`,
    },
    {
      id: 'destination',
      label: 'Approved shelter',
      pass: destination?.kind === 'shelter' && pointAuthorizedById(item.destinationId, d),
      detail:
        destination?.kind !== 'shelter'
          ? 'Destination is not an approved shelter'
          : pointAuthorizedById(item.destinationId, d)
            ? `${destination.label} is an approved shelter`
            : `${destination.label} is inside the simulated affected zone`,
    },
    {
      id: 'route',
      label: 'Route approved in the scenario',
      pass: Boolean(route) && rStatus === 'approved',
      detail: route ? `${route.id}: ${routeStatusReason(rStatus)}` : 'No predefined route between these points',
    },
  ];
}

/** Gates the Admin must pass to approve a request and publish it to volunteers. */
export function requestGates(state: DomainState, req: PassengerRequest): Gate[] {
  const mission = missionFor(state, req);
  const dispatched = Boolean(mission && ACTIVE_MISSION_STATUSES.includes(mission.status));
  return [
    ...safetyGates(state, req),
    {
      id: 'unassigned',
      label: 'Not already published',
      pass: !dispatched,
      detail: dispatched ? `${mission?.id} is ${mission?.status.replace(/_/g, ' ')}` : 'No active mission',
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
      label: 'Eligible, available volunteer',
      pass: issues.length === 0,
      detail: issues.length === 0 ? 'Verified volunteer, available, seats and accessibility match' : issues.join(' · '),
    },
    {
      id: 'unassigned',
      label: 'Mission still open',
      pass: mission.status === 'offered' && !mission.driverId,
      detail: mission.status === 'offered' ? 'Open offer' : `Mission is ${mission.status.replace(/_/g, ' ')}`,
    },
  ];
}

/**
 * Route and location reasons that should stop an offered mission or pause a trip
 * under way. Includes the scenario/area gates only for offers that are not yet accepted.
 */
export function missionSafetyFailures(state: DomainState, mission: Mission): string[] {
  const gates = safetyGates(state, mission);
  return failedReasons(mission.status === 'offered' ? gates : gates.filter((g) => !NEW_WORK_GATES.includes(g.id)));
}
