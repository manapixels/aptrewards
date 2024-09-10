'use client'

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { getAptosClient } from "@/lib/utils";
import { Coupon, ProgramDetails } from "@/types/aptrewards";
import { moduleAddress, moduleName } from "@/constants";

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

const ProgramListSidebar = () => {

    const { account } = useWallet();
    const [programs, setPrograms] = useState<ProgramDetails[]>([]);

    const fetchPrograms = useCallback(async () => {
        if (account?.address) {
            const fetchedPrograms = await getProgramsByAddress(account.address);
            console.log(fetchedPrograms);
            setPrograms(fetchedPrograms);
        }
    }, [account?.address]);

    useEffect(() => {
        fetchPrograms();
    }, [account?.address]);

    return (
        <div>
            {account ? (
                <div className="flex flex-col gap-4">
                    {programs.map((program) => (
                        <a key={program.id} href={`/programs/${program.id}`}>
                            <div className="text-md font-bold">{program.name}</div>
                        </a>
                    ))}
                </div>
            ) : (
                <div>Connect your wallet to view your programs</div>
            )}
        </div>
    )
}

export default ProgramListSidebar;