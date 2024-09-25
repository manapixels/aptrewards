export type MyVoucher = {
    id: string;
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

export interface CustomerData {
    name: string;
    address: string;
    points: number;
    lifetimePoints: number;
    lastPointDate: string;
}

export interface LoyaltyProgram {
    id: string;
    name: string;
    owner: string;
    vouchers?: RedeemableVoucher[];
    pointValidityDays?: number;
    tiers?: Tier[];
    totalPointsIssued?: number;
    customerData?: CustomerData[];
};

export interface LoyaltyProgramSummary {
    id: number;
    name: string;
    owner: string;
    customerCount: number;
}

export interface UserProgramDetails {
    programId: string;
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
