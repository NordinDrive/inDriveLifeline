import { Check, FileCheck2, GraduationCap, ScrollText, CarFront, Send } from 'lucide-react';
import { useState } from 'react';
import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { Reasons, ScreenHeader } from '../components/ui';
import { applyForLifeline } from '../domain/workflow';

const MODULES = ['When to refuse an unsafe task', 'Safeguarding & respectful conduct', 'Verifying hand-offs and arrivals'];

export function Enrollment() {
  const setUi = useDemo((s) => s.setUi);
  const perform = useDemo((s) => s.perform);
  const driver = useDemo((s) => s.domain.drivers[PHONE_DRIVER_ID]);
  const [step, setStep] = useState(0);
  const [modules, setModules] = useState<boolean[]>([false, false, false]);
  const [conduct, setConduct] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [seats, setSeats] = useState(driver.seats);
  const [accessible, setAccessible] = useState(driver.accessible);
  const [vehicleOk, setVehicleOk] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const steps = [
    { title: 'Account & documents', icon: FileCheck2 },
    { title: 'Safety training', icon: GraduationCap },
    { title: 'Code of Conduct', icon: ScrollText },
    { title: 'Vehicle & capability', icon: CarFront },
    { title: 'Review & submit', icon: Send },
  ];
  const canNext = [true, modules.every(Boolean), conduct && privacy, vehicleOk, true][step];

  const submit = () => {
    const out = perform((s, now) =>
      applyForLifeline(s, PHONE_DRIVER_ID, { safetyTraining: modules.every(Boolean), conductAccepted: conduct && privacy, vehicleChecked: vehicleOk, seats, accessible }, now),
    );
    if (out.ok) setUi('driver', { screen: 'lifeline' });
    else setErrors(out.reasons);
  };

  return (
    <div className="screen scroll ll form">
      <ScreenHeader title="Volunteer for Lifeline" subtitle={`Step ${step + 1} of ${steps.length}`} onBack={() => (step ? setStep(step - 1) : setUi('driver', { screen: 'lifeline' }))} />
      <ol className="enroll-steps">
        {steps.map((s, i) => (
          <li key={s.title} className={i < step ? 'done' : i === step ? 'current' : ''}>
            <span>{i < step ? <Check size={14} /> : i + 1}</span>
          </li>
        ))}
      </ol>
      <h3 className="enroll-title">{steps[step].title}</h3>

      {step === 0 && (
        <div className="ll-card">
          <p className="muted">Your existing inDrive driver record (demo data). Lifeline adds extra checks on top.</p>
          <div className="kv"><span>Driver</span><strong>{driver.name}</strong></div>
          <div className="kv"><span>inDrive account</span><strong>{driver.accountStatus}</strong></div>
          <div className="kv"><span>Driving licence</span><strong>On file (demo)</strong></div>
          <div className="kv"><span>Vehicle documents</span><strong>On file (demo)</strong></div>
          <div className="kv"><span>Safety record</span><strong>No open incidents (demo)</strong></div>
          <p className="fine">No real identity documents are processed in this prototype.</p>
        </div>
      )}

      {step === 1 && (
        <div className="options">
          {MODULES.map((m, i) => (
            <button key={m} className={`option ${modules[i] ? 'is-on' : ''}`} onClick={() => setModules(modules.map((v, j) => (j === i ? !v : v)))}>
              <span className="check">{modules[i] && <Check size={14} />}</span>
              <span className="option-main">{m}<small>3 min module · mark as completed</small></span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="options">
          <label className="ack"><input type="checkbox" checked={conduct} onChange={(e) => setConduct(e.target.checked)} /><span>I follow the Lifeline Code of Conduct: no entering affected or restricted zones, no rescue attempts, refusing unsafe tasks is always allowed.</span></label>
          <label className="ack"><input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /><span>I protect beneficiaries’ privacy and follow safeguarding rules for vulnerable people.</span></label>
        </div>
      )}

      {step === 3 && (
        <div className="ll-card">
          <div className="kv"><span>Vehicle</span><strong>{driver.vehicle}</strong></div>
          <div className="kv">
            <span>Passenger seats</span>
            <div className="stepper stepper--sm">
              <button onClick={() => setSeats(Math.max(1, seats - 1))} aria-label="Fewer seats">−</button>
              <span>{seats}</span>
              <button onClick={() => setSeats(Math.min(6, seats + 1))} aria-label="More seats">+</button>
            </div>
          </div>
          <label className="ack"><input type="checkbox" checked={accessible} onChange={(e) => setAccessible(e.target.checked)} /><span>Wheelchair accessible vehicle</span></label>
          <label className="ack"><input type="checkbox" checked={vehicleOk} onChange={(e) => setVehicleOk(e.target.checked)} /><span>I confirm the vehicle details are accurate (simulated vehicle check).</span></label>
          <p className="fine">Passenger seats exclude the driver’s seat. Requests needing more seats or accessibility than you declare will not be offered to you.</p>
        </div>
      )}

      {step === 4 && (
        <div className="ll-card">
          <div className="kv"><span>Training</span><strong>{modules.every(Boolean) ? 'Completed' : 'Incomplete'}</strong></div>
          <div className="kv"><span>Code of Conduct</span><strong>{conduct && privacy ? 'Accepted' : 'Pending'}</strong></div>
          <div className="kv"><span>Seats / accessibility</span><strong>{seats} · {accessible ? 'Accessible' : 'Standard'}</strong></div>
          <p className="fine">The Lifeline Admin performs a simulated eligibility review. You’ll be notified when you are a verified volunteer.</p>
          <Reasons reasons={errors} title="Please fix" />
        </div>
      )}

      <div className="form-actions">
        {step < steps.length - 1 ? (
          <button className="btn-lime" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</button>
        ) : (
          <button className="btn-lime" onClick={submit}>Submit for review</button>
        )}
      </div>
    </div>
  );
}
