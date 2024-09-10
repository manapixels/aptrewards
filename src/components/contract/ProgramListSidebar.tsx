'use client'

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect } from "react";
import { useProgramStore } from '@/store/programStore';

const ProgramListSidebar = () => {
    const { account } = useWallet();
    const { programs, fetchPrograms, shouldRefetch } = useProgramStore();

    useEffect(() => {
        if (account?.address) {
            fetchPrograms(account.address);
        }
    }, [account?.address, shouldRefetch, fetchPrograms]);

    console.log(programs)

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