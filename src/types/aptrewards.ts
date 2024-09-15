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

export type Tier = {
    id: number;
    name: string;
    stampsRequired: number;
    benefits: string[];
};

export type LoyaltyProgram = {
    id: string;
    name: string;
    owner: string;
    coupons: Coupon[];
    couponCount: number;
    stampValidityDays: number;
    tiers: Tier[];
    numCustomers: number;
    customersPerTier: number[];
    totalStampsIssued: number;
    couponsRedeemed: number[];
    customers: string[];
    customerStamps: number[];
};