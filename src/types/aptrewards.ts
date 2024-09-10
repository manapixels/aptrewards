export interface Coupon {
  id: number;
  stampsRequired: number;
  description: string;
  isMonetary: boolean;
  value: number;
  expirationDate: number;
  maxRedemptions: number;
  currentRedemptions: number;
}

export interface Tier {
  id: number;
  name: string;
  description: string;
  stampsRequired: number;
}

export interface LoyaltyProgram {
  id: number;
  name: string;
  balance: number;
  spinProbabilities: number[];
  spinAmounts: number[];
  coupons: Coupon[];
  tiers: Tier[];
  luckySpinEnabled: boolean;
  owner: string;
}

export interface ProgramDetails {
  id: number;
  name: string;
  balance: number;
  spinProbabilities: number[];
  spinAmounts: number[];
  tiers: Tier[];
  luckySpinEnabled: boolean;
  owner: string;
}

export interface ProgramInfo {
  id: number;
  name: string;
}