import type { AccessibilityNeed, Driver } from './types';

/** Reasons a volunteer cannot take a mission with these needs, independent of route safety. */
export function driverIssues(driver: Driver, needs: { passengers: number; accessibility: AccessibilityNeed }, busy: boolean): string[] {
  const issues: string[] = [];
  if (driver.eligibility === 'not_enrolled') issues.push('Join Lifeline as a volunteer first');
  else if (driver.eligibility === 'pending_review') issues.push('Lifeline verification pending Admin review');
  else if (driver.eligibility === 'suspended') issues.push('Driver is suspended from Lifeline');
  else if (driver.eligibility === 'expired') issues.push('Lifeline verification has expired');
  if (!driver.online) issues.push('Driver is offline');
  else if (!driver.available) issues.push('Not available for Lifeline missions');
  if (busy) issues.push('Driver already has an active mission');
  if (needs.passengers > driver.seats) issues.push(`Needs ${needs.passengers} seats; vehicle has ${driver.seats}`);
  if (needs.accessibility === 'wheelchair' && !driver.accessible) issues.push('Wheelchair-accessible vehicle required');
  return issues;
}
