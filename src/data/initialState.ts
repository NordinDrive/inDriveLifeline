import type { DomainState } from '../domain/types';
import { MOCK_DRIVERS } from './mockDrivers';

// Deterministic starting point for every demo run: no active scenario, no
// requests and no missions. "Reset Demo" restores exactly this.
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
    requests: [],
    missions: [],
    bonuses: {},
    events: [{ id: 'EVT-0001', at: T0, actor: 'system', message: 'Demo initialised: Lifeline inactive until the Admin activates a scenario', tone: 'info' }],
    counters: { request: 0, mission: 0, event: 1 },
  };
}
