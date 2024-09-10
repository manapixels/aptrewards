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

export interface LoyaltyProgram {
  id: number;
  name: string;
  balance: number;
  spinProbabilities: number[];
  spinAmounts: number[];
  coupons: Coupon[];
  tierThresholds: number[];
  luckySpinEnabled: boolean;
  owner: string;
}

export interface ProgramDetails {
  id: number;
  name: string;
  balance: number;
  spinProbabilities: number[];
  spinAmounts: number[];
  tierThresholds: number[];
  luckySpinEnabled: boolean;
  owner: string;
}