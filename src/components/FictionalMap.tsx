import { useMemo, useState } from 'react';
import { useDemo } from '../app/store';
import { DISTRICTS, MAP_HEIGHT, MAP_WIDTH, pointById, routeById, SAFE_POINTS, SAFE_ROUTES } from '../data/mockLocations';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { hazardPolygon, pointAuthorized, routeStatus, routeStatusReason } from '../domain/hazard';
import type { Mission, Point, RouteStatus, SafePoint } from '../domain/types';

// Self-contained fictional SVG map (no tiles, no API key). Styled after the dark
// navy map in the reference screenshot. All zones and routes are simulated.

const ROADS: Point[][] = [
  [{ x: -10, y: 60 }, { x: 140, y: 110 }, { x: 260, y: 70 }, { x: 410, y: 30 }],
  [{ x: -10, y: 180 }, { x: 120, y: 190 }, { x: 230, y: 160 }, { x: 410, y: 175 }],
  [{ x: -10, y: 280 }, { x: 150, y: 290 }, { x: 260, y: 270 }, { x: 410, y: 250 }],
  [{ x: 70, y: -10 }, { x: 95, y: 150 }, { x: 80, y: 300 }, { x: 110, y: 450 }],
  [{ x: 190, y: -10 }, { x: 175, y: 140 }, { x: 200, y: 300 }, { x: 170, y: 450 }],
  [{ x: 320, y: -10 }, { x: 330, y: 200 }, { x: 310, y: 450 }],
  [{ x: -10, y: 400 }, { x: 160, y: 380 }, { x: 410, y: 420 }],
  [{ x: 230, y: -10 }, { x: 410, y: 140 }],
  [{ x: -10, y: 420 }, { x: 260, y: 200 }, { x: 410, y: 80 }],
];

const MINOR: Point[][] = Array.from({ length: 14 }, (_, i) => {
  const y = 20 + i * 31;
  return [{ x: -10, y: y + ((i * 7) % 11) }, { x: 410, y: y - ((i * 5) % 13) }];
}).concat(
  Array.from({ length: 12 }, (_, i) => {
    const x = 18 + i * 34;
    return [{ x: x + ((i * 9) % 13), y: -10 }, { x: x - ((i * 4) % 10), y: 450 }];
  }),
);

const toPath = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

const HAZARD_COLORS = {
  earthquake: '#ff6b3d',
  flood: '#3fb6ff',
  wildfire: '#ff9f1a',
  storm: '#b48cff',
} as const;

const SEVERITY_OPACITY = { advisory: 0.18, high: 0.28, critical: 0.4 } as const;

const ROUTE_STYLE: Record<RouteStatus, { stroke: string; dash?: string }> = {
  approved: { stroke: '#9be15d' },
  blocked: { stroke: '#ff5a5f', dash: '6 5' },
  unknown: { stroke: '#a0a7b4', dash: '2 5' },
};

function vehiclePosition(m: Mission): Point | null {
  const route = routeById(m.routeId);
  if (!route) return null;
  const a = route.path[0];
  const b = route.path[route.path.length - 1];
  const mid = route.path[Math.floor(route.path.length / 2)];
  switch (m.status) {
    case 'accepted':
      return { x: a.x + 26, y: a.y - 22 };
    case 'en_route':
      return { x: a.x + 12, y: a.y - 10 };
    case 'at_pickup':
      return a;
    case 'onboard':
      return mid;
    case 'arrived':
    case 'awaiting_confirmation':
    case 'confirmed':
      return b;
    default:
      return null;
  }
}

interface Props {
  variant: 'home' | 'card' | 'operator';
  /** Force the Lifeline network (points + routes) to show even in normal mode. */
  network?: boolean;
  highlightRouteId?: string;
  focusPointIds?: string[];
  className?: string;
  showLegend?: boolean;
  ambientCars?: boolean;
}

type Selection = { kind: 'point'; id: string } | { kind: 'route'; id: string } | null;

