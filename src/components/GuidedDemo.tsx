import { ChevronLeft, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { PASSENGER } from '../data/mockPassenger';
import * as wf from '../domain/workflow';

// Presenter script. "Do it" runs the step's simulated action; nothing
// auto-plays. Every action goes through the same guarded workflow as manual clicks.

const S = () => useDemo.getState();
const myRequest = () => S().domain.requests.find((r) => r.requesterId === PASSENGER.id && !['cancelled', 'rejected'].includes(r.status));
const myMission = () => S().domain.missions.find((m) => m.id === myRequest()?.missionId);
const advanceTo = (status: string) => {
  for (let i = 0; i < 6; i++) {
    const m = myMission();
    if (!m || m.status === status || !wf.nextMissionStatus(m.status)) break;
    const out = S().perform((s, now) => wf.advanceMission(s, m.id, PHONE_DRIVER_ID, now));
    if (!out.ok) break;
  }
};

interface Step {
  title: string;
  detail: string;
  run: () => void;
}

export const GUIDE_STEPS: Step[] = [
  {
    title: 'Lifeline starts inactive',
    detail: 'Familiar inDrive apps. Lifeline sits under “City to City”; until the Admin activates it, passengers only see an inactive message.',
    run: () => {
      S().setUi('passenger', { screen: 'lifeline', menuOpen: false });
      S().setUi('driver', { screen: 'home', menuOpen: false });
      S().setUi('operator', { tab: 'scenario' });
    },
  },
  {
    title: 'A driver volunteers for Lifeline',
    detail: 'Extra checks (training, conduct, vehicle), Admin verification, then the volunteer switches on “Available for Lifeline missions”.',
    run: () => {
      const d = S().domain.drivers[PHONE_DRIVER_ID];
      if (['not_enrolled', 'expired'].includes(d.eligibility))
        S().perform((s, now) => wf.applyForLifeline(s, PHONE_DRIVER_ID, { safetyTraining: true, conductAccepted: true, vehicleChecked: true, seats: 3, accessible: false }, now));
      if (S().domain.drivers[PHONE_DRIVER_ID].eligibility === 'pending_review') S().perform((s, now) => wf.approveDriver(s, PHONE_DRIVER_ID, now));
      if (!S().domain.drivers[PHONE_DRIVER_ID].available) S().perform((s, now) => wf.setLifelineAvailability(s, PHONE_DRIVER_ID, true, now));
      S().setUi('driver', { screen: 'lifeline' });
      S().setUi('operator', { tab: 'drivers' });
    },
  },
  {
    title: 'Admin activates a disaster',
    detail: 'Earthquake · Demo District A · High. Both phones get a SIMULATED alert; ROUTE-A1 is approved, ROUTE-B2 is blocked.',
    run: () => {
      S().setUi('operator', { tab: 'scenario' });
      if (S().domain.disaster.status !== 'active')
        S().perform((s, now) => wf.activateScenario(s, { type: 'earthquake', districtId: 'A', severity: 'high', name: '' }, now));
    },
  },
  {
    title: 'Passenger requests shelter transport',
    detail: 'Assembly Point Alpha → Shelter Green, 3 people. It goes to the Admin for review, not straight to drivers.',
    run: () => {
      const rev = S().domain.disaster.revision;
      S().setUi('driver', { alertSeenRevision: rev });
      if (!myRequest())
        S().perform((s, now) =>
          wf.submitRequest(s, { source: 'passenger', requesterId: PASSENGER.id, pickupId: 'P-ALPHA', destinationId: 'S-GREEN', passengers: 3, accessibility: 'none' }, now),
        );
      S().setUi('passenger', { alertSeenRevision: rev, screen: 'track' });
      S().setUi('operator', { tab: 'queue', selectedRequestId: myRequest()?.id });
    },
  },
  {
    title: 'Admin approves the route',
    detail: 'All safety checks pass, so the mission is published to available volunteers at Assembly Point Alpha.',
    run: () => {
      const r = myRequest();
      if (r && r.status !== 'approved') S().perform((s, now) => wf.approveRequest(s, r.id, now));
      S().setUi('driver', { screen: 'lifeline' });
    },
  },
  {
    title: 'Volunteer driver accepts',
    detail: 'The card showed pickup, shelter, 3 passengers, accessibility, the approved route and the +15 MAD bonus before accepting.',
    run: () => {
      const m = myMission();
      if (m?.status === 'offered') {
        const out = S().perform((s, now) => wf.acceptMission(s, m.id, PHONE_DRIVER_ID, now));
        if (out.ok) S().setUi('driver', { screen: 'active', missionId: m.id });
      }
    },
  },
  {
    title: 'Pickup',
    detail: 'On my way → Arrived at pickup → Passengers picked up. The passenger tracker updates at each step.',
    run: () => advanceTo('onboard'),
  },
  {
    title: 'Shelter arrival',
    detail: 'Arrived at shelter → Submit completion. The passenger confirms safe arrival; the bonus is still pending.',
    run: () => {
      advanceTo('awaiting_confirmation');
      const m = myMission();
      if (m && !m.passengerConfirmed) S().perform((s, now) => wf.passengerConfirmArrival(s, m.id, now));
    },
  },
  {
    title: 'Admin confirms → bonus approved',
    detail: 'Confirmation approves the 15 MAD bonus exactly once. It now shows as approved in the driver’s earnings history.',
    run: () => {
      const m = myMission();
      if (m?.status === 'awaiting_confirmation') S().perform((s, now) => wf.confirmCompletion(s, m.id, now));
      S().setUi('driver', { screen: 'earnings' });
      S().setUi('operator', { tab: 'impact' });
    },
  },
  {
    title: 'Admin resolves the scenario',
    detail: 'New requests and offers stop; completed trips and earnings stay until Reset.',
    run: () => {
      if (S().domain.disaster.status === 'active') S().perform((s, now) => wf.resolveScenario(s, now));
      S().setUi('passenger', { screen: 'lifeline' });
    },
  },
];

export function GuidedDemo() {
  const step = useDemo((s) => s.ui.stage.guideStep);
  const setUi = useDemo((s) => s.setUi);
  const reset = useDemo((s) => s.resetDemo);
  const current = GUIDE_STEPS[step];
  const go = (n: number) => setUi('stage', { guideStep: Math.max(0, Math.min(GUIDE_STEPS.length - 1, n)) });

  return (
    <div className="guide" aria-label="Guided demo">
      <span className="guide-count">Step {step + 1}/{GUIDE_STEPS.length}</span>
      <div className="guide-text">
        <strong>{current.title}</strong>
        <span>{current.detail}</span>
      </div>
      <div className="guide-dots" aria-hidden>
        {GUIDE_STEPS.map((_, i) => <i key={i} className={i < step ? 'done' : i === step ? 'on' : ''} />)}
      </div>
      <div className="guide-actions">
        <button onClick={() => go(step - 1)} disabled={step === 0} aria-label="Previous step"><ChevronLeft size={18} /></button>
        <button className="guide-do" onClick={() => { current.run(); }}><Play size={14} /> Do it</button>
        <button onClick={() => go(step + 1)} disabled={step === GUIDE_STEPS.length - 1} aria-label="Next step"><ChevronRight size={18} /></button>
        <button onClick={() => reset()} title="Reset demo and restart the guide"><RotateCcw size={16} /> Restart</button>
      </div>
    </div>
  );
}
