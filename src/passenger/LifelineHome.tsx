import { ChevronRight, ClipboardList, HelpCircle, PackageOpen, ShieldAlert, UsersRound, HeartHandshake } from 'lucide-react';
import { useDemo } from '../app/store';
import { PASSENGER } from '../data/mockNGOs';
import { FictionalMap } from '../components/FictionalMap';
import { AlertStrip } from '../components/PhoneOverlays';
import { Badge, DemoTag, ScreenHeader } from '../components/ui';

export function LifelineHome() {
  const setUi = useDemo((s) => s.setUi);
  const disaster = useDemo((s) => s.domain.disaster);
  const requests = useDemo((s) => s.domain.requests);
  const missions = useDemo((s) => s.domain.missions);
  const active = disaster.status === 'active';
  const mine = requests.filter((r) => r.requesterId === PASSENGER.id);
  const open = mine.filter((r) => {
    const m = missions.find((x) => x.id === r.missionId);
    return !['rejected', 'cancelled'].includes(r.status) && m?.status !== 'confirmed';
  });

  return (
    <div className="screen scroll ll">
      <ScreenHeader
        title="Lifeline"
        subtitle="Community transport & essential deliveries"
        onBack={() => setUi('passenger', { screen: 'home' })}
        right={<HeartHandshake className="ll-heart" size={26} />}
      />
      {active && <div className="ll-pad"><AlertStrip /></div>}

      {active && (
        <button className="ll-hero" onClick={() => setUi('passenger', { screen: 'request', requestPreset: 'evacuation_transfer' })}>
          <span className="ll-hero-icon"><UsersRound size={26} /></span>
          <span>
            <strong>Evacuation Transportation Assistance</strong>
            <small>From a designated pickup point to an approved shelter. Simulated scenario only.</small>
          </span>
          <ChevronRight size={22} />
        </button>
      )}

      {active && (
        <div className="ll-map-card">
          <FictionalMap variant="card" network showLegend />
          <p className="ll-hint">Tap a pickup point or route for details.</p>
        </div>
      )}

      <div className="ll-grid">
        {!active && (
          <button className="ll-tile" onClick={() => setUi('passenger', { screen: 'request', requestPreset: 'transport_assistance' })}>
            <UsersRound size={24} />
            <strong>Transportation Assistance</strong>
            <small>Non-emergency trips to an approved service point</small>
          </button>
        )}
        <button className="ll-tile" onClick={() => setUi('passenger', { screen: 'request', requestPreset: 'essential_delivery' })}>
          <PackageOpen size={24} />
          <strong>Essential Delivery</strong>
          <small>Food, water and supplies where permitted</small>
        </button>
        <button className="ll-tile" onClick={() => setUi('passenger', { screen: 'track' })}>
          <ClipboardList size={24} />
          <strong>Track My Request</strong>
          <small>{open.length ? <Badge tone="lime">{open.length} active</Badge> : 'No active requests'}</small>
        </button>
        <button className="ll-tile" onClick={() => setUi('passenger', { screen: 'how' })}>
          <HelpCircle size={24} />
          <strong>How Lifeline Works</strong>
          <small>Eligibility, safety and partners</small>
        </button>
      </div>

      <div className="ll-disclaimer">
        <ShieldAlert size={20} />
        <p>
          <strong>Lifeline is not an emergency rescue or ambulance service.</strong> If you are in immediate danger, contact your local emergency
          services. Lifeline only connects approved, non-emergency transport between designated points.
        </p>
      </div>
      <div className="ll-foot"><DemoTag>Prototype · all locations and partners are fictional</DemoTag></div>
    </div>
  );
}

export function HowItWorks() {
  const setUi = useDemo((s) => s.setUi);
  const steps = [
    ['Request', 'You, an NGO partner, a shelter or a hotline submits a request between designated points.'],
    ['Review', 'A Lifeline coordinator verifies the need and approves a predefined route.'],
    ['Verified driver', 'Only drivers with extra Lifeline verification and a suitable vehicle receive the mission.'],
    ['Track', 'Follow your request live, from approval to safe arrival.'],
    ['Confirm', 'Arrival is confirmed by you and the coordinator; impact is recorded.'],
  ];
  return (
    <div className="screen scroll ll">
      <ScreenHeader title="How Lifeline Works" onBack={() => setUi('passenger', { screen: 'lifeline' })} />
      <ol className="how-list">
        {steps.map(([t, d], i) => (
          <li key={t}>
            <span className="how-num">{i + 1}</span>
            <div><strong>{t}</strong><p>{d}</p></div>
          </li>
        ))}
      </ol>
      <div className="ll-card">
        <h4>What Lifeline does not do</h4>
        <ul className="plain-list">
          <li>Rescue from danger, search-and-rescue or ambulance transport</li>
          <li>Send drivers into affected or restricted zones</li>
          <li>Decide on its own that a road is safe</li>
        </ul>
      </div>
      <div className="ll-foot"><DemoTag>Concept prototype · not an official inDrive service</DemoTag></div>
    </div>
  );
}
