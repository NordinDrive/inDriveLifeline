import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { Badge, ScreenHeader } from '../components/ui';
import { BONUS_LABEL, shortTime } from '../domain/labels';
import { bonusTotals } from '../domain/rewards';
import { SERVICE_LABEL } from '../domain/workflow';

export function Earnings() {
  const setUi = useDemo((s) => s.setUi);
  const domain = useDemo((s) => s.domain);
  const records = Object.values(domain.bonuses).filter((b) => b.driverId === PHONE_DRIVER_ID);
  const t = bonusTotals(records, PHONE_DRIVER_ID);

  return (
    <div className="screen scroll ll">
      <ScreenHeader title="Earnings history" subtitle="Lifeline bonuses and trip fares" onBack={() => setUi('driver', { screen: 'lifeline' })} />
      <div className="earn-hero">
        <small>Lifeline bonuses approved</small>
        <strong>{t.approvedBonus} MAD</strong>
        <div className="earn-split">
          <span>Bonus pending {t.pendingBonus} MAD</span>
          <span>Trip fares {t.approvedBase} MAD (+{t.pendingBase} pending)</span>
        </div>
      </div>
      <h4 className="list-title">Missions</h4>
      {records.length ? (
        records.map((b) => {
          const m = domain.missions.find((x) => x.id === b.missionId) ?? { id: b.missionId };
          return (
            <div key={b.missionId} className="hist-row">
              <span>
                <strong>{SERVICE_LABEL} · bonus +{b.bonus} MAD</strong>
                <small>{m.id} · trip fare {b.base} MAD (separate) · {shortTime(b.updatedAt)}</small>
                {b.heldReason && <small>Held: {b.heldReason}</small>}
              </span>
              <Badge tone={b.status === 'approved' ? 'success' : b.status === 'held' ? 'warn' : b.status === 'not_eligible' ? 'danger' : 'muted'}>{BONUS_LABEL[b.status]}</Badge>
            </div>
          );
        })
      ) : (
        <p className="d-empty">No Lifeline missions yet.</p>
      )}
      <p className="fine pad">Bonuses stay pending until the Admin confirms completion, are approved once per mission, and are never paid for cancelled missions.</p>
    </div>
  );
}
