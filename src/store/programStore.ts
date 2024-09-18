import { create } from 'zustand';
import { getAptosClient } from "@/utils/aptos";
import { LoyaltyProgram, Tier, LoyaltyProgramSummary, CustomerWithPoints } from "@/types/aptrewards";
import { moduleAddress, moduleName } from "@/constants";

type ProgramStore = {
    programs: LoyaltyProgram[];
    shouldRefetch: boolean;
    isFetchingAllPrograms: boolean;
    isFetchingOneProgram: boolean;
    fetchPrograms: (address: string) => Promise<void>;
    fetchProgramDetails: (programId: string) => Promise<void>;
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
    
    // Transform the raw data to match the LoyaltyProgram type
    const transformedProgramDetails: LoyaltyProgram = {
        id: response[0]?.toString() || '',
        name: response[1]?.toString() || '',
        owner: response[2]?.toString() || '',
        pointValidityDays: Number(response[3]),
        vouchers: (response[4] as any[])?.map((voucher: any) => ({
            id: Number(voucher.id),
            pointsRequired: Number(voucher.points_required),
            description: voucher.description,
            isMonetary: voucher.is_monetary,
            value: Number(voucher.value),
            expirationDate: Number(voucher.expiration_date),
            maxRedemptions: Number(voucher.max_redemptions),
            redemptions: Number(voucher.redemptions),
        })) || [],
        tiers: (response[5] as any[])?.map((tier: any) => ({
            id: Number(tier.id),
            name: tier.name,
            pointsRequired: Number(tier.points_required),
            benefits: tier.benefits,
            customerCount: Number(tier.customer_count),
        })).sort((a, b) => a.pointsRequired - b.pointsRequired) as Tier[] || [],
        totalPointsIssued: Number(response[6]),
        customersWithPoints: response[7] as CustomerWithPoints[],
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

export const useProgramStore = create<ProgramStore>((set, get) => ({
    programs: [],
    shouldRefetch: false,
    isFetchingAllPrograms: false,
    isFetchingOneProgram: false,
    fetchPrograms: async (address: string) => {
        set({ isFetchingAllPrograms: true });
        try {
            const fetchedPrograms = await getProgramsByAddress(address);
            
            set((state) => {
                const mergedPrograms = fetchedPrograms.map(fetchedProgram => {
                    const existingProgram = state.programs.find(p => p.id === fetchedProgram.id.toString());
                    return existingProgram ? { ...existingProgram, ...fetchedProgram, id: fetchedProgram.id.toString() } : { ...fetchedProgram, id: fetchedProgram.id.toString() };
                });

                return { programs: mergedPrograms, shouldRefetch: false, isFetchingAllPrograms: false };
            });
        } catch (error) {
            console.error("Error fetching programs:", error);
            set({ isFetchingAllPrograms: false });
        }
    },
    fetchProgramDetails: async (programId: string) => {
        set({ isFetchingOneProgram: true });
        try {
            const programDetails = await getProgramDetails(programId);
            set((state) => {
                const index = state.programs.findIndex((program) => program.id === programId);
                if (index === -1) {
                    return { programs: [...state.programs, programDetails], isFetchingOneProgram: false };
                } else {
                    const updatedPrograms = [...state.programs];
                    updatedPrograms[index] = programDetails;
                    return { programs: updatedPrograms, isFetchingOneProgram: false };
                }
            });
        } catch (error) {
            console.error("Error fetching program details:", error);
            set({ isFetchingOneProgram: false });
        }
    },
    triggerRefetch: () => set({ shouldRefetch: true }),
    getTierForCustomer: (program: LoyaltyProgram, points: number) => {
        return getTierForCustomer(program, points);
    },
}));