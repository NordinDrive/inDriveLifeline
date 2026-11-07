import { ChevronRight, ClipboardList, HeartHandshake, HelpCircle, MoonStar, ShieldAlert, UsersRound } from 'lucide-react';
import { useDemo } from '../app/store';
import { DISTRICTS } from '../data/mockLocations';
import { PASSENGER } from '../data/mockPassenger';
import { FictionalMap } from '../components/FictionalMap';
import { AlertStrip } from '../components/PhoneOverlays';
import { Badge, ScreenHeader } from '../components/ui';
import { lifelineOpenIn } from '../domain/dispatch';

export function LifelineHome() {
  const setUi = useDemo((s) => s.setUi);
  const domain = useDemo((s) => s.domain);
  const disaster = domain.disaster;
  const open = lifelineOpenIn(domain, PASSENGER.districtId);
  const mine = domain.requests.filter((r) => r.requesterId === PASSENGER.id);
  const activeRequests = mine.filter((r) => {
    const m = domain.missions.find((x) => x.id === r.missionId);
    return !['rejected', 'cancelled'].includes(r.status) && m?.status !== 'confirmed';
  });

  const inactiveText =
    disaster.status === 'resolved'
      ? 'The disaster scenario has been resolved, so new transport requests are closed. Your earlier requests stay below.'
      : disaster.status === 'active'
        ? `Lifeline is currently active in ${DISTRICTS[disaster.districtId].label} only. Your area is ${DISTRICTS[PASSENGER.districtId].label}.`
        : 'Lifeline opens only when the Lifeline Admin activates a disaster scenario for your area. You will get an alert here when it does.';

  return (
    <div className="screen scroll ll">
      <ScreenHeader
        title="Lifeline"
        subtitle="Voluntary transport to approved shelters"
        onBack={() => setUi('passenger', { screen: 'home' })}
        right={<HeartHandshake className="ll-heart" size={26} />}
      />

      {open ? (
        <>
          <div className="ll-pad"><AlertStrip /></div>
          <button className="ll-hero" onClick={() => setUi('passenger', { screen: 'request' })}>
            <span className="ll-hero-icon"><UsersRound size={26} /></span>
            <span>
              <strong>Request transport to a shelter</strong>
              <small>From a designated pickup point to an approved shelter, with a volunteer driver.</small>
            </span>
            <ChevronRight size={22} />
          </button>
          <div className="ll-map-card">
            <FictionalMap variant="card" network showLegend />
            <p className="ll-hint">Tap a pickup point or route for details.</p>
          </div>
        </>
      ) : (
        <div className="ll-inactive" role="status">
          <span className="ll-inactive-icon"><MoonStar size={24} /></span>
          <strong>{disaster.status === 'resolved' ? 'Lifeline requests are closed' : 'Lifeline is not active in your area'}</strong>
          <p>{inactiveText}</p>
        </div>
      )}

      <div className="ll-grid">
        <button className="ll-tile" onClick={() => setUi('passenger', { screen: 'track' })}>
          <ClipboardList size={24} />
          <strong>Track my request</strong>
          <small>{activeRequests.length ? <Badge tone="lime">{activeRequests.length} active</Badge> : mine.length ? 'See earlier requests' : 'No requests yet'}</small>
        </button>
        <button className="ll-tile" onClick={() => setUi('passenger', { screen: 'how' })}>
          <HelpCircle size={24} />
          <strong>How Lifeline works</strong>
          <small>Safety, volunteers and limits</small>
        </button>
      </div>

      <div className="ll-disclaimer">
        <ShieldAlert size={20} />
        <p>
          <strong>Lifeline is not a rescue or ambulance service.</strong> If you are in immediate danger, contact your local emergency services. Drivers never
          enter hazardous areas; they only travel between designated pickup points and approved shelters.
        </p>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const setUi = useDemo((s) => s.setUi);
  const steps = [
    ['Admin activates', 'The Lifeline Admin switches Lifeline on for a disaster-affected area.'],
    ['You request', 'Choose a designated pickup point, an approved shelter, how many people and any accessibility needs.'],
    ['Admin approves the route', 'Only predefined routes that avoid the affected zone can be approved.'],
    ['A volunteer accepts', 'Verified volunteer drivers with enough seats and the right vehicle can accept.'],
    ['Track and confirm', 'Follow the trip to the shelter and confirm you arrived safely.'],
  ];
  return (
    <div className="screen scroll ll">
      <ScreenHeader title="How Lifeline works" onBack={() => setUi('passenger', { screen: 'lifeline' })} />
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
          <li>Pick up from home addresses: designated pickup points only</li>
          <li>Run outside an Admin-activated disaster scenario</li>
        </ul>
      </div>
    </div>
  );
}
