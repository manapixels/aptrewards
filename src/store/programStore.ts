import { create } from 'zustand';
import { getAptosClient } from "@/lib/utils";
import { Coupon, ProgramDetails } from "@/types/aptrewards";
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
  
  return response.map((program: any) => ({
    id: program[0] as number,
    name: program[1] as string,
    balance: program[2] as number,
    spinProbabilities: program[3] as number[],
    spinAmounts: program[4] as number[],
    coupons: program[5] as Coupon[],
    tierThresholds: program[6] as number[],
    luckySpinEnabled: program[7] as boolean,
    owner: program[8] as string,
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