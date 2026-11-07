import { ChevronRight, HeartHandshake, Menu, Navigation, Search } from 'lucide-react';
import { useDemo } from '../app/store';
import { CityRidesArt, CityToCityArt, CourierArt, FreightArt, RouteCardArt } from '../components/BrandIcons';
import { FictionalMap } from '../components/FictionalMap';
import { AlertStrip } from '../components/PhoneOverlays';
import { PASSENGER } from '../data/mockPassenger';
import { lifelineOpenIn } from '../domain/dispatch';

export function PassengerHome() {
  const setUi = useDemo((s) => s.setUi);
  const toast = useDemo((s) => s.toast);
  // Lifeline only surfaces on the home screen while it is active in this passenger's area.
  const active = useDemo((s) => lifelineOpenIn(s.domain, PASSENGER.districtId));
  const info = (title: string) => setUi('passenger', { info: title });

  return (
    <div className="screen scroll p-home">
      <div className="p-map">
        <FictionalMap variant="home" ambientCars showLegend={active} />
        <button className="round-btn round-btn--map hamburger" onClick={() => setUi('passenger', { menuOpen: true })} aria-label="Open menu">
          <Menu size={26} strokeWidth={2.2} />
        </button>
        {active ? (
          <div className="p-map-alert"><AlertStrip onClick={() => setUi('passenger', { screen: 'lifeline' })} /></div>
        ) : (
          <button className="pickup-pill" onClick={() => info('Pickup point')}>
            <span>
              <small>Pickup point</small>
              <strong>Boulevard Anfa 113</strong>
            </span>
            <ChevronRight size={20} />
          </button>
        )}
        {!active && (
          <div className="pickup-pin" aria-hidden>
            <span><svg width="22" height="22" viewBox="0 0 24 24" fill="#111"><circle cx="12" cy="5" r="3" /><path d="M7 21l2-8-3-3 4-2h4l3 4 3 1-1 2-4-1-1 2 2 5h-2l-2-4-2 4z" /></svg></span>
          </div>
        )}
        <button className="round-btn round-btn--map locate" aria-label="My location" onClick={() => toast('passenger', 'Location updated')}>
          <Navigation size={24} strokeWidth={2} style={{ transform: 'rotate(-45deg)' }} />
        </button>
      </div>

      <div className="sheet">
        <div className="sheet-grabber" />
        {active && (
          <button className="evac-cta" onClick={() => setUi('passenger', { screen: 'request' })}>
            <HeartHandshake size={26} />
            <span>
              <strong>Request transport to a shelter</strong>
              <small>Lifeline · designated pickup points to approved shelters</small>
            </span>
            <ChevronRight size={20} />
          </button>
        )}
        <div className="tiles">
          <button className="tile tile--big" onClick={() => info('City Rides')}>
            <span className="tile-title tile-title--big">City Rides</span>
            <span className="tile-sub">Set your fair price</span>
            <CityRidesArt />
          </button>
          <button className="tile tile--wide" onClick={() => info('City to City')}>
            <span className="tile-title">City to City</span>
            <CityToCityArt />
          </button>
          <button className="tile tile--small" onClick={() => info('Couriers')}>
            <span className="tile-title">Couriers</span>
            <CourierArt />
          </button>
          <button className="tile tile--small" onClick={() => info('Freight')}>
            <span className="tile-title">Freight</span>
            <FreightArt />
          </button>
        </div>
      </div>

      <div className="sheet sheet--search">
        <button className="search-field" onClick={() => info('Where to & for how much?')}>
          <Search size={26} strokeWidth={2.2} />
          <span>Where to &amp; for how much?</span>
        </button>
      </div>

      <div className="sheet sheet--c2c">
        <button className="c2c-head" onClick={() => info('City to City')}>
          <span className="c2c-avatar"><CityToCityArt /></span>
          <span>City to City</span>
          <span className="c2c-chev"><ChevronRight size={16} /></span>
        </button>
        <div className="c2c-cards">
          <button className="c2c-card" onClick={() => info('Casablanca — Rabat')}>
            <RouteCardArt variant="rabat" />
            <strong>Casablanca — Rabat</strong>
            <span>From 200 MAD</span>
          </button>
          <button className="c2c-card" onClick={() => info('Casablanca — Marrakesh')}>
            <RouteCardArt variant="marrakesh" />
            <strong>Casablanca — Marrakesh</strong>
            <span>From 500 MAD</span>
          </button>
        </div>
      </div>
    </div>
  );
}
