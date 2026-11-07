import { create } from 'zustand';
import { createInitialState } from '../data/initialState';
import type { DomainState, Notice, Outcome, Tone } from '../domain/types';

// One shared store for Passenger, Driver and Operator. Every view reads the same
// object, so updates are immediate. Business rules live in src/domain; the store
// only applies their outcomes and shows notices.

export type PassengerScreen = 'home' | 'lifeline' | 'request' | 'track' | 'how';
export type DriverScreen = 'home' | 'lifeline' | 'enroll' | 'mission' | 'active' | 'earnings';
export type OperatorTab = 'scenario' | 'queue' | 'drivers' | 'ngo' | 'impact' | 'log';
export type ToastTarget = Notice['target'] | 'stage';

export interface UiState {
  passenger: {
    screen: PassengerScreen;
    menuOpen: boolean;
    alertSeenRevision: number;
    info?: string;
    requestPreset?: 'evacuation_transfer' | 'transport_assistance' | 'essential_delivery';
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
  stage: { presentation: boolean; guideOpen: boolean; guideStep: number; mobileView: 'passenger' | 'driver' | 'operator' };
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
    stage: { presentation: false, guideOpen: true, guideStep: 0, mobileView: 'passenger' },
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

const STORAGE_KEY = 'indrive-lifeline-demo-v1';
const CHANNEL = 'indrive-lifeline-demo';
const tabId = Math.random().toString(36).slice(2);
let toastSeq = 0;
let applyingRemote = false;

function loadPersisted(): Pick<Store, 'domain' | 'ui'> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.domain?.counters || !parsed?.ui?.stage) return null;
    return { domain: parsed.domain, ui: parsed.ui };
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
    get().toast('stage', 'Demo reset to its initial state', 'success');
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
      const parsed = JSON.parse(payload);
      applyingRemote = true;
      useDemo.setState({ domain: parsed.domain, ui: parsed.ui });
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
