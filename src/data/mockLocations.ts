import type { District, SafePoint, SafeRoute } from '../domain/types';

// Fictional map coordinates in a 400 × 440 SVG space. Not real geography.
export const MAP_WIDTH = 400;
export const MAP_HEIGHT = 440;

export const DISTRICTS: Record<District['id'], District> = {
  A: { id: 'A', label: 'Demo District A', center: { x: 130, y: 210 } },
  B: { id: 'B', label: 'Demo District B', center: { x: 300, y: 125 } },
  C: { id: 'C', label: 'Demo District C', center: { x: 290, y: 335 } },
};

export const SAFE_POINTS: SafePoint[] = [
  { id: 'P-ALPHA', label: 'Assembly Point Alpha', kind: 'pickup', districtId: 'A', approved: true, mapX: 55, mapY: 345 },
  { id: 'P-BETA', label: 'Community Center Beta', kind: 'pickup', districtId: 'A', approved: true, mapX: 215, mapY: 250 },
  { id: 'S-GREEN', label: 'Shelter Green', kind: 'shelter', districtId: 'A', approved: true, mapX: 60, mapY: 85, capacity: 120, occupancy: 46 },
  { id: 'S-NORTH', label: 'Safe Hub North', kind: 'shelter', districtId: 'B', approved: true, mapX: 335, mapY: 50, capacity: 80, occupancy: 21 },
  { id: 'L-FOOD', label: 'Food Distribution Hub', kind: 'logistics', districtId: 'C', approved: true, mapX: 340, mapY: 392 },
  { id: 'L-DELTA', label: 'Donation Point Delta', kind: 'logistics', districtId: 'C', approved: true, mapX: 185, mapY: 410 },
];

export const SAFE_ROUTES: SafeRoute[] = [
  { id: 'ROUTE-A1', label: 'West corridor', pickupPointId: 'P-ALPHA', destinationPointId: 'S-GREEN',
    path: [{ x: 55, y: 345 }, { x: 26, y: 318 }, { x: 26, y: 118 }, { x: 60, y: 85 }] },
  { id: 'ROUTE-B2', label: 'Central avenue', pickupPointId: 'P-BETA', destinationPointId: 'S-GREEN',
    path: [{ x: 215, y: 250 }, { x: 160, y: 215 }, { x: 110, y: 150 }, { x: 60, y: 85 }] },
  { id: 'ROUTE-C3', label: 'South ring road', pickupPointId: 'P-ALPHA', destinationPointId: 'S-NORTH',
    path: [{ x: 55, y: 345 }, { x: 140, y: 372 }, { x: 250, y: 368 }, { x: 376, y: 300 }, { x: 376, y: 95 }, { x: 335, y: 50 }] },
  { id: 'ROUTE-D4', label: 'North boulevard', pickupPointId: 'P-BETA', destinationPointId: 'S-NORTH',
    path: [{ x: 215, y: 250 }, { x: 255, y: 185 }, { x: 300, y: 120 }, { x: 335, y: 50 }] },
  { id: 'ROUTE-L1', label: 'Market street', pickupPointId: 'L-FOOD', destinationPointId: 'P-BETA',
    path: [{ x: 340, y: 392 }, { x: 290, y: 320 }, { x: 215, y: 250 }] },
  { id: 'ROUTE-L2', label: 'East bypass', pickupPointId: 'L-FOOD', destinationPointId: 'S-NORTH',
    path: [{ x: 340, y: 392 }, { x: 388, y: 330 }, { x: 388, y: 100 }, { x: 335, y: 50 }] },
  { id: 'ROUTE-L3', label: 'Harbour lane', pickupPointId: 'L-DELTA', destinationPointId: 'L-FOOD',
    path: [{ x: 185, y: 410 }, { x: 270, y: 404 }, { x: 340, y: 392 }] },
  { id: 'ROUTE-L4', label: 'Coastal road', pickupPointId: 'L-FOOD', destinationPointId: 'S-GREEN',
    path: [{ x: 340, y: 392 }, { x: 185, y: 425 }, { x: 55, y: 400 }, { x: 14, y: 330 }, { x: 14, y: 110 }, { x: 60, y: 85 }] },
];

export function pointById(id: string): SafePoint | undefined {
  return SAFE_POINTS.find((p) => p.id === id);
}

export function routeById(id: string | undefined): SafeRoute | undefined {
  return id ? SAFE_ROUTES.find((r) => r.id === id) : undefined;
}

export function findRoute(pickupId: string, destinationId: string): SafeRoute | undefined {
  return SAFE_ROUTES.find((r) => r.pickupPointId === pickupId && r.destinationPointId === destinationId);
}

export function destinationsFrom(pickupId: string): SafePoint[] {
  return SAFE_ROUTES.filter((r) => r.pickupPointId === pickupId)
    .map((r) => pointById(r.destinationPointId))
    .filter((p): p is SafePoint => Boolean(p));
}
