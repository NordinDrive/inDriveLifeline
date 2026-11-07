import type { DistrictId } from '../domain/types';

/** The fictional person using the Passenger phone. Lifeline only opens for their area. */
export const PASSENGER = {
  id: 'PSG-001',
  name: 'Sam',
  rating: '4,78 (116)',
  districtId: 'A' as DistrictId,
};
