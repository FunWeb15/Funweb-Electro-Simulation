export const PHYSICS_CONSTANTS = {
  K_COULOMB: 20000, // Visual scaling factor for force
  MAX_TRAIL_LENGTH: 50,
  MIN_DISTANCE: 60, // Minimum separation in px
  MAX_DISTANCE: 500,
  TRAIL_UPDATE_FREQ: 5, // Frames between trail points
};

export const COLORS = {
  POSITIVE: '#3b82f6', // blue-500
  POSITIVE_GLOW: 'rgba(59, 130, 246, 0.5)',
  NEGATIVE: '#ef4444', // red-500
  NEGATIVE_GLOW: 'rgba(239, 68, 68, 0.5)',
  NEUTRAL: '#94a3b8', // slate-400
  NEUTRAL_GLOW: 'rgba(148, 163, 184, 0.1)',
  TEXT: '#f1f5f9',
  ARROW: '#fbbf24', // amber-400
  DISTANCE_LINE: 'rgba(255, 255, 255, 0.2)',
};
