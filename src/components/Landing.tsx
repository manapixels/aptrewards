'use client'

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from 'next/navigation';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgramStore } from '@/store/programStore';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { WalletSelector } from '@/components/onchain/WalletSelector';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Image from "next/image";
import { ScanLine, Search } from "lucide-react";


const Landing = () => {
    const { account } = useWallet();
    const { programs, fetchPrograms, shouldRefetch, userJoinedPrograms, fetchUserJoinedPrograms, fetchProgramDetails } = useProgramStore();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);
    const hasFetchedPrograms = useRef(false);

    const fetchIndividualPrograms = useCallback(async () => {
        for (const program of programs) {
            await fetchProgramDetails(program.id);
        }
    }, [programs, fetchProgramDetails]);

    useEffect(() => {
        const fetchData = async () => {
            if (account?.address) {
                setIsLoading(true);
                try {
                    await fetchPrograms(account.address);
                    await fetchUserJoinedPrograms(account.address);
                } catch (error) {
                    console.error("Error fetching programs:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchData();
    }, [account?.address, shouldRefetch, fetchPrograms, fetchUserJoinedPrograms]);

    useEffect(() => {
        if (programs.length > 0 && !hasFetchedPrograms.current) {
            fetchIndividualPrograms();
            hasFetchedPrograms.current = true;
        }
    }, [programs, fetchIndividualPrograms]);

    const renderSkeletons = () => (
        <>
            <div className="flex w-full space-x-4 overflow-hidden">
                {[...Array(6)].map((_, index) => (
                    <Skeleton key={index} className="h-48 w-48 flex-shrink-0" />
                ))}
            </div>
        </>
    );

    const renderOwnedProgramList = () => (
        <div className="m-4">
            <div className="flex justify-between items-center mb-4">
                <div className="text-md font-semibold">Programs you manage</div>
                {programs.length > 0 && (
                    <Link href="/admin/new">
                        <button className="w-full border border-gray-500 text-sm font-semibold px-2 py-1 rounded-md hover:bg-gray-100">+ New</button>
                    </Link>
                )}
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-md pb-2">
                <div className="flex w-max space-x-4">
                    {isLoading && programs.length === 0 ? (
                        renderSkeletons()
                    ) : (
                        programs.map((program) => (
                            <Link
                                key={`program-${program.id}`}
                                href={`/admin/edit/${program.id}`}
                                className={`rounded-md ${pathname === `/admin/edit/${program.id}` ? 'bg-gray-100 font-semibold text-black' : 'text-gray-600'} hover:bg-gray-100 border border-gray-400`}
                            >
                                <div className="h-16 w-full patterned-placeholder"></div>
                                <div className="px-6 py-4">
                                    <div className="font-semibold text-lg mb-2">{program.name}</div>
                                    <div>
                                        <div
                                            className="relative z-30 flex flex-1 flex-row justify-between gap-1 text-left data-[active=true]:bg-muted/50 sm:px-8 sm:py-6"
                                        >
                                            <span className="text-xs text-muted-foreground">
                                                Customers
                                            </span>
                                            <span className="text-md font-bold leading-none sm:text-3xl">
                                                {program?.customerData?.length || 'N/A'}
                                            </span>
                                        </div>
                                        <div
                                            className="relative z-30 flex flex-1 flex-row justify-between gap-1 text-left data-[active=true]:bg-muted/50 sm:px-8 sm:py-6"
                                        >
                                            <span className="text-xs text-muted-foreground">
                                                Points Issued
                                            </span>
                                            <span className="text-md font-bold leading-none sm:text-3xl">
                                                {Number(program?.totalPointsIssued)?.toLocaleString() || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
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
                <div className="text-md font-semibold">Programs you've joined</div>
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-md">
                <div className="flex w-max space-x-4">
                    {isLoading && userJoinedPrograms.length === 0 ? (
                        renderSkeletons()
                    ) : (
                        userJoinedPrograms.map((program) => (
                            <Link
                                key={`program-${program.programId}`}
                                href={`/co/${program.programId}`}
                                className={`rounded-md ${pathname === `/admin/edit/${program.programId}` ? 'bg-gray-100 font-semibold text-black' : 'text-gray-600'} hover:bg-gray-100 border border-gray-400`}
                            >
                                <div className="h-16 w-full pattern-circle-tile"></div>
                                <div className="px-6 py-4">
                                    <div className="text-lg font-semibold">{program.programName}</div>
                                    <div className="mt-1 mb-2">
                                        <div className="text-md text-[#ae7427] font-semibold">{program?.currentTier?.name}</div>
                                        <div className="text-sm font-semibold">{Number(program?.points)?.toLocaleString()} points</div>
                                        {/* <div className="w-[1px] h-4 bg-[#ae7427]"></div> */}

                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen">
            <div className="bg-gray-100">
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
            </div>
            <main className="flex-grow">

                <div>

                    <div className="px-4 py-8 flex flex-row justify-between items-center bg-gray-100">
                        <div className="text-3xl font-bold">Welcome back!</div>
                        <Button variant="outline" className="h-16 border-gray-400"><ScanLine /></Button>
                    </div>
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
                                    <div className="p-4 text-center">Connect your wallet to view your programs</div>
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