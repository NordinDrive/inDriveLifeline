// Simple outline glyphs approximating the social row and service artwork in the
// reference screenshots. Original drawings, not copied brand assets.

type P = { size?: number };

export function TikTokIcon({ size = 30 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.6 3c.4 2.1 1.7 3.5 3.9 3.7v3.1c-1.4.1-2.7-.3-3.9-1v6.1c0 3.6-2.6 6.1-6 6.1-3.3 0-5.8-2.5-5.8-5.6 0-3.4 2.9-6 6.5-5.5v3.2c-1.6-.4-3.3.6-3.3 2.3 0 1.3 1.1 2.4 2.6 2.4 1.6 0 2.7-1.1 2.7-3V3h3.3z" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 30 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <path d="M3.5 20.5l1.3-4.2A8.6 8.6 0 1 1 8 19.4l-4.5 1.1z" strokeLinejoin="round" />
      <path d="M9 8.3c.2-.4.5-.5.8-.5h.5l1 2.3-.7.9c.5 1 1.3 1.8 2.4 2.4l.9-.7 2.3 1v.5c0 .4-.2.7-.6.9-.7.4-1.6.4-2.6 0a8 8 0 0 1-4-4c-.4-1-.4-2 0-2.8z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ size = 30 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3.1z" />
    </svg>
  );
}

