import type { DisasterType, ScenarioTemplate, Severity } from '../domain/types';

// Hazard outlines are fictional shapes, scaled by severity and placed on the
// selected demo district. They do not model any real hazard.
export const SCENARIO_TEMPLATES: Record<DisasterType, ScenarioTemplate> = {
  earthquake: {
    type: 'earthquake',
    label: 'Earthquake',
    unknownBuffer: 14,
    shape: [
      { x: -52, y: -40 }, { x: -12, y: -62 }, { x: 34, y: -50 }, { x: 60, y: -14 },
      { x: 52, y: 30 }, { x: 18, y: 58 }, { x: -30, y: 52 }, { x: -60, y: 14 },
    ],
  },
  flood: {
    type: 'flood',
    label: 'Flood',
    unknownBuffer: 18,
    shape: [
      { x: -96, y: -12 }, { x: -50, y: -34 }, { x: 0, y: -26 }, { x: 52, y: -40 }, { x: 104, y: -22 },
      { x: 104, y: 20 }, { x: 52, y: 6 }, { x: 0, y: 24 }, { x: -50, y: 18 }, { x: -96, y: 30 },
    ],
  },
  wildfire: {
    type: 'wildfire',
    label: 'Wildfire',
    unknownBuffer: 22,
    shape: [
      { x: -20, y: -70 }, { x: 30, y: -56 }, { x: 46, y: -12 }, { x: 30, y: 30 },
      { x: -6, y: 40 }, { x: -44, y: 18 }, { x: -50, y: -30 },
    ],
  },
  storm: {
    type: 'storm',
    label: 'Severe Storm',
    unknownBuffer: 34,
    shape: [
      { x: -70, y: 0 }, { x: -50, y: -50 }, { x: 0, y: -70 }, { x: 50, y: -50 },
      { x: 70, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 70 }, { x: -50, y: 50 },
    ],
  },
};

export const SEVERITY_SCALE: Record<Severity, number> = {
  advisory: 0.75,
  high: 1,
  critical: 1.3,
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  advisory: 'Advisory',
  high: 'High',
  critical: 'Critical',
};

export const SCENARIO_CODE: Record<DisasterType, string> = {
  earthquake: 'QUAKE',
  flood: 'FLOOD',
  wildfire: 'FIRE',
  storm: 'STORM',
};
