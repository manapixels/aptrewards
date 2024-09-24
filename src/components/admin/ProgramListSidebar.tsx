'use client'

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useState } from "react";
import { useProgramStore } from '@/store/programStore';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const ProgramListSidebar = () => {
    const { account } = useWallet();
    const { programs, fetchPrograms, shouldRefetch } = useProgramStore();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (account?.address) {
            setIsLoading(true);
            fetchPrograms(account.address).then(() => setIsLoading(false));
        }
    }, [account?.address, shouldRefetch, fetchPrograms]);

    const renderSkeletons = () => (
        <>
            <div className="flex flex-col gap-2">
                {[...Array(3)].map((_, index) => (
                    <Skeleton key={index} className="h-9 w-full" />
                ))}
            </div>
        </>
    );

    const renderProgramList = () => (
        <div className="hidden md:block">
            <div className="flex justify-between items-center md:mb-4">
                <div className="text-sm font-semibold">Your Programs</div>
                {programs.length > 0 && (
                    <Link href="/admin/new">
                        <button className="w-full border border-gray-500 text-sm font-semibold px-2 py-1 rounded-md hover:bg-gray-100">+ New</button>
                    </Link>
                )}
            </div>
            <div className="flex flex-col gap-2 text-sm">
                {isLoading && programs.length === 0 ? (
                    renderSkeletons()
                ) : (
                    programs.map((program) => (
                        <Link
                            key={`program-${program.id}`}
                            href={`/admin/edit/${program.id}`}
                            className={`px-4 py-2 rounded-md ${pathname === `/admin/edit/${program.id}` ? 'bg-gray-100 font-semibold text-black' : 'text-gray-600'}`}
                        >
                            <div>{program.name}</div>
                        </Link>
                    ))
                )}
            </div>
            {programs.length === 0 && (
                <Link href="/admin/new">
                    <Button variant="outline" className="w-full" size="sm">+ New</Button>
                </Link>
            )}
        </div>
    );

    return (
        <>
            {account ? (
                renderProgramList()
            ) : (
                <div>
                    <div className="hidden md:block">Connect your wallet to view your programs</div>
                </div>
            )}
        </>
    )
}

export default ProgramListSidebar;