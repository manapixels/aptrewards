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
  stampsRequired: number;
  benefits: string[];
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  owner?: string;
  balance?: number;
  coupons?: Coupon[];
  tiers?: Tier[];
  stampValidityDays?: number;
}