import { BadgeCheck, ChevronRight, HeartHandshake, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { MissionCard } from '../components/MissionCard';
import { AlertStrip } from '../components/PhoneOverlays';
import { Badge, DemoTag, ScreenHeader } from '../components/ui';
import { BONUS_LABEL, ELIGIBILITY_LABEL, ELIGIBILITY_TONE, MISSION_LABEL } from '../domain/labels';
import { bonusTotals } from '../domain/rewards';
import { SERVICE_LABEL } from '../domain/workflow';
import { useDriverMissions } from './useDriverMissions';

export function LifelineDriver() {
  const setUi = useDemo((s) => s.setUi);
  const { domain, driver, offers, active, history, accept, decline, details } = useDriverMissions();
  const [tab, setTab] = useState<'available' | 'mine'>('available');
  const totals = bonusTotals(Object.values(domain.bonuses), PHONE_DRIVER_ID);
  const disasterActive = domain.disaster.status === 'active';
  const sorted = [...offers].sort((a, b) => Number(b.mission.service === 'evacuation_transfer') - Number(a.mission.service === 'evacuation_transfer'));

  return (
    <div className="screen scroll ll">
      <ScreenHeader title="Lifeline" subtitle="Make every journey matter" onBack={() => setUi('driver', { screen: 'home' })} right={<HeartHandshake className="ll-heart" size={26} />} />
      {disasterActive && <div className="ll-pad"><AlertStrip /></div>}

      <div className={`elig-card elig--${driver.eligibility}`}>
        <div className="elig-top">
          <BadgeCheck size={22} />
          <div>
            <small>Lifeline Partner Program</small>
            <strong>{ELIGIBILITY_LABEL[driver.eligibility]}</strong>
          </div>
          <Badge tone={ELIGIBILITY_TONE[driver.eligibility]}>{driver.eligibility === 'verified' ? 'Eligible' : 'Not eligible yet'}</Badge>
        </div>
        {driver.eligibility === 'not_enrolled' && (
          <>
            <p>Being an inDrive driver is not enough for Lifeline missions. Complete the extra verification to receive humanitarian missions with a separate Lifeline bonus. Participation is voluntary.</p>
            <button className="btn-lime" onClick={() => setUi('driver', { screen: 'enroll' })}>Join Lifeline</button>
          </>
        )}
        {driver.eligibility === 'pending_review' && <p>Your application is with a Lifeline coordinator for a simulated review. You’ll be notified when approved.</p>}
        {driver.eligibility === 'verified' && <p>{driver.vehicle} · {driver.seats} passenger seats · {driver.accessible ? 'accessible' : 'not wheelchair accessible'}. You can refuse any mission without penalty.</p>}
        {driver.eligibility === 'suspended' && <p>Your Lifeline access is suspended. You can’t accept missions. Contact support to appeal.</p>}
        {driver.eligibility === 'verified' && !driver.online && <p className="elig-warn">You are offline. Go online from the home screen to accept missions.</p>}
      </div>

      {active && (
        <button className="d-active" onClick={() => setUi('driver', { screen: 'active', missionId: active.id })}>
          <HeartHandshake size={22} />
          <span><strong>{SERVICE_LABEL[active.service]}</strong><small>{active.id} · {MISSION_LABEL[active.status]}</small></span>
          <ChevronRight size={20} />
        </button>
      )}

      <button className="earn-link" onClick={() => setUi('driver', { screen: 'earnings' })}>
        <Wallet size={20} />
        <span>Mission Earnings</span>
        <strong>{totals.approvedBase + totals.approvedBonus} MAD</strong>
        <ChevronRight size={18} />
      </button>

      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === 'available'} className={tab === 'available' ? 'is-on' : ''} onClick={() => setTab('available')}>
          Available Missions {offers.length > 0 && <span className="seg-count">{offers.length}</span>}
        </button>
        <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'is-on' : ''} onClick={() => setTab('mine')}>
          My Missions
        </button>
      </div>

      {tab === 'available' ? (
        sorted.length ? (
          sorted.map(({ mission, reasons }) => (
            <MissionCard key={mission.id} state={domain} mission={mission} reasons={reasons} onAccept={() => accept(mission.id)} onDecline={() => decline(mission.id)} onDetails={() => details(mission.id)} />
          ))
        ) : (
          <p className="d-empty">No Lifeline missions offered right now. New missions appear here instantly after coordinator approval.</p>
        )
      ) : history.length ? (
        history.map((m) => (
          <button key={m.id} className="hist-row" onClick={() => setUi('driver', { screen: ['confirmed', 'cancelled'].includes(m.status) ? 'earnings' : 'active', missionId: m.id })}>
            <span><strong>{SERVICE_LABEL[m.service]}</strong><small>{m.id} · {MISSION_LABEL[m.status]}</small></span>
            {domain.bonuses[m.id] && <Badge tone={domain.bonuses[m.id].status === 'approved' ? 'success' : 'muted'}>{BONUS_LABEL[domain.bonuses[m.id].status]}</Badge>}
          </button>
        ))
      ) : (
        <p className="d-empty">No missions yet.</p>
      )}
      <div className="ll-foot"><DemoTag>Fictional missions and amounts</DemoTag></div>
    </div>
  );
}
