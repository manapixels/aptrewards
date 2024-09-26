import { create } from 'zustand';
import { getAptosClient } from "@/utils/aptos";
import { LoyaltyProgram, Tier, LoyaltyProgramSummary, CustomerData, UserProgramDetails } from "@/types/aptrewards";
import { moduleAddress, moduleName } from "@/constants";
import { AccountAddress } from '@aptos-labs/ts-sdk';

type ProgramStore = {
    programs: LoyaltyProgram[];
    userJoinedPrograms: UserProgramDetails[];
    shouldRefetch: boolean;
    fetchPrograms: (address: string) => Promise<void>;
    fetchProgramDetails: (programId: string) => Promise<void>;
    fetchUserJoinedPrograms: (address: string) => Promise<void>;
    triggerRefetch: () => void;
    getTierForCustomer: (program: LoyaltyProgram, points: number) => string;
};

const getProgramsByAddress = async (address: string): Promise<LoyaltyProgramSummary[]> => {
    if (!moduleAddress || !moduleName) throw new Error("No module address or name");
    const response = await getAptosClient().view({
        payload: {
            function: `${moduleAddress}::${moduleName}::get_owned_loyalty_programs`,
            functionArguments: [address],
        },
    });

    if (!response || !response[0]) return [];
    const transformedPrograms: LoyaltyProgramSummary[] = Array.isArray(response?.[0]) ? response[0].map((rawProgram: any) => ({
        id: Number(rawProgram.id),
        name: rawProgram.name,
        owner: rawProgram.owner,
        customerCount: Number(rawProgram.customer_count),
    })) : [];

    return transformedPrograms;
};

const getProgramDetails = async (programId: string): Promise<LoyaltyProgram> => {
    if (!moduleAddress || !moduleName) throw new Error("No module address or name");
    const response = await getAptosClient().view({
        payload: {
            function: `${moduleAddress}::${moduleName}::get_loyalty_program_details`,
            functionArguments: [programId],
        },
    });

    if (!response) throw new Error("Failed to fetch program details");

    console.log(response)

    // Transform the raw data to match the LoyaltyProgram type
    const transformedProgramDetails: LoyaltyProgram = {
        id: response[0]?.toString() || '',
        name: response[1]?.toString() || '',
        owner: response[2]?.toString() || '',
        pointValidityDays: Number(response[3]),
        vouchers: (response[4] as any[])?.map((voucher: any) => ({
            id: voucher.id,
            name: voucher.name,
            pointsRequired: Number(voucher.points_required),
            description: voucher.description,
            termsAndConditions: voucher.terms_and_conditions,
            validityDays: Number(voucher.validity_days),
            maxRedemptions: Number(voucher.max_redemptions),
            redemptions: calculateTotalRedemptions(voucher.user_voucher_counts?.data),
        })) || [],
        tiers: (response[5] as any[])?.map((tier: any) => ({
            id: Number(tier.id),
            name: tier.name,
            pointsRequired: Number(tier.points_required),
            benefits: tier.benefits,
            customerCount: Number(tier.customer_count),
        })).sort((a, b) => a.pointsRequired - b.pointsRequired) as Tier[] || [],
        totalPointsIssued: Number(response[6]),
        customerData: response[7] as CustomerData[],
    };

    return transformedProgramDetails;
};

// Add this helper function to determine the customer's tier
const getTierForCustomer = (program: LoyaltyProgram, points: number): string => {
    if (!program.tiers || program.tiers.length === 0) return 'No Tier';
    
    for (let i = program.tiers.length - 1; i >= 0; i--) {
        if (points >= program.tiers[i].pointsRequired) {
            return program.tiers[i].name;
        }
    }
    
    return 'No Tier';
};

