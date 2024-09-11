import { create } from 'zustand';
import { getAptosClient } from "@/lib/utils";
import { LoyaltyProgram } from "@/types/aptrewards";
import { moduleAddress, moduleName } from "@/constants";

type ProgramStore = {
    programs: LoyaltyProgram[];
    shouldRefetch: boolean;
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
    return response[0] as LoyaltyProgram[];
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
    return response[0] as LoyaltyProgram;
};

export const useProgramStore = create<ProgramStore>((set) => ({
    programs: [],
    shouldRefetch: false,
    fetchPrograms: async (address: string) => {
        const fetchedPrograms = await getProgramsByAddress(address);
        set((state) => {
            const mergedPrograms = fetchedPrograms.map(fetchedProgram => {
                const existingProgram = state.programs.find(p => p.id === fetchedProgram.id);
                return existingProgram ? { ...existingProgram, ...fetchedProgram } : fetchedProgram;
            });

            return { programs: mergedPrograms, shouldRefetch: false };
        });
    },
    fetchProgramDetails: async (programId: string) => {
        const programDetails = await getProgramDetails(programId);
        set((state) => {
            const index = state.programs.findIndex((program) => program.id === programId);
            if (index === -1) {
                return { programs: [...state.programs, programDetails] };
            } else {
                return { programs: [...state.programs.slice(0, index), programDetails, ...state.programs.slice(index + 1)] };
            }
        });
    },
    triggerRefetch: () => set({ shouldRefetch: true }),
}));