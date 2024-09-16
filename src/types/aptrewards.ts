export type Coupon = {
    id: number;
    stampsRequired: number;
    description: string;
    isMonetary: boolean;
    value: number;
    expirationDate: number;
    maxRedemptions: number;
    currentRedemptions: number;
};

export interface Tier {
    name: string; // Ensure the tier has a name property that is a string
    stampsRequired: number;
}

export interface LoyaltyProgram {
    id: string;
    name: string;
    owner: string;
    coupons?: Coupon[];
    couponCount?: number;
    stampValidityDays?: number;
    tiers?: Tier[]; // Ensure tiers are of type Tier
    numCustomers?: number;
    customersPerTier?: number[];
    totalStampsIssued?: number;
    couponsRedeemed?: number[];
    customers?: string[];
    customerStamps?: number[];
};