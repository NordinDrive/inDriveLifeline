import { DISTRICTS, pointById, routeById } from '../data/mockLocations';
import { SCENARIO_TEMPLATES, SEVERITY_SCALE } from '../data/mockScenarios';
import type { DisasterScenario, Point, RouteStatus, SafePoint, SafeRoute } from './types';

// Simulated hazard geometry. Route and point statuses are derived from a
// fictional polygon; they are demo placeholders, never real safety advice.

export function hazardPolygon(d: DisasterScenario): Point[] | null {
  if (d.status !== 'active') return null;
  const center = DISTRICTS[d.districtId].center;
  const scale = SEVERITY_SCALE[d.severity];
  return SCENARIO_TEMPLATES[d.type].shape.map((p) => ({ x: center.x + p.x * scale, y: center.y + p.y * scale }));
}

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function distToPolygon(p: Point, poly: Point[]): number {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) min = Math.min(min, distToSegment(p, poly[i], poly[(i + 1) % poly.length]));
  return min;
}

export function samplePath(path: Point[], step = 4): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  out.push(path[path.length - 1]);
  return out;
}

export function routeStatus(route: SafeRoute | undefined, d: DisasterScenario): RouteStatus {
  if (!route) return 'unknown';
  const poly = hazardPolygon(d);
  if (!poly) return 'approved';
  const samples = samplePath(route.path);
  if (samples.some((p) => pointInPolygon(p, poly))) return 'blocked';
  const buffer = SCENARIO_TEMPLATES[d.type].unknownBuffer;
  if (samples.some((p) => distToPolygon(p, poly) < buffer)) return 'unknown';
  return 'approved';
}

export function routeStatusById(routeId: string | undefined, d: DisasterScenario): RouteStatus {
  return routeStatus(routeById(routeId), d);
}

export function routeStatusReason(status: RouteStatus): string {
  if (status === 'blocked') return 'Passes through the simulated affected zone';
  if (status === 'unknown') return 'Runs along the edge of the affected zone; status unverified';
  return 'Approved fictional route';
}

export function pointAuthorized(point: SafePoint | undefined, d: DisasterScenario): boolean {
  if (!point || !point.approved) return false;
  const poly = hazardPolygon(d);
  if (!poly) return true;
  const p = { x: point.mapX, y: point.mapY };
  return !pointInPolygon(p, poly) && distToPolygon(p, poly) > 6;
}

export function pointAuthorizedById(id: string, d: DisasterScenario): boolean {
  return pointAuthorized(pointById(id), d);
}

/** Indicative distance for mission cards (fictional scale: 40 map units ≈ 1 km). */
export function routeDistanceKm(route: SafeRoute | undefined): number {
  if (!route) return 0;
  let total = 0;
  for (let i = 0; i < route.path.length - 1; i++) {
    total += Math.hypot(route.path[i + 1].x - route.path[i].x, route.path[i + 1].y - route.path[i].y);
  }
  return Math.round((total / 40) * 10) / 10;
}
