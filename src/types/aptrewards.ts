export type Voucher = {
    id: number;
    pointsRequired: number;
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
    pointsRequired: number;
    benefits: string[];
    customerCount?: number;
}

export interface LoyaltyProgram {
    id: string;
    name: string;
    owner: string;
    vouchers?: Voucher[];
    voucherCount?: number;
    pointValidityDays?: number;
    tiers?: Tier[];
    totalPointsIssued?: number;
    customersWithPoints?: CustomerWithPoints[];
};

export interface LoyaltyProgramSummary {
    id: number;
    name: string;
    owner: string;
    customerCount: number;
}

export interface CustomerWithPoints {
    customer: string;
    points: number;
}

export interface UserProgramDetails {
    programId: number;
    programName: string;
    points: number;
    lifetimePoints: number;
    pointValidityDays: number;
    ownedVouchers: Voucher[];
    allVouchers: Voucher[];
    tiers: Tier[];
    currentTier: Tier | null;
    nextTier: Tier | null;
    pointsToNextTier: number | null;
}
