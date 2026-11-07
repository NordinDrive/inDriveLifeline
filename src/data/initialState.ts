import type { DomainState } from '../domain/types';
import { MOCK_DRIVERS } from './mockDrivers';
import { MOCK_CAMPAIGNS, MOCK_NGOS } from './mockNGOs';

// Deterministic starting point for every demo run. "Reset Demo" restores exactly this.
const T0 = '2026-11-06T08:00:00.000Z';

export function createInitialState(): DomainState {
  return {
    disaster: {
      id: 'SCENARIO-NONE',
      name: 'No active scenario',
      type: 'earthquake',
      severity: 'high',
      status: 'inactive',
      districtId: 'A',
      revision: 0,
    },
    layers: { affected: true, pickups: true, shelters: true, routes: true },
    drivers: Object.fromEntries(MOCK_DRIVERS.map((d) => [d.id, structuredClone(d)])),
    requests: [
      {
        id: 'REQ-0002',
        source: 'hotline',
        ngoId: 'NGO-NAC',
        beneficiaryLabel: 'Older adult, wheelchair user (Demo)',
        service: 'transport_assistance',
        pickupId: 'P-BETA',
        destinationId: 'S-NORTH',
        routeId: 'ROUTE-D4',
        passengers: 1,
        accessibility: 'wheelchair',
        note: 'Non-urgent service appointment (fictional)',
        funding: 'ngo',
        status: 'under_review',
        verified: false,
        routeApproved: false,
        createdAt: '2026-11-06T08:05:00.000Z',
      },
      {
        id: 'REQ-0001',
        source: 'ngo',
        ngoId: 'NGO-CRN',
        campaignId: 'CMP-WINTER',
        beneficiaryLabel: 'Winter Warmth distribution (Demo)',
        service: 'essential_delivery',
        pickupId: 'L-FOOD',
        destinationId: 'P-BETA',
        routeId: 'ROUTE-L1',
        passengers: 0,
        load: '20 food parcels',
        accessibility: 'none',
        note: 'Routine NGO delivery',
        funding: 'ngo',
        status: 'approved',
        verified: true,
        routeApproved: true,
        missionId: 'MSN-0001',
        createdAt: T0,
      },
    ],
    missions: [
      {
        id: 'MSN-0001',
        requestId: 'REQ-0001',
        service: 'essential_delivery',
        pickupId: 'L-FOOD',
        destinationId: 'P-BETA',
        routeId: 'ROUTE-L1',
        passengers: 0,
        load: '20 food parcels',
        accessibility: 'none',
        status: 'offered',
        baseCompensation: 25,
        bonus: 15,
        funding: 'ngo',
        declinedBy: [],
        passengerConfirmed: false,
        createdAt: T0,
        offeredAt: T0,
      },
    ],
    bonuses: {},
    ngos: structuredClone(MOCK_NGOS),
    campaigns: structuredClone(MOCK_CAMPAIGNS),
    events: [
      { id: 'EVT-0003', at: '2026-11-06T08:05:00.000Z', actor: 'ngo', message: 'Hotline · Neighborhood Aid Center (Demo) submitted REQ-0002: Transportation Assistance', tone: 'info' },
      { id: 'EVT-0002', at: T0, actor: 'operator', message: 'Offered MSN-0001 (Winter Warmth food parcels) to eligible verified drivers', tone: 'info' },
      { id: 'EVT-0001', at: T0, actor: 'system', message: 'Demo initialised with fictional data', tone: 'info' },
    ],
    counters: { request: 2, mission: 1, event: 3 },
  };
}
