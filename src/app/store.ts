import { create } from 'zustand';
import { createInitialState } from '../data/initialState';
import type { DomainState, Notice, Outcome, Tone } from '../domain/types';

// One shared store for Passenger, Driver and Admin. Every view reads the same
// object, so updates are immediate. Business rules live in src/domain; the store
// only applies their outcomes and shows notices.

export type PassengerScreen = 'home' | 'lifeline' | 'request' | 'track' | 'how';
export type DriverScreen = 'home' | 'lifeline' | 'enroll' | 'mission' | 'active' | 'earnings';
export type OperatorTab = 'scenario' | 'queue' | 'drivers' | 'impact' | 'log';
export type Theme = 'dark' | 'light';
const OPERATOR_TABS: OperatorTab[] = ['scenario', 'queue', 'drivers', 'impact', 'log'];
export type ToastTarget = Notice['target'] | 'stage';

export interface UiState {
  passenger: {
    screen: PassengerScreen;
    menuOpen: boolean;
    alertSeenRevision: number;
    info?: string;
  };
  driver: {
    screen: DriverScreen;
    menuOpen: boolean;
    alertSeenRevision: number;
    info?: string;
    missionId?: string;
    homeTab: 'requests' | 'performance';
  };
  operator: { tab: OperatorTab; selectedRequestId?: string };
  stage: { presentation: boolean; guideOpen: boolean; guideStep: number; mobileView: 'passenger' | 'driver' | 'operator'; theme: Theme };
}

export interface Toast {
  id: number;
  target: ToastTarget;
  message: string;
  tone: Tone;
}

export function createInitialUi(): UiState {
  return {
    passenger: { screen: 'home', menuOpen: false, alertSeenRevision: 0 },
    driver: { screen: 'home', menuOpen: false, alertSeenRevision: 0, homeTab: 'requests' },
    operator: { tab: 'scenario' },
    stage: { presentation: false, guideOpen: true, guideStep: 0, mobileView: 'passenger', theme: 'dark' },
  };
}

interface Store {
  domain: DomainState;
  ui: UiState;
  toasts: Toast[];
  perform: (fn: (s: DomainState, now: string) => Outcome) => Outcome;
  setUi: <K extends keyof UiState>(key: K, patch: Partial<UiState[K]>) => void;
  toast: (target: ToastTarget, message: string, tone?: Tone) => void;
  dismissToast: (id: number) => void;
  resetDemo: () => void;
}

// v2: disaster-only shelter transport. Older saves (with NGO desk, campaigns and
// everyday missions) are discarded rather than migrated.
const STORAGE_KEY = 'indrive-lifeline-demo-v2';
const LEGACY_KEYS = ['indrive-lifeline-demo-v1'];
const CHANNEL = 'indrive-lifeline-demo';
const tabId = Math.random().toString(36).slice(2);
let toastSeq = 0;
let applyingRemote = false;

/** Accepts only saves in the current shape; anything else falls back to a clean reset. */
function sanitize(parsed: unknown): Pick<Store, 'domain' | 'ui'> | null {
  const p = parsed as { domain?: Partial<DomainState> & Record<string, unknown>; ui?: UiState } | null;
  const d = p?.domain;
  if (!d?.counters || !d.disaster || !Array.isArray(d.requests) || !Array.isArray(d.missions) || !p?.ui?.stage) return null;
  if ('ngos' in d || 'campaigns' in d || d.missions.some((m) => 'service' in m)) return null;
  const fresh = createInitialUi();
  const ui: UiState = {
    passenger: { ...fresh.passenger, ...p.ui.passenger },
    driver: { ...fresh.driver, ...p.ui.driver },
    operator: OPERATOR_TABS.includes(p.ui.operator?.tab) ? p.ui.operator : fresh.operator,
    stage: { ...fresh.stage, ...p.ui.stage, theme: p.ui.stage.theme === 'light' ? 'light' : 'dark' },
  };
  return { domain: d as DomainState, ui };
}

function loadPersisted(): Pick<Store, 'domain' | 'ui'> | null {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

const persisted = typeof window !== 'undefined' ? loadPersisted() : null;

export const useDemo = create<Store>((set, get) => ({
  domain: persisted?.domain ?? createInitialState(),
  ui: persisted?.ui ?? createInitialUi(),
  toasts: [],

  perform: (fn) => {
    const outcome = fn(get().domain, new Date().toISOString());
    if (outcome.ok) set({ domain: outcome.state });
    for (const n of outcome.notices) get().toast(n.target, n.message, n.tone);
    if (!outcome.ok && outcome.reasons.length) get().toast('stage', outcome.reasons[0], 'warn');
    return outcome;
  },

  setUi: (key, patch) => set((s) => ({ ui: { ...s.ui, [key]: { ...s.ui[key], ...patch } } })),

  toast: (target, message, tone = 'info') => {
    const id = ++toastSeq;
    set((s) => {
      const same = s.toasts.filter((t) => t.target === target);
      const drop = same.length >= 2 ? same[0].id : -1;
      return { toasts: [...s.toasts.filter((t) => t.id !== drop), { id, target, message, tone }] };
    });
    window.setTimeout(() => get().dismissToast(id), target === 'stage' ? 3200 : 4200);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  resetDemo: () => {
    const ui = createInitialUi();
    ui.stage = { ...get().ui.stage, guideStep: 0 };
    set({ domain: createInitialState(), ui, toasts: [] });
    get().toast('stage', 'Reset: Lifeline inactive, no requests or missions', 'success');
  },
}));

// Persistence + same-origin tab sync (optional extras; the single page needs neither).
if (typeof window !== 'undefined') {
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;

  useDemo.subscribe((s, prev) => {
    if (s.domain === prev.domain && s.ui === prev.ui) return;
    const payload = JSON.stringify({ domain: s.domain, ui: s.ui });
    try {
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      /* storage unavailable: in-memory state still works */
    }
    if (!applyingRemote) channel?.postMessage({ from: tabId, payload });
  });

  const applyRemote = (payload: string) => {
    try {
      const clean = sanitize(JSON.parse(payload));
      if (!clean) return;
      applyingRemote = true;
      useDemo.setState(clean);
    } catch {
      /* ignore malformed messages */
    } finally {
      applyingRemote = false;
    }
  };

  if (channel) {
    channel.onmessage = (e) => {
      if (e.data?.from !== tabId && typeof e.data?.payload === 'string') applyRemote(e.data.payload);
    };
  } else {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) applyRemote(e.newValue);
    });
  }
}
