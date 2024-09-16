import { create } from 'zustand';
import { getAptosClient } from "@/lib/utils";
import { LoyaltyProgram } from "@/types/aptrewards";
import { moduleAddress, moduleName } from "@/constants";

type ProgramStore = {
    programs: LoyaltyProgram[];
    shouldRefetch: boolean;
    isFetchingAllPrograms: boolean;
    isFetchingOneProgram: boolean;
    fetchPrograms: (address: string) => Promise<void>;
    fetchProgramDetails: (programId: string) => Promise<void>;
    triggerRefetch: () => void;
    getTierForCustomer: (program: LoyaltyProgram, stamps: number) => string;
};

const getProgramsByAddress = async (address: string): Promise<LoyaltyProgram[]> => {
    if (!moduleAddress || !moduleName) throw new Error("No module address or name");
    const response = await getAptosClient().view({
        payload: {
            function: `${moduleAddress}::${moduleName}::get_owned_loyalty_programs`,
            functionArguments: [address],
        },
    });

    if (!response || !response[0]) return [];
    const transformedPrograms: LoyaltyProgram[] = response.map((rawProgram: any) => ({
        id: rawProgram[0].toString(),
        name: rawProgram[1].toString(),
        owner: rawProgram[2].toString(),
        numCustomers: Number(rawProgram[3]?.toString() || "0"),
    }));

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
        id: response[0]?.toString() || "",
        name: response[1]?.toString() || "",
        owner: response[2]?.toString() || "",
        couponCount: Number(response[3]?.toString() || "0"),
        stampValidityDays: Number(response[4]?.toString() || "0"),
        coupons: (response[5] as any[])?.map((coupon: any) => ({
            id: Number(coupon.id),
            stampsRequired: Number(coupon.stamps_required),
            description: coupon.description,
            isMonetary: coupon.is_monetary,
            value: Number(coupon.value),
            expirationDate: Number(coupon.expiration_date),
            maxRedemptions: Number(coupon.max_redemptions),
            currentRedemptions: Number(coupon.current_redemptions),
        })) || [],
        tiers: (response[6] as any[])?.map((tier: any) => ({
            id: Number(tier.id),
            name: tier.name,
            stampsRequired: Number(tier.stamps_required),
            benefits: tier.benefits,
        })) || [],
        numCustomers: Number(response[7]?.toString() || "0"),
        customersPerTier: response[8] as number[] || [],
        totalStampsIssued: Number(response[9]?.toString() || "0"),
        couponsRedeemed: response[10] as number[] || [],
        customers: response[11] as string[] || [],
        customerStamps: response[12] as number[] || [],
    };

    return transformedProgramDetails;
};

// Add this helper function to determine the customer's tier
const getTierForCustomer = (program: LoyaltyProgram, stamps: number): string => {
    if (!program.tiers || program.tiers.length === 0) return 'No Tier';
    
    for (let i = program.tiers.length - 1; i >= 0; i--) {
        if (stamps >= program.tiers[i].stampsRequired) {
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
                    const existingProgram = state.programs.find(p => p.id.toString() === fetchedProgram.id.toString());
                    return existingProgram ? { ...existingProgram, ...fetchedProgram } : fetchedProgram;
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
                const index = state.programs.findIndex((program) => program.id.toString() === programId.toString());
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
    getTierForCustomer: (program: LoyaltyProgram, stamps: number) => {
        return getTierForCustomer(program, stamps);
    },
}));