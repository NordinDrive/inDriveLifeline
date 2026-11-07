import { ChevronLeft, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { PASSENGER } from '../data/mockNGOs';
import * as wf from '../domain/workflow';

// Presenter script (spec §21). "Do it" runs the step's simulated action; nothing
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
    title: 'Two familiar apps, side by side',
    detail: 'Passenger app on the left, Driver app on the right, operator remote on the side. All share one live state.',
    run: () => {
      S().setUi('passenger', { screen: 'home', menuOpen: false });
      S().setUi('driver', { screen: 'home', menuOpen: false });
    },
  },
  {
    title: 'Lifeline sits under “City to City”',
    detail: 'Open both side menus. Lifeline is a native row, same size and style as its neighbours.',
    run: () => {
      S().setUi('passenger', { menuOpen: true });
      S().setUi('driver', { menuOpen: true });
    },
  },
  {
    title: 'Drivers need extra verification',
    detail: 'The driver opens Lifeline: an inDrive account alone is not enough to accept missions.',
    run: () => {
      S().setUi('passenger', { menuOpen: false });
      S().setUi('driver', { menuOpen: false, screen: 'lifeline' });
    },
  },
  {
    title: 'Driver applies to the Partner Program',
    detail: 'Training, Code of Conduct and vehicle capability are recorded (simulated).',
    run: () => {
      S().perform((s, now) => wf.applyForLifeline(s, PHONE_DRIVER_ID, { safetyTraining: true, conductAccepted: true, vehicleChecked: true, seats: 3, accessible: false }, now));
      S().setUi('driver', { screen: 'lifeline' });
      S().setUi('operator', { tab: 'drivers' });
    },
  },
  {
    title: 'Operator approves: Lifeline Verified',
    detail: 'A simulated eligibility review in the Drivers tab.',
    run: () => {
      S().perform((s, now) => wf.approveDriver(s, PHONE_DRIVER_ID, now));
    },
  },
  {
    title: 'Driver goes online',
    detail: 'Only online, verified drivers with matching capacity can receive missions.',
    run: () => {
      if (!S().domain.drivers[PHONE_DRIVER_ID].online) S().perform((s, now) => wf.setDriverOnline(s, PHONE_DRIVER_ID, true, now));
      S().setUi('driver', { screen: 'home' });
    },
  },
  {
    title: 'Activate: Earthquake · District A · High',
    detail: 'Both phones receive a SIMULATED alert at the same moment.',
    run: () => {
      S().setUi('operator', { tab: 'scenario' });
      S().perform((s, now) => wf.activateScenario(s, { type: 'earthquake', districtId: 'A', severity: 'high', name: '' }, now));
    },
  },
  {
    title: 'Hazard zone, safe points and routes',
    detail: 'ROUTE-A1 (west corridor) is approved; ROUTE-B2 crosses the affected zone and is blocked.',
    run: () => {
      const rev = S().domain.disaster.revision;
      S().setUi('passenger', { alertSeenRevision: rev, screen: 'lifeline' });
      S().setUi('driver', { alertSeenRevision: rev, screen: 'home' });
    },
  },
  {
    title: 'Passenger requests safe transport for 3',
    detail: 'Assembly Point Alpha → Shelter Green. It goes to the operator queue, not straight to drivers.',
    run: () => {
      S().perform((s, now) =>
        wf.submitRequest(s, { source: 'passenger', requesterId: PASSENGER.id, service: 'evacuation_transfer', pickupId: 'P-ALPHA', destinationId: 'S-GREEN', passengers: 3, accessibility: 'none', note: '', acknowledged: true }, now),
      );
      S().setUi('passenger', { screen: 'track' });
      S().setUi('operator', { tab: 'queue', selectedRequestId: myRequest()?.id });
    },
  },
  {
    title: 'Operator verifies the need',
    detail: 'Simulated verification by a coordinator.',
    run: () => {
      const r = myRequest();
      if (r) S().perform((s, now) => wf.verifyNeed(s, r.id, now));
    },
  },
  {
    title: 'Operator approves ROUTE-A1',
    detail: 'Only predefined routes that are approved in the scenario can be approved.',
    run: () => {
      const r = myRequest();
      if (r) S().perform((s, now) => wf.approveRoute(s, r.id, now));
    },
  },
  {
    title: 'Offer to eligible drivers',
    detail: 'All dispatch gates pass, so the mission appears on the Driver phone instantly.',
    run: () => {
      const r = myRequest();
      if (r) S().perform((s, now) => wf.offerMission(s, r.id, now));
      S().setUi('driver', { screen: 'lifeline' });
    },
  },
  {
    title: 'Driver accepts: 25 MAD + 15 MAD bonus',
    detail: 'Passenger sees “Driver assigned” immediately.',
    run: () => {
      const m = myMission();
      if (m) {
        const out = S().perform((s, now) => wf.acceptMission(s, m.id, PHONE_DRIVER_ID, now));
        if (out.ok) S().setUi('driver', { screen: 'active', missionId: m.id });
      }
    },
  },
  {
    title: 'Driver picks up the family',
    detail: 'On my way → Arrived at pickup → Passengers picked up. Each step updates the passenger tracker.',
    run: () => advanceTo('onboard'),
  },
  {
    title: 'Arrive at shelter, submit completion',
    detail: 'The bonus stays pending until the coordinator confirms.',
    run: () => advanceTo('awaiting_confirmation'),
  },
  {
    title: 'Operator confirms safe arrival',
    detail: 'Bonus approved once; impact counters update.',
    run: () => {
      const m = myMission();
      if (m) S().perform((s, now) => wf.confirmCompletion(s, m.id, now));
      S().setUi('operator', { tab: 'impact' });
    },
  },
  {
    title: 'Resolve the scenario',
    detail: 'Alerts clear; completed history stays until reset. Lifeline continues for everyday NGO logistics.',
    run: () => {
      S().perform((s, now) => wf.resolveScenario(s, now));
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
