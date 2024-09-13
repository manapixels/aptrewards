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
    owner?: string;
    balance?: number;
    coupons?: Coupon[];
    tiers?: Tier[];
    stampValidityDays?: number;
    numCustomers?: number;
    customersPerTier?: number[];
    totalStampsIssued?: number;
    couponsRedeemed?: number[];
    customers?: string[];
};