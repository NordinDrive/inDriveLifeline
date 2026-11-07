import { useEffect, useState, type ReactNode } from 'react';

function useClock() {
  const fmt = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const id = window.setInterval(() => setT(fmt()), 15000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

export function StatusBar({ battery }: { battery: number }) {
  const time = useClock();
  return (
    <div className="statusbar" aria-hidden>
      <span className="sb-time">
        {time}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3L3 10.5l7.5 2.9L13.4 21z" /></svg>
      </span>
      <span className="sb-right">
        <svg width="20" height="13" viewBox="0 0 20 13" fill="currentColor">
          <rect x="0" y="9" width="3.4" height="4" rx="1" /><rect x="5" y="6" width="3.4" height="7" rx="1" />
          <rect x="10" y="3" width="3.4" height="10" rx="1" opacity=".45" /><rect x="15" y="0" width="3.4" height="13" rx="1" opacity=".45" />
        </svg>
        <span className="sb-net">4G</span>
        <span className="sb-battery"><span>{battery}</span></span>
      </span>
    </div>
  );
}

export function PhoneFrame({ label, children, battery }: { label: string; children: ReactNode; battery: number }) {
  return (
    <div className="phone-slot">
      <div className="phone-label">{label}</div>
      <div className="phone-scale">
        <div className="phone" role="region" aria-label={`${label} phone`}>
          <div className="phone-screen">
            <StatusBar battery={battery} />
            {children}
            <div className="home-indicator" />
          </div>
        </div>
      </div>
    </div>
  );
}