export function InstagramIcon({ size = 30 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** White sedan, the recurring vehicle drawing on the inDrive service tiles. */
export function CarArt({ width = 120, color = '#f4f4f4' }: { width?: number; color?: string }) {
  return (
    <svg width={width} viewBox="0 0 120 60" aria-hidden>
      <path d="M8 40c0-6 4-9 10-10l14-10c4-3 9-4 15-4h22c6 0 11 2 15 6l9 8c9 1 16 4 17 10v6c0 2-1 3-3 3H11c-2 0-3-1-3-3v-6z" fill={color} />
      <path d="M38 22l-8 8h30V19H48c-4 0-7 1-10 3zM64 19v11h28l-7-7c-3-3-7-4-11-4H64z" fill="#3a3d42" />
      <circle cx="30" cy="48" r="9" fill="#1c1c1c" /><circle cx="30" cy="48" r="4" fill="#c8c8c8" />
      <circle cx="92" cy="48" r="9" fill="#1c1c1c" /><circle cx="92" cy="48" r="4" fill="#c8c8c8" />
    </svg>
  );
}

export function CityRidesArt() {
  return (
    <svg className="tile-art" viewBox="0 0 174 158" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {/* lime zig-zag band, echoing the City Rides tile artwork */}
      <path d="M50 0h44l26 52 14-52h40v118l-30-48-24 88H82l26-60-34 24-24-48z" fill="#8cc63f" />
      <path d="M94 0h22l18 34-8 30z" fill="#a4d63a" />
      <g transform="translate(6 104)">
        <circle cx="12" cy="40" r="9" fill="#1d1d1d" /><circle cx="42" cy="40" r="9" fill="#1d1d1d" />
        <path d="M8 34l12-14h12l10 10-3 6H14z" fill="#7bbf2a" /><path d="M22 18h14l4 6H24z" fill="#5d9a1c" />
      </g>
      <g transform="translate(30 108)">
        <path d="M2 32c0-5 3-8 8-9l12-10c3-2 7-3 12-3h18c5 0 9 2 12 5l7 7c7 1 12 4 13 9v5H2v-4z" fill="#e8413a" />
        <path d="M30 14h20v9H24z" fill="#3a3d42" />
        <circle cx="20" cy="38" r="7" fill="#1c1c1c" /><circle cx="66" cy="38" r="7" fill="#1c1c1c" />
      </g>
      <g transform="translate(68 98)"><CarArt width={112} /></g>
    </svg>
  );
}

export function CityToCityArt() {
  return (
    <svg className="tile-art" viewBox="0 0 120 70" preserveAspectRatio="xMaxYMax meet" aria-hidden>
      <path d="M22 10v34" stroke="#bfbfbf" strokeWidth="2.5" />
      <path d="M22 12h20l6 5-6 5H22z" fill="#8cc63f" /><path d="M22 22H6l-5 4 5 4h16z" fill="#8cc63f" />
      <g transform="translate(6 30) scale(0.72)"><CarArt width={120} /></g>
      <rect x="92" y="30" width="26" height="36" rx="6" fill="#f5b700" />
      <rect x="99" y="25" width="12" height="7" rx="2" fill="none" stroke="#c8c8c8" strokeWidth="2.5" />
      <path d="M99 38v22M105 38v22M111 38v22" stroke="#d99b00" strokeWidth="2" />
      <rect x="66" y="2" width="44" height="18" rx="9" fill="#C1F11D" />
      <text x="88" y="15" textAnchor="middle" fontSize="10" fontWeight="700" fill="#111">SWAB</text>
    </svg>
  );
}

export function CourierArt() {
  return (
    <svg className="tile-art" viewBox="0 0 80 60" preserveAspectRatio="xMaxYMax meet" aria-hidden>
      <rect x="4" y="34" width="18" height="22" fill="#d8a77f" />
      <path d="M22 18h50v40H22z" fill="#9bd22d" />
      <path d="M18 12h58v10H18z" fill="#b4e637" />
      <path d="M30 28l5 22 6-16 6 16 6-16 6 16 5-22" stroke="#fff" strokeWidth="5" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function FreightArt() {
  return (
    <svg className="tile-art" viewBox="0 0 90 60" preserveAspectRatio="xMaxYMax meet" aria-hidden>
      <path d="M44 12h46v36H44z" fill="#9bd22d" />
      <path d="M56 22l6 20 6-12 6 12 6-20" stroke="#e9ffb0" strokeWidth="4" fill="none" />
      <path d="M8 26c0-4 3-6 6-6h22l8 10v18H8z" fill="#5a5d63" />
      <path d="M22 23h12l6 8H22z" fill="#2a2c30" />
      <circle cx="20" cy="50" r="6" fill="#1c1c1c" /><circle cx="70" cy="50" r="6" fill="#1c1c1c" />
    </svg>
  );
}

export function RouteCardArt({ variant }: { variant: 'rabat' | 'marrakesh' }) {
  return variant === 'rabat' ? (
    <svg viewBox="0 0 192 95" preserveAspectRatio="xMidYMid slice" className="route-art" aria-hidden>
      <defs>
        <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5d9ad6" /><stop offset="1" stopColor="#cfe4f2" /></linearGradient>
      </defs>
      <rect width="192" height="95" fill="url(#sky1)" />
      <ellipse cx="60" cy="22" rx="30" ry="8" fill="#fff" opacity=".7" />
      <rect x="80" y="18" width="26" height="62" fill="#b07a4f" />
      <path d="M86 26h14v8H86zM86 40h14v8H86z" fill="#8a5a36" />
      <rect y="70" width="192" height="25" fill="#c9b79a" />
      {[10, 30, 50, 120, 140, 160, 180].map((x) => (
        <rect key={x} x={x} y={62 + (x % 3)} width="9" height="18" fill="#d8c7a8" />
      ))}
    </svg>
  ) : (
    <svg viewBox="0 0 192 95" preserveAspectRatio="xMidYMid slice" className="route-art" aria-hidden>
      <rect width="192" height="95" fill="#6e3b2a" />
      <path d="M70 0h52l-8 95H78z" fill="#d9c3a0" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={4 + i * 14} y={8 + i * 6} width="12" height="70" fill={['#b8324a', '#2f5d9a', '#d18b2c', '#7a2a5c'][i]} />
          <rect x={126 + i * 16} y={4 + i * 5} width="14" height="80" fill={['#c4452f', '#3b7a5a', '#a62f5e', '#e0a43a'][i]} />
        </g>
      ))}
    </svg>
  );
}
