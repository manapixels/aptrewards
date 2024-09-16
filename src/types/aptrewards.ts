export type Coupon = {
    id: number;
    stampsRequired: number;
    description: string;
    isMonetary: boolean;
    value: number;
    expirationDate: number;
    maxRedemptions: number;
    redemptions: number;
};

export interface Tier {
    id: number;
    name: string;
    stampsRequired: number;
    benefits: string[];
    customerCount?: number;
}

export interface LoyaltyProgram {
    id: string;
    name: string;
    owner: string;
    coupons?: Coupon[];
    couponCount?: number;
    stampValidityDays?: number;
    tiers?: Tier[];
    totalStampsIssued?: number;
    customersWithStamps?: CustomerWithStamps[];
};

export interface LoyaltyProgramSummary {
    id: number;
    name: string;
    owner: string;
    customerCount: number;
}

export interface CustomerWithStamps {
    customer: string;
    stamps: number;
}