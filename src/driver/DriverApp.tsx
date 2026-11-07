import { useDemo } from '../app/store';
import { PHONE_DRIVER_ID } from '../data/mockDrivers';
import { PhoneFrame } from '../components/PhoneFrame';
import { AlertSheet, InfoSheet, PhoneToasts } from '../components/PhoneOverlays';
import { DRIVER_MENU, SideMenu } from '../components/SideMenu';
import { ActiveMission } from './ActiveMission';
import { DriverHome } from './DriverHome';
import { Earnings } from './Earnings';
import { Enrollment } from './Enrollment';
import { LifelineDriver } from './LifelineDriver';
import { MissionDetails } from './MissionDetails';

export function DriverApp() {
  const ui = useDemo((s) => s.ui.driver);
  const setUi = useDemo((s) => s.setUi);
  const toast = useDemo((s) => s.toast);
  const driver = useDemo((s) => s.domain.drivers[PHONE_DRIVER_ID]);
  const revision = useDemo((s) => s.domain.disaster.revision);
  const go = (patch: Partial<typeof ui>) => setUi('driver', { menuOpen: false, ...patch });

  const onSelect = (key: string) => {
    if (key === 'lifeline') go({ screen: 'lifeline' });
    else if (key === 'city') go({ screen: 'home' });
    else go({ info: DRIVER_MENU.find((m) => m.key === key)?.label ?? 'Profile' });
  };

  return (
    <PhoneFrame label="Driver app" battery={51}>
      <div className="app app--driver">
        {ui.screen === 'home' && <DriverHome />}
        {ui.screen === 'lifeline' && <LifelineDriver />}
        {ui.screen === 'enroll' && <Enrollment />}
        {ui.screen === 'mission' && <MissionDetails />}
        {ui.screen === 'active' && <ActiveMission />}
        {ui.screen === 'earnings' && <Earnings />}
      </div>
      <SideMenu
        open={ui.menuOpen}
        items={DRIVER_MENU}
        activeKey={ui.screen === 'home' ? 'city' : 'lifeline'}
        name="Noureddine"
        rating={driver.rating}
        modeLabel="Passenger mode"
        avatarHue={170}
        onSelect={onSelect}
        onClose={() => setUi('driver', { menuOpen: false })}
        onMode={() => toast('driver', 'The Passenger app is on the other phone.', 'info')}
      />
      <AlertSheet
        role="driver"
        seenRevision={ui.alertSeenRevision}
        onDismiss={() => setUi('driver', { alertSeenRevision: revision })}
        primary={{ label: 'View Lifeline missions', onClick: () => go({ alertSeenRevision: revision, screen: 'lifeline' }) }}
      />
      <InfoSheet title={ui.info} onClose={() => setUi('driver', { info: undefined })} />
      <PhoneToasts target="driver" />
    </PhoneFrame>
  );
}
