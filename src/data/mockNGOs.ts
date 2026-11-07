import type { Campaign, NgoPartner } from '../domain/types';

export const MOCK_NGOS: NgoPartner[] = [
  { id: 'NGO-CRN', name: 'Community Relief Network (Demo)', verified: true, focus: 'Food & essential supplies' },
  { id: 'NGO-NAC', name: 'Neighborhood Aid Center (Demo)', verified: true, focus: 'Assisted transport & shelters' },
];

export const MOCK_CAMPAIGNS: Campaign[] = [
  { id: 'CMP-WINTER', ngoId: 'NGO-CRN', name: 'Winter Warmth — Demo City', goal: 50, unit: 'family deliveries', baselineCompleted: 31 },
];

export const PASSENGER = {
  id: 'PSG-001',
  name: 'Sam (Demo)',
  rating: '4,78 (116)',
};
