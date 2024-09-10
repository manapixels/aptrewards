import { create } from 'zustand';
import { getAptosClient } from "@/lib/utils";
import { ProgramDetails } from "@/types/aptrewards";
import { moduleAddress, moduleName } from "@/constants";

type ProgramStore = {
  programs: ProgramDetails[];
  shouldRefetch: boolean;
  fetchPrograms: (address: string) => Promise<void>;
  triggerRefetch: () => void;
};

const getProgramsByAddress = async (address: string): Promise<ProgramDetails[]> => {
  if (!moduleAddress || !moduleName) throw new Error("No module address or name");
  const response = await getAptosClient().view({
    payload: {
      function: `${moduleAddress}::${moduleName}::get_owned_loyalty_programs`,
      functionArguments: [address],
    },
  });

  if (!response || !response[0]) return [];
  const programs = response[0] as ProgramDetails[];
  
  return programs.map((program: ProgramDetails) => ({
    id: program.id as number,
    name: program.name as string,
  }));

};

export const useProgramStore = create<ProgramStore>((set) => ({
  programs: [],
  shouldRefetch: false,
  fetchPrograms: async (address: string) => {
    const fetchedPrograms = await getProgramsByAddress(address);
    set({ programs: fetchedPrograms, shouldRefetch: false });
  },
  triggerRefetch: () => set({ shouldRefetch: true }),
}));