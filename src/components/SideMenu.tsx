import {
  Bell, Bookmark, CarFront, ChevronRight, Clock3, Gift, Globe, HeartHandshake, Info, MessageSquareMore,
  Package, Settings, ShieldCheck, SquarePen, Star, Truck, type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon } from './BrandIcons';

export interface MenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  isNew?: boolean;
}

// Item order copied from the reference screenshots, with Lifeline inserted
// directly beneath "City to City".
export const DRIVER_MENU: MenuItem[] = [
  { key: 'city', label: 'City', icon: CarFront },
  { key: 'c2c', label: 'City to City', icon: Globe },
  { key: 'lifeline', label: 'Lifeline', icon: HeartHandshake, isNew: true },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'safety', label: 'Safety', icon: ShieldCheck },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'help', label: 'Help', icon: Info },
  { key: 'support', label: 'Support', icon: MessageSquareMore },
  { key: 'registration', label: 'Online registration', icon: SquarePen },
  { key: 'invite', label: 'Invite a friend', icon: Gift },
];

export const PASSENGER_MENU: MenuItem[] = [
  { key: 'city', label: 'City', icon: CarFront },
  { key: 'history', label: 'Request history', icon: Clock3 },
  { key: 'couriers', label: 'Couriers', icon: Package },
  { key: 'c2c', label: 'City to City', icon: Globe },
  { key: 'lifeline', label: 'Lifeline', icon: HeartHandshake, isNew: true },
  { key: 'freight', label: 'Freight', icon: Truck },
  { key: 'saved', label: 'Saved places', icon: Bookmark },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'safety', label: 'Safety', icon: ShieldCheck },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'help', label: 'Help', icon: Info },
  { key: 'support', label: 'Support', icon: MessageSquareMore },
];

interface Props {
  open: boolean;
  items: MenuItem[];
  activeKey: string;
  name: string;
  rating: string;
  modeLabel: string;
  avatarHue: number;
  onSelect: (key: string) => void;
  onClose: () => void;
  onMode: () => void;
}

export function SideMenu({ open, items, activeKey, name, rating, modeLabel, avatarHue, onSelect, onClose, onMode }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [open]);

  return (
    <div className={`sidemenu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="sidemenu-scrim" onClick={onClose} />
      <nav
        className="sidemenu-panel"
        ref={panelRef}
        aria-label="Main menu"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <button className="sm-profile" tabIndex={open ? 0 : -1} onClick={() => onSelect('profile')}>
          <span className="sm-avatar" style={{ background: `linear-gradient(160deg, hsl(${avatarHue} 45% 55%), hsl(${avatarHue + 40} 40% 30%))` }}>
            {name.charAt(0)}
          </span>
          <span className="sm-profile-text">
            <span className="sm-name">{name}</span>
            <span className="sm-rating">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={16} fill="#ff9f0a" stroke="none" />
              ))}
              <span>{rating}</span>
            </span>
          </span>
          <ChevronRight size={26} className="sm-chevron" />
        </button>
        <ul className="sm-list">
          {items.map((it) => (
            <li key={it.key}>
              <button
                tabIndex={open ? 0 : -1}
                className={`sm-item ${activeKey === it.key ? 'is-active' : ''} ${it.key === 'lifeline' ? 'sm-item--lifeline' : ''}`}
                onClick={() => onSelect(it.key)}
              >
                <it.icon size={24} strokeWidth={1.6} className="sm-icon" />
                <span>{it.label}</span>
                {it.isNew && <span className="sm-new">NEW</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="sm-footer">
          <button className="sm-mode" tabIndex={open ? 0 : -1} onClick={onMode}>
            {modeLabel}
          </button>
          <div className="sm-social">
            <TikTokIcon /><WhatsAppIcon /><FacebookIcon /><InstagramIcon />
          </div>
        </div>
      </nav>
    </div>
  );
}
