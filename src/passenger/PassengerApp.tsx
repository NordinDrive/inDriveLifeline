import { useDemo } from '../app/store';
import { PASSENGER } from '../data/mockPassenger';
import { lifelineOpenIn } from '../domain/dispatch';
import { PhoneFrame } from '../components/PhoneFrame';
import { AlertSheet, InfoSheet, PhoneToasts } from '../components/PhoneOverlays';
import { PASSENGER_MENU, SideMenu } from '../components/SideMenu';
import { HowItWorks, LifelineHome } from './LifelineHome';
import { PassengerHome } from './PassengerHome';
import { RequestForm } from './RequestForm';
import { RequestTracker } from './RequestTracker';

export function PassengerApp() {
  const ui = useDemo((s) => s.ui.passenger);
  const setUi = useDemo((s) => s.setUi);
  const toast = useDemo((s) => s.toast);
  const revision = useDemo((s) => s.domain.disaster.revision);
  const inArea = useDemo((s) => lifelineOpenIn(s.domain, PASSENGER.districtId));
  const go = (patch: Partial<typeof ui>) => setUi('passenger', { menuOpen: false, ...patch });

  const onSelect = (key: string) => {
    if (key === 'lifeline') go({ screen: 'lifeline' });
    else if (key === 'city') go({ screen: 'home' });
    else go({ info: PASSENGER_MENU.find((m) => m.key === key)?.label ?? 'Profile' });
  };

  return (
    <PhoneFrame label="Passenger app" battery={50}>
      <div className="app app--passenger">
        {ui.screen === 'home' && <PassengerHome />}
        {ui.screen === 'lifeline' && <LifelineHome />}
        {ui.screen === 'request' && <RequestForm />}
        {ui.screen === 'track' && <RequestTracker />}
        {ui.screen === 'how' && <HowItWorks />}
      </div>
      <SideMenu
        open={ui.menuOpen}
        items={PASSENGER_MENU}
        activeKey={ui.screen === 'home' ? 'city' : 'lifeline'}
        name="Noureddine"
        rating={PASSENGER.rating}
        modeLabel="Driver mode"
        avatarHue={190}
        onSelect={onSelect}
        onClose={() => setUi('passenger', { menuOpen: false })}
        onMode={() => toast('passenger', 'Mode switching is off in this demo: the Driver app is on the other phone.', 'info')}
      />
      <AlertSheet
        role="passenger"
        hidden={!inArea}
        seenRevision={ui.alertSeenRevision}
        onDismiss={() => setUi('passenger', { alertSeenRevision: revision })}
        primary={{
          label: 'Open Lifeline',
          onClick: () => go({ alertSeenRevision: revision, screen: 'lifeline' }),
        }}
      />
      <InfoSheet title={ui.info} onClose={() => setUi('passenger', { info: undefined })} />
      <PhoneToasts target="passenger" />
    </PhoneFrame>
  );
}
