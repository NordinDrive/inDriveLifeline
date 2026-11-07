import { ChevronRight, HeartHandshake, Info, LayoutGrid, List, Menu, Settings } from 'lucide-react';
import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { FictionalMap } from '../components/FictionalMap';
import { MissionCard } from '../components/MissionCard';
import { AlertStrip } from '../components/PhoneOverlays';
import { bonusTotals } from '../domain/rewards';
import { setDriverOnline } from '../domain/workflow';
import { useDriverMissions } from './useDriverMissions';

export function DriverHome() {
  const setUi = useDemo((s) => s.setUi);
  const perform = useDemo((s) => s.perform);
  const homeTab = useDemo((s) => s.ui.driver.homeTab);
  const { domain, driver, offers, active, accept, decline, details } = useDriverMissions();
  const disasterActive = domain.disaster.status === 'active';
  const totals = bonusTotals(Object.values(domain.bonuses), PHONE_DRIVER_ID);

  return (
    <div className="screen d-home">
      <div className="d-topbar">
        <button className="round-btn round-btn--outline" onClick={() => setUi('driver', { menuOpen: true })} aria-label="Open menu">
          <Menu size={26} strokeWidth={2.2} />
        </button>
        <button
          className={`online-toggle ${driver.online ? 'is-online' : ''}`}
          role="switch"
          aria-checked={driver.online}
          onClick={() => perform((s, now) => setDriverOnline(s, PHONE_DRIVER_ID, !driver.online, now))}
        >
          <span className="online-knob">{driver.online ? 'Online' : 'Offline'}</span>
        </button>
        <button className="round-btn round-btn--outline" aria-label="Settings" onClick={() => setUi('driver', { info: 'Settings' })}>
          <Settings size={24} strokeWidth={2} />
        </button>
      </div>
      <button className="d-banner" onClick={() => setUi('driver', { info: 'Fix these issues' })}>
        <span className="d-banner-i"><Info size={16} strokeWidth={3} /></span>
        <span>Fix these issues to avoid missing best requests</span>
        <ChevronRight size={22} />
      </button>

      <div className="d-body scroll">
        {homeTab === 'requests' ? (
          <>
            {disasterActive && (
              <div className="d-section">
                <AlertStrip onClick={() => setUi('driver', { screen: 'lifeline' })} />
                <div className="d-map"><FictionalMap variant="card" network showLegend /></div>
              </div>
            )}
            {active && (
              <button className="d-active" onClick={() => setUi('driver', { screen: 'active', missionId: active.id })}>
                <HeartHandshake size={22} />
                <span><strong>Lifeline mission in progress</strong><small>{active.id} · tap to continue</small></span>
                <ChevronRight size={20} />
              </button>
            )}
            {driver.online ? (
              offers.length ? (
                <div className="d-section">
                  {offers.map(({ mission, reasons }) => (
                    <MissionCard
                      key={mission.id}
                      state={domain}
                      mission={mission}
                      reasons={reasons}
                      onAccept={() => accept(mission.id)}
                      onDecline={() => decline(mission.id)}
                      onDetails={() => details(mission.id)}
                    />
                  ))}
                </div>
              ) : (
                !active && <p className="d-empty">Looking for ride requests nearby…</p>
              )
            ) : null}
          </>
        ) : (
          <div className="d-section perf">
            <h3>Performance</h3>
            <div className="perf-grid">
              <div><span>Rating</span><strong>{driver.rating.split(' ')[0]}</strong></div>
              <div><span>Lifeline bonus approved</span><strong>{totals.approvedBonus} MAD</strong></div>
              <div><span>Lifeline bonus pending</span><strong>{totals.pendingBonus} MAD</strong></div>
              <div><span>Lifeline trip fares</span><strong>{totals.approvedBase} MAD</strong></div>
            </div>
            <button className="btn-dark" onClick={() => setUi('driver', { screen: 'earnings' })}>Open earnings history</button>
            <p className="d-fine">Demo amounts only. No real payouts.</p>
          </div>
        )}
      </div>

      <nav className="d-tabbar" aria-label="Driver sections">
        <button className={homeTab === 'requests' ? 'is-on' : ''} onClick={() => setUi('driver', { homeTab: 'requests' })}>
          <List size={26} />
          <span>Ride requests</span>
        </button>
        <button className={homeTab === 'performance' ? 'is-on' : ''} onClick={() => setUi('driver', { homeTab: 'performance' })}>
          <LayoutGrid size={26} />
          <span>Performance</span>
        </button>
      </nav>
    </div>
  );
}
