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
    const rawPrograms = response[0] as any[];
    return rawPrograms.map(rawProgram => ({
        id: rawProgram.id.toString(),
        name: rawProgram.name,
        stampValidityDays: Number(rawProgram.stamp_validity_days),
    }));
};

const getProgramDetails = async (programId: string): Promise<LoyaltyProgram> => {
    if (!moduleAddress || !moduleName) throw new Error("No module address or name");
    const response = await getAptosClient().view({
        payload: {
            function: `${moduleAddress}::${moduleName}::get_loyalty_program_details`,
            functionArguments: [programId],
        },
    });

    if (!response || !response[0]) throw new Error("Failed to fetch program details");
    
    const rawProgramDetails = response[0] as any;
    
    // Transform the raw data to match the LoyaltyProgram type
    const transformedProgramDetails: LoyaltyProgram = {
        id: rawProgramDetails.id.toString(),
        name: rawProgramDetails.name,
        owner: rawProgramDetails.owner,
        stampValidityDays: Number(rawProgramDetails.stamp_validity_days),
        coupons: rawProgramDetails.coupons?.map((coupon: any) => ({
            id: Number(coupon.id),
            stampsRequired: Number(coupon.stamps_required),
            description: coupon.description,
            isMonetary: Boolean(coupon.is_monetary),
            value: Number(coupon.value),
            expirationDate: Number(coupon.expiration_date),
            maxRedemptions: Number(coupon.max_redemptions),
            currentRedemptions: Number(coupon.current_redemptions),
        })),
        tiers: rawProgramDetails.tiers?.map((tier: any) => ({
            id: Number(tier.id),
            name: tier.name,
            description: tier.description,
            stampsRequired: Number(tier.stamps_required),
        })),
    };

    return transformedProgramDetails;
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
                console.log(fetchedPrograms, state.programs)
                const mergedPrograms = fetchedPrograms.map(fetchedProgram => {
                    const existingProgram = state.programs.find(p => p.id.toString() === fetchedProgram.id.toString());
                    console.log('existingProgram', existingProgram, { ...existingProgram, ...fetchedProgram })
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
                    return { programs: [...state.programs.slice(0, index), programDetails, ...state.programs.slice(index + 1)], isFetchingOneProgram: false };
                }
            });
        } catch (error) {
            console.error("Error fetching program details:", error);
            set({ isFetchingOneProgram: false });
        }
    },
    triggerRefetch: () => set({ shouldRefetch: true }),
}));