export function FictionalMap({ variant, network, highlightRouteId, focusPointIds, className, showLegend, ambientCars }: Props) {
  const disaster = useDemo((s) => s.domain.disaster);
  const layers = useDemo((s) => s.domain.layers);
  const missions = useDemo((s) => s.domain.missions);
  const [selection, setSelection] = useState<Selection>(null);

  const active = disaster.status === 'active';
  const poly = hazardPolygon(disaster);
  const showNetwork = Boolean(network || active || highlightRouteId);
  const statuses = useMemo(
    () => Object.fromEntries(SAFE_ROUTES.map((r) => [r.id, routeStatus(r, disaster)])) as Record<string, RouteStatus>,
    [disaster],
  );

  const activeMission = missions.find(
    (m) => m.driverId === PHONE_DRIVER_ID && ['accepted', 'en_route', 'at_pickup', 'onboard', 'arrived', 'awaiting_confirmation'].includes(m.status),
  );
  const vehicle = activeMission ? vehiclePosition(activeMission) : null;
  const trackRoute = highlightRouteId ?? activeMission?.routeId;

  const selectedPickup = selection?.kind === 'point' ? pointById(selection.id) : undefined;
  const relatedRoutes = selectedPickup ? SAFE_ROUTES.filter((r) => r.pickupPointId === selectedPickup.id || r.destinationPointId === selectedPickup.id).map((r) => r.id) : [];

  const visiblePoint = (p: SafePoint) => {
    if (!showNetwork) return false;
    if (focusPointIds && !focusPointIds.includes(p.id) && variant !== 'operator') return false;
    if (p.kind === 'shelter') return layers.shelters;
    return layers.pickups;
  };

  const visibleRoutes = SAFE_ROUTES.filter((r) => {
    if (!showNetwork) return false;
    if (r.id === trackRoute) return true;
    if (!layers.routes) return false;
    if (variant === 'operator') return true;
    // Phones only show the evacuation network to keep the small map legible.
    return active && ['P-ALPHA', 'P-BETA'].includes(r.pickupPointId);
  });

  const popover = (() => {
    if (!selection) return null;
    if (selection.kind === 'route') {
      const r = routeById(selection.id)!;
      const st = statuses[r.id];
      const mid = r.path[Math.floor(r.path.length / 2)];
      return {
        at: mid,
        title: `${r.id} · ${r.label}`,
        line: st === 'approved' ? 'Approved fictional route' : `Dispatch unavailable: ${routeStatusReason(st).toLowerCase()}`,
        tone: st,
      };
    }
    const p = pointById(selection.id)!;
    const ok = pointAuthorized(p, disaster);
    const cap = p.capacity ? ` · ${p.occupancy}/${p.capacity} places (demo)` : '';
    return {
      at: { x: p.mapX, y: p.mapY },
      title: p.label,
      line: `${ok ? 'Designated point' : 'Inside affected zone, not authorized'}${cap}`,
      tone: ok ? 'approved' : 'blocked',
    } as const;
  })();

  const hazardColor = HAZARD_COLORS[disaster.type];

  return (
    <div className={`fmap fmap--${variant} ${className ?? ''}`}>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio={variant === 'home' ? 'xMidYMid slice' : 'xMidYMid meet'}
        role="img"
        aria-label="Fictional demo map"
        onClick={() => setSelection(null)}
      >
        <defs>
          <pattern id={`hatch-${variant}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={hazardColor} strokeWidth="2.5" opacity="0.5" />
          </pattern>
        </defs>
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#1b2a44" />
        {/* city blocks */}
        <g fill="#20314f">
          {Array.from({ length: 30 }, (_, i) => (
            <rect key={i} x={(i * 53) % 380} y={(i * 97) % 420} width={30 + (i % 4) * 8} height={22 + (i % 3) * 10} rx="3" transform={`rotate(${(i % 5) * 6 - 12} ${(i * 53) % 380} ${(i * 97) % 420})`} />
          ))}
        </g>
        <path d="M0 230 Q120 250 140 330 T120 440 L0 440Z" fill="#1d3a3a" opacity="0.55" />
        <g stroke="#2d4569" strokeWidth="2" fill="none">
          {MINOR.map((r, i) => <path key={i} d={toPath(r)} />)}
        </g>
        <g stroke="#3c5888" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {ROADS.map((r, i) => <path key={i} d={toPath(r)} />)}
        </g>

        {active && poly && layers.affected && (
          <g className="hazard">
            <path d={`${toPath(poly)} Z`} fill={hazardColor} opacity={SEVERITY_OPACITY[disaster.severity]} />
            <path d={`${toPath(poly)} Z`} fill={`url(#hatch-${variant})`} />
            <path d={`${toPath(poly)} Z`} fill="none" stroke={hazardColor} strokeWidth="2" strokeDasharray={disaster.severity === 'critical' ? undefined : '5 4'} />
            <text x={DISTRICTS[disaster.districtId].center.x} y={DISTRICTS[disaster.districtId].center.y} textAnchor="middle" className="fmap-zone-label" fill="#fff">
              Affected zone (simulated)
            </text>
          </g>
        )}

        {showNetwork && variant === 'operator' && (
          <g className="fmap-districts">
            {Object.values(DISTRICTS).map((d) => (
              <text key={d.id} x={d.center.x} y={d.center.y + 46} textAnchor="middle">{d.label}</text>
            ))}
          </g>
        )}

        {visibleRoutes.map((r) => {
          const st = statuses[r.id];
          const style = ROUTE_STYLE[st];
          const emphasized = r.id === trackRoute || relatedRoutes.includes(r.id) || selection?.id === r.id;
          const dim = (selectedPickup && !relatedRoutes.includes(r.id)) || (trackRoute && r.id !== trackRoute && variant !== 'operator');
          return (
            <g key={r.id} opacity={dim ? 0.35 : 1}>
              <path d={toPath(r.path)} stroke="#0e1626" strokeWidth={emphasized ? 9 : 7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d={toPath(r.path)}
                stroke={style.stroke}
                strokeWidth={emphasized ? 5 : 3.5}
                strokeDasharray={style.dash}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={toPath(r.path)}
                stroke="transparent"
                strokeWidth="16"
                fill="none"
                className="fmap-hit"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelection({ kind: 'route', id: r.id });
                }}
              >
                <title>{`${r.id}: ${st}`}</title>
              </path>
              {(variant === 'operator' || emphasized) && (
                <text x={r.path[1].x + 4} y={r.path[1].y - 5} className="fmap-route-label" fill={style.stroke}>
                  {r.id.replace('ROUTE-', '')}
                </text>
              )}
            </g>
          );
        })}

        {SAFE_POINTS.filter(visiblePoint).map((p) => {
          const ok = pointAuthorized(p, disaster);
          const fill = !ok ? '#ff5a5f' : p.kind === 'shelter' ? '#C1F11D' : p.kind === 'pickup' ? '#5ee0a0' : '#f5c84b';
          return (
            <g
              key={p.id}
              transform={`translate(${p.mapX} ${p.mapY})`}
              className="fmap-hit"
              onClick={(e) => {
                e.stopPropagation();
                setSelection({ kind: 'point', id: p.id });
              }}
            >
              {p.kind === 'shelter' ? (
                <>
                  <rect x="-11" y="-11" width="22" height="22" rx="6" fill={fill} stroke="#0e1626" strokeWidth="2" />
                  <path d="M-6 2l6-6 6 6v5h-12z" fill="#111" />
                </>
              ) : p.kind === 'pickup' ? (
                <>
                  <circle r="10" fill={fill} stroke="#0e1626" strokeWidth="2" />
                  <circle r="3.5" fill="#0e1626" />
                </>
              ) : (
                <>
                  <rect x="-9" y="-9" width="18" height="18" rx="3" fill={fill} stroke="#0e1626" strokeWidth="2" transform="rotate(45)" />
                </>
              )}
              {(variant !== 'home' || active) && (
                <text y={p.kind === 'shelter' ? -15 : -14} textAnchor="middle" className="fmap-point-label">
                  {p.label}
                </text>
              )}
            </g>
          );
        })}

        {ambientCars && !active && (
          <g>
            {[
              { x: 230, y: 40, r: -30 },
              { x: 160, y: 205, r: 20 },
              { x: 330, y: 300, r: 80 },
              { x: 110, y: 330, r: -10 },
            ].map((c, i) => (
              <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.r})`}>
                <rect x="-6" y="-11" width="12" height="22" rx="4" fill="#e9eef5" />
                <rect x="-4.5" y="-6" width="9" height="6" rx="1.5" fill="#6c7a8f" />
              </g>
            ))}
          </g>
        )}

        {vehicle && (
          <g transform={`translate(${vehicle.x} ${vehicle.y})`} className="fmap-vehicle">
            <circle r="13" fill="#C1F11D" opacity="0.25" />
            <rect x="-6" y="-10" width="12" height="20" rx="4" fill="#fff" stroke="#0e1626" strokeWidth="1.5" />
            <rect x="-4" y="-5" width="8" height="5" rx="1.5" fill="#444" />
          </g>
        )}

        {popover && (
          <g transform={`translate(${Math.min(Math.max(popover.at.x, 92), MAP_WIDTH - 92)} ${Math.max(popover.at.y - 20, 40)})`} className="fmap-popover">
            <rect x="-88" y="-36" width="176" height="34" rx="8" fill="#111" stroke={popover.tone === 'approved' ? '#9be15d' : popover.tone === 'unknown' ? '#a0a7b4' : '#ff5a5f'} />
            <text x="-80" y="-22" className="fmap-pop-title">{popover.title}</text>
            <text x="-80" y="-9" className="fmap-pop-line">{popover.line}</text>
          </g>
        )}
      </svg>

      <div className="fmap-badge">Fictional Demo Map</div>
      {showLegend && showNetwork && (
        <div className="fmap-legend">
          <span><i className="lg lg-pickup" />Safe pickup</span>
          <span><i className="lg lg-shelter" />Shelter</span>
          <span><i className="lg lg-approved" />Approved</span>
          <span><i className="lg lg-blocked" />Blocked</span>
          <span><i className="lg lg-unknown" />Unknown</span>
          {active && <span><i className="lg lg-zone" style={{ background: hazardColor }} />Affected (sim.)</span>}
        </div>
      )}
    </div>
  );
}
