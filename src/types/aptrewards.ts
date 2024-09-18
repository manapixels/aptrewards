export type Voucher = {
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
    vouchers?: Voucher[];
    voucherCount?: number;
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

export interface UserProgramDetails {
    program_id: number;
    program_name: string;
    stamps: number;
    lifetime_stamps: number;
    owned_vouchers: Voucher[];
    current_tier: {
      id: number;
      name: string;
      stamps_required: number;
      benefits: string[];
    } | null;
    next_tier: {
      id: number;
      name: string;
      stamps_required: number;
      benefits: string[];
    } | null;
    stamps_to_next_tier: number;
}