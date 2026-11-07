import { BadgeCheck, ChevronRight, HeartHandshake, MapPin, MoonStar, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { PICKUP_POINTS } from '../data/mockLocations';
import { MissionCard } from '../components/MissionCard';
import { AlertStrip } from '../components/PhoneOverlays';
import { Badge, ScreenHeader } from '../components/ui';
import { BONUS_LABEL, ELIGIBILITY_LABEL, ELIGIBILITY_TONE, MISSION_LABEL } from '../domain/labels';
import { bonusTotals } from '../domain/rewards';
import { SERVICE_LABEL, setLifelineAvailability } from '../domain/workflow';
import { useDriverMissions } from './useDriverMissions';

export function LifelineDriver() {
  const setUi = useDemo((s) => s.setUi);
  const perform = useDemo((s) => s.perform);
  const { domain, driver, offers, active, history, accept, decline, details } = useDriverMissions();
  const [tab, setTab] = useState<'available' | 'mine'>('available');
  const totals = bonusTotals(Object.values(domain.bonuses), PHONE_DRIVER_ID);
  const disasterActive = domain.disaster.status === 'active';
  const verified = driver.eligibility === 'verified';
  const byPickup = PICKUP_POINTS.map((p) => ({ point: p, items: offers.filter((o) => o.mission.pickupId === p.id) })).filter((g) => g.items.length);

  return (
    <div className="screen scroll ll">
      <ScreenHeader title="Lifeline" subtitle="Volunteer shelter transport" onBack={() => setUi('driver', { screen: 'home' })} right={<HeartHandshake className="ll-heart" size={26} />} />
      {disasterActive && <div className="ll-pad"><AlertStrip /></div>}

      <div className={`elig-card elig--${driver.eligibility}`}>
        <div className="elig-top">
          <BadgeCheck size={22} />
          <div>
            <small>Lifeline volunteer status</small>
            <strong>{ELIGIBILITY_LABEL[driver.eligibility]}</strong>
          </div>
          <Badge tone={ELIGIBILITY_TONE[driver.eligibility]}>{verified ? 'Eligible' : 'Not eligible yet'}</Badge>
        </div>
        {driver.eligibility === 'not_enrolled' && (
          <>
            <p>Volunteer to drive people from designated pickup points to approved shelters during a disaster. An inDrive account alone is not enough: complete the extra Lifeline checks first. Joining is voluntary.</p>
            <button className="btn-lime" onClick={() => setUi('driver', { screen: 'enroll' })}>Join Lifeline as a volunteer</button>
          </>
        )}
        {driver.eligibility === 'pending_review' && <p>Your application is with the Lifeline Admin for review. You’ll be notified when you are verified.</p>}
        {verified && <p>{driver.vehicle} · {driver.seats} passenger seats · {driver.accessible ? 'wheelchair accessible' : 'not wheelchair accessible'}. You can decline any mission without penalty.</p>}
        {driver.eligibility === 'suspended' && <p>Your Lifeline access is suspended. You can’t accept missions. Contact support to appeal.</p>}
        {verified && (
          <button
            className={`avail-switch ${driver.available ? 'is-on' : ''}`}
            role="switch"
            aria-checked={driver.available}
            onClick={() => perform((s, now) => setLifelineAvailability(s, PHONE_DRIVER_ID, !driver.available, now))}
          >
            <span>
              <strong>Available for Lifeline missions</strong>
              <small>{driver.available ? 'You can receive and accept approved missions' : 'Turn on when you can help (also puts you online)'}</small>
            </span>
            <i aria-hidden />
          </button>
        )}
      </div>

      {active && (
        <button className="d-active" onClick={() => setUi('driver', { screen: 'active', missionId: active.id })}>
          <HeartHandshake size={22} />
          <span><strong>{SERVICE_LABEL} in progress</strong><small>{active.id} · {MISSION_LABEL[active.status]}</small></span>
          <ChevronRight size={20} />
        </button>
      )}

      <button className="earn-link" onClick={() => setUi('driver', { screen: 'earnings' })}>
        <Wallet size={20} />
        <span>Earnings history</span>
        <small>{totals.pendingBonus ? `${totals.pendingBonus} MAD bonus pending` : `${totals.approvedBonus} MAD bonus approved`}</small>
        <ChevronRight size={18} />
      </button>

      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === 'available'} className={tab === 'available' ? 'is-on' : ''} onClick={() => setTab('available')}>
          Waiting at pickups {offers.length > 0 && <span className="seg-count">{offers.length}</span>}
        </button>
        <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'is-on' : ''} onClick={() => setTab('mine')}>
          My missions
        </button>
      </div>

      {tab === 'available' ? (
        !disasterActive && !offers.length ? (
          <div className="ll-inactive">
            <span className="ll-inactive-icon"><MoonStar size={22} /></span>
            <strong>Lifeline is on standby</strong>
            <p>Missions appear only while the Lifeline Admin has a disaster scenario active.</p>
          </div>
        ) : byPickup.length ? (
          byPickup.map(({ point, items }) => (
            <section key={point.id} className="pickup-group">
              <h4><MapPin size={16} />{point.label}<span>{items.length} waiting</span></h4>
              {items.map(({ mission, reasons }) => (
                <MissionCard key={mission.id} state={domain} mission={mission} reasons={reasons} onAccept={() => accept(mission.id)} onDecline={() => decline(mission.id)} onDetails={() => details(mission.id)} />
              ))}
            </section>
          ))
        ) : (
          <p className="d-empty">No approved requests waiting. New missions appear here as soon as the Admin approves a route.</p>
        )
      ) : history.length ? (
        history.map((m) => (
          <button key={m.id} className="hist-row" onClick={() => setUi('driver', { screen: ['confirmed', 'cancelled'].includes(m.status) ? 'earnings' : 'active', missionId: m.id })}>
            <span><strong>{SERVICE_LABEL}</strong><small>{m.id} · {MISSION_LABEL[m.status]}</small></span>
            {domain.bonuses[m.id] && <Badge tone={domain.bonuses[m.id].status === 'approved' ? 'success' : 'muted'}>{BONUS_LABEL[domain.bonuses[m.id].status]}</Badge>}
          </button>
        ))
      ) : (
        <p className="d-empty">No missions yet.</p>
      )}
    </div>
  );
}
