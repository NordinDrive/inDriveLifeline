import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { Badge, DemoTag, ScreenHeader } from '../components/ui';
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
      <ScreenHeader title="Mission Earnings" subtitle="Lifeline · simulated amounts" onBack={() => setUi('driver', { screen: 'lifeline' })} />
      <div className="earn-hero">
        <small>Total simulated earned</small>
        <strong>{t.approvedBase + t.approvedBonus} MAD</strong>
        <div className="earn-split">
          <span>Base {t.approvedBase} MAD</span>
          <span className="lime">Bonus {t.approvedBonus} MAD</span>
          <span>Pending {t.pendingBase + t.pendingBonus} MAD</span>
        </div>
      </div>
      <h4 className="list-title">Bonus history</h4>
      {records.length ? (
        records.map((b) => {
          const m = domain.missions.find((x) => x.id === b.missionId)!;
          return (
            <div key={b.missionId} className="hist-row">
              <span>
                <strong>{SERVICE_LABEL[m.service]}</strong>
                <small>{b.missionId} · {b.base} + {b.bonus} MAD · {shortTime(b.updatedAt)}</small>
                {b.heldReason && <small>Held: {b.heldReason}</small>}
              </span>
              <Badge tone={b.status === 'approved' ? 'success' : b.status === 'held' ? 'warn' : b.status === 'not_eligible' ? 'danger' : 'muted'}>{BONUS_LABEL[b.status]}</Badge>
            </div>
          );
        })
      ) : (
        <p className="d-empty">No Lifeline missions yet.</p>
      )}
      <p className="fine pad">Bonuses are approved once per mission after confirmed completion. No real payment, banking data or transfer is involved.</p>
      <div className="ll-foot"><DemoTag>Illustrative / Demo Data</DemoTag></div>
    </div>
  );
}
