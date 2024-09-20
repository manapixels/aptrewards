export type MyVoucher = {
    id: number;
    name: string;
    description: string;
    expirationDate: string;
    termsAndConditions: string;
    imageUrl?: string;
};

export type RedeemableVoucher = MyVoucher & {
    pointsRequired: number;
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
    vouchers?: RedeemableVoucher[];
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
    ownedVouchers: MyVoucher[];
    allVouchers: RedeemableVoucher[];
    tiers: Tier[];
    currentTier: Tier | null;
    nextTier: Tier | null;
    pointsToNextTier: number | null;
}