const fetchUserJoinedPrograms = async (address: string): Promise<UserProgramDetails[]> => {
    if (!moduleAddress || !moduleName) throw new Error("No module address or name");
    try {
        const resource = await getAptosClient().view({
            payload: {
                function: `${moduleAddress}::${moduleName}::get_all_user_program_details`,
                functionArguments: [AccountAddress.fromString(address)],
            }
        });

        const rawDataArray = resource[0] as any[];

        return rawDataArray.map((program: any) => {
            const currentTier = program.tiers.reduce((prev: any, current: any) =>
                program.points >= current.pointsRequired ? current : prev
            );

            const nextTier = program.tiers.find((tier: any) => tier.pointsRequired > program.points);

            // Transform ownedVouchers
            const transformedOwnedVouchers = program.owned_vouchers?.data.map((voucher: any) => ({
                id: voucher.id,
                name: voucher.name,
                pointsRequired: Number(voucher.points_required),
                description: voucher.description,
                termsAndConditions: voucher.terms_and_conditions,
                validityDays: Number(voucher.validity_days),
                maxRedemptions: Number(voucher.max_redemptions),
                redemptions: calculateTotalRedemptions(voucher.user_voucher_counts),
                expirationDate: calculateExpirationDate(
                    voucher.redemption_expiration_timestamps[address],
                    Number(voucher.validity_days)
                ),
            }));

            // Transform allVouchers
            const transformedAllVouchers = program.all_vouchers?.data.map((voucher: any) => ({
                id: voucher.id,
                name: voucher.name,
                pointsRequired: Number(voucher.points_required),
                description: voucher.description,
                termsAndConditions: voucher.terms_and_conditions,
                validityDays: Number(voucher.validity_days),
                maxRedemptions: Number(voucher.max_redemptions),
                redemptions: calculateTotalRedemptions(voucher.user_voucher_counts),
            }));

            return {
                programId: program.program_id,
                programName: program.program_name,
                points: program.points,
                lifetimePoints: program.lifetime_points,
                pointValidityDays: program.point_validity_days,
                ownedVouchers: transformedOwnedVouchers,
                allVouchers: transformedAllVouchers,
                tiers: program.tiers,
                currentTier,
                nextTier,
                pointsToNextTier: nextTier ? nextTier.pointsRequired - program.points : null,
            }
        });
    } catch (error) {
        console.error("Error fetching user program details:", error);
        return [];
    }
};

// Helper function to calculate expiration date
const calculateExpirationDate = (redemptionTimestamp: number, validityDays: number): Date | null => {
    if (!redemptionTimestamp) return null;
    const expirationTimestamp = redemptionTimestamp + (validityDays * 24 * 60 * 60 * 1000); // Convert days to milliseconds
    return new Date(expirationTimestamp);
};

// Helper function to calculate total redemptions
const calculateTotalRedemptions = (userVoucherCounts: Record<string, string>): number => {
    if (!userVoucherCounts) return 0;
    return Object.values(userVoucherCounts).reduce((sum, count) => sum + Number(count), 0);
};

export const useProgramStore = create<ProgramStore>((set, get) => ({
    programs: [],
    userJoinedPrograms: [],
    shouldRefetch: false,
    fetchPrograms: async (address: string) => {
        try {
            const fetchedPrograms = await getProgramsByAddress(address);
            
            set((state) => {
                const mergedPrograms = fetchedPrograms.map(fetchedProgram => {
                    const existingProgram = state.programs.find(p => p.id === fetchedProgram.id.toString());
                    return existingProgram ? { ...existingProgram, ...fetchedProgram, id: fetchedProgram.id.toString() } : { ...fetchedProgram, id: fetchedProgram.id.toString() };
                });

                return { programs: mergedPrograms, shouldRefetch: false };
            });
        } catch (error) {
            console.error("Error fetching programs:", error);
        }
    },
    fetchProgramDetails: async (programId: string) => {
        try {
            const programDetails = await getProgramDetails(programId);
            set((state) => {
                const index = state.programs.findIndex((program) => program.id === programId);
                if (index === -1) {
                    return { programs: [...state.programs, programDetails] };
                } else {
                    const updatedPrograms = [...state.programs];
                    updatedPrograms[index] = programDetails;
                    return { programs: updatedPrograms };
                }
            });
        } catch (error) {
            console.error("Error fetching program details:", error);
        }
    },
    fetchUserJoinedPrograms: async (address: string) => {
        try {
            const userPrograms = await fetchUserJoinedPrograms(address);
            set({ userJoinedPrograms: userPrograms });
        } catch (error) {
            console.error("Error fetching user joined programs:", error);
        }
    },
    triggerRefetch: () => set({ shouldRefetch: true }),
    getTierForCustomer: (program: LoyaltyProgram, points: number) => {
        return getTierForCustomer(program, points);
    },
}));