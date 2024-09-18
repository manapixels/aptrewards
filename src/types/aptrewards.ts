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
    program_id: number;
    program_name: string;
    points: number;
    lifetime_points: number;
    owned_vouchers: Voucher[];
    current_tier: {
      id: number;
      name: string;
      points_required: number;
      benefits: string[];
    } | null;
    next_tier: {
      id: number;
      name: string;
      points_required: number;
      benefits: string[];
    } | null;
    points_to_next_tier: number;
}