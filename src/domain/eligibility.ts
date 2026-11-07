import type { AccessibilityNeed, Driver, ServiceType } from './types';

export const TRANSPORT_SERVICES: ServiceType[] = ['evacuation_transfer', 'transport_assistance'];

export function isTransport(service: ServiceType): boolean {
  return TRANSPORT_SERVICES.includes(service);
}

/** Reasons a driver cannot take a mission with these needs, independent of route safety. */
export function driverIssues(
  driver: Driver,
  needs: { service: ServiceType; passengers: number; accessibility: AccessibilityNeed },
  busy: boolean,
): string[] {
  const issues: string[] = [];
  if (driver.eligibility === 'not_enrolled') issues.push('Lifeline verification required: driver is not enrolled');
  else if (driver.eligibility === 'pending_review') issues.push('Lifeline verification pending operator review');
  else if (driver.eligibility === 'suspended') issues.push('Driver is suspended from Lifeline');
  else if (driver.eligibility === 'expired') issues.push('Lifeline verification has expired');
  if (!driver.online) issues.push('Driver is offline');
  if (busy) issues.push('Driver already has an active mission');
  if (isTransport(needs.service) && needs.passengers > driver.seats)
    issues.push(`Needs ${needs.passengers} seats; vehicle has ${driver.seats}`);
  if (needs.accessibility === 'wheelchair' && !driver.accessible)
    issues.push('Wheelchair-accessible vehicle required');
  return issues;
}
