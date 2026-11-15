import { Role } from './types';

// One colour per supply-chain role, used by the charts. Distinct on white and
// drawn from the red velvet / black forest palette.
export const ROLE_COLORS: Record<Role, string> = {
  manufacturer: '#3F2A29', // black forest chocolate
  distributor:  '#B3173A', // red velvet
  wholesaler:   '#2C6B4C', // forest green
  retailer:     '#CC8A16', // caramel gold
};

// Neutral chart furniture (warm mocha instead of cool grey).
export const CHART = {
  grid: '#F0E6E1',
  axis: '#E6DBD7',
  tick: '#8A7771',
  label: '#5F4F4B',
};
