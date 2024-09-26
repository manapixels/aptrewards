'use client'

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useState } from "react";
import { usePathname } from 'next/navigation';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgramStore } from '@/store/programStore';
import { Card, CardContent } from '@/components/ui/card';
import { WalletSelector } from '@/components/onchain/WalletSelector';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Image from "next/image";

const Landing = () => {
    const { account } = useWallet();
    const { programs, fetchPrograms, shouldRefetch, userJoinedPrograms, fetchUserJoinedPrograms, fetchProgramDetails } = useProgramStore();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (account?.address) {
            setIsLoading(true);
            fetchPrograms(account.address).then(async () => {
                for (const program of programs) {
                    await fetchProgramDetails(program.id);
                }
                setIsLoading(false);
            });
            fetchUserJoinedPrograms(account.address);
        }
    }, [account?.address, shouldRefetch, fetchPrograms, fetchUserJoinedPrograms]);    

    const renderSkeletons = () => (
        <>
            <div className="flex flex-col gap-2">
                {[...Array(3)].map((_, index) => (
                    <Skeleton key={index} className="h-9 w-full" />
                ))}
            </div>
        </>
    );

    const renderOwnedProgramList = () => (
        <div className="m-4">
            <div className="flex justify-between items-center mb-4">
                <div className="text-md font-semibold">Your Programs</div>
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
                            className={`px-6 py-4 rounded-md ${pathname === `/admin/edit/${program.id}` ? 'bg-gray-100 font-semibold text-black' : 'text-gray-600'} hover:bg-gray-100 border border-gray-400`}
                        >
                            <div className="font-semibold text-lg mb-2">{program.name}</div>
                            <div className="grid grid-cols-2 border">
                                <div
                                    className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:px-8 sm:py-6"
                                >
                                    <span className="text-xs text-muted-foreground">
                                        Customers
                                    </span>
                                    <span className="text-lg font-bold leading-none sm:text-3xl">
                                        {program?.customerData?.length || 'N/A'}
                                    </span>
                                </div>
                                <div
                                    className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:px-8 sm:py-6"
                                >
                                    <span className="text-xs text-muted-foreground">
                                        Points Issued
                                    </span>
                                    <span className="text-lg font-bold leading-none sm:text-3xl">
                                        {program?.totalPointsIssued?.toLocaleString() || 'N/A'}
                                    </span>
                                </div>
                            </div>
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

    const renderJoinedProgramList = () => (
        <div className="m-4">
            <div className="flex justify-between items-center mb-4">
                <div className="text-md font-semibold">Joined Programs</div>
            </div>
            <div className="flex flex-col gap-2 text-sm">
                {isLoading && userJoinedPrograms.length === 0 ? (
                    renderSkeletons()
                ) : (
                    userJoinedPrograms.map((program) => (
                        <Link
                            key={`program-${program.programId}`}
                            href={`/co/${program.programId}`}
                            className={`px-6 py-4 rounded-md ${pathname === `/admin/edit/${program.programId}` ? 'bg-gray-100 font-semibold text-black' : 'text-gray-600'} hover:bg-gray-100 border border-gray-400`}
                        >
                            <div>{program.programName}</div>
                            <div className="flex flex-row items-center gap-2 text-[#ae7427] mt-1 mb-2">
                        <span className="text-lg font-semibold">{program?.points?.toLocaleString()} points</span>
                        <div className="w-[1px] h-4 bg-[#ae7427]"></div>
                        <span className="text-lg font-semibold ">{program?.currentTier?.name}</span>
                    </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-grow">
                <div className="flex flex-row justify-between items-center my-2 mx-4">
                    <Link href="/">
                        <div className="text-xl font-bold flex flex-row gap-2">
                            <Image src="/logo.svg" alt="AptRewards" width={160} height={26} />
                        </div>
                    </Link>
                    <div className="flex flex-row gap-2">
                        <WalletSelector />
                        <ThemeToggle />
                    </div>
                </div>
                <div>
                    <Card className="border-none md:border shadow-none md:shadow-sm">
                        <CardContent className="p-0 md:p-6">
                            {account ? (
                                <>
                                    {renderOwnedProgramList()}
                                    <div className="h-4 bg-gray-100 w-full my-6" />
                                    {renderJoinedProgramList()}
                                </>
                            ) : (
                                <div>
                                    <div>Connect your wallet to view your programs</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}

export default Landing;