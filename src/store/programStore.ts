import { create } from 'zustand';
import { getAptosClient } from "@/lib/utils";
import { Coupon, LoyaltyProgram, Tier } from "@/types/aptrewards";
import { moduleAddress, moduleName } from "@/constants";

type ProgramStore = {
    programs: LoyaltyProgram[];
    shouldRefetch: boolean;
    isFetchingAllPrograms: boolean;
    isFetchingOneProgram: boolean;
    fetchPrograms: (address: string) => Promise<void>;
    fetchProgramDetails: (programId: string) => Promise<void>;
    triggerRefetch: () => void;
    fetchProgramCustomers: (programId: string) => Promise<void>;
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
        stampValidityDays: Number(rawProgram[4].toString()),
        owner: rawProgram[2].toString(),
        coupons: (rawProgram[5] as any[])?.map((coupon: any) => ({
            id: Number(coupon.id),
            stampsRequired: Number(coupon.stamps_required),
            description: coupon.description,
            isMonetary: coupon.is_monetary,
            value: Number(coupon.value),
            expirationDate: Number(coupon.expiration_date),
            maxRedemptions: Number(coupon.max_redemptions),
            currentRedemptions: Number(coupon.current_redemptions),
        })) || [],
        tiers: (rawProgram[6] as any[])?.map((tier: any) => ({
            id: Number(tier.id),
            name: tier.name,
            stampsRequired: Number(tier.stamps_required),
            benefits: tier.benefits,
        })) || [],
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
    };

    return transformedProgramDetails;
};

const getProgramCustomers = async (programId: string): Promise<string[]> => {
    if (!moduleAddress || !moduleName) throw new Error("No module address or name");
    const response = await getAptosClient().view({
        payload: {
            function: `${moduleAddress}::${moduleName}::get_program_customers`,
            functionArguments: [programId],
        },
    });

    if (!response) throw new Error("Failed to fetch program customers");
    
    return response as string[];
};

export const useProgramStore = create<ProgramStore>((set) => ({
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
    fetchProgramCustomers: async (programId: string) => {
        try {
            const customers = await getProgramCustomers(programId);
            set((state) => {
                const updatedPrograms = state.programs.map(program => 
                    program.id.toString() === programId.toString() 
                        ? { ...program, customers } 
                        : program
                );
                return { programs: updatedPrograms };
            });
        } catch (error) {
            console.error("Error fetching program customers:", error);
        }
    },
    triggerRefetch: () => set({ shouldRefetch: true }),
}));