'use client'

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect } from "react";
import { useProgramStore } from '@/store/programStore';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu } from "lucide-react";
import { isMobile } from 'react-device-detect';

const ProgramListSidebar = () => {
    const { account } = useWallet();
    const { programs, fetchPrograms, shouldRefetch, isFetchingAllPrograms } = useProgramStore();
    const pathname = usePathname();

    useEffect(() => {
        if (account?.address) {
            fetchPrograms(account.address);
        }
    }, [account?.address, shouldRefetch, fetchPrograms]);

    const renderProgramList = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <div className="text-sm font-semibold">Your Programs</div>
                {programs.length > 0 && (
                    <Link href="/admin/new">
                        <button className="w-full border border-gray-500 text-sm font-semibold px-2 py-1 rounded-md hover:bg-gray-100">+</button>
                    </Link>
                )}
            </div>
            <div className="flex flex-col gap-2 text-sm">
                {isFetchingAllPrograms && programs.length === 0 ? (
                    <div><LoadingSpinner /></div>
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
        </>
    );

    const renderMobileDropdown = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between sticky top-0 border-gray-500">
                    <Menu className="h-4 w-4 opacity-50" /> Your Programs <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {programs.map((program) => (
                    <DropdownMenuItem key={`program-${program.id}`}>
                        <Link href={`/admin/edit/${program.id}`} className="w-full">
                            {program.name}
                        </Link>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuItem className="bg-gray-100">
                    <Link href="/admin/new" className="w-full">
                        + New Program
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <>
            {account ? (
                isMobile ? renderMobileDropdown() : renderProgramList()
            ) : (
                <div>Connect your wallet to view your programs</div>
            )}
        </>
    )
}

export default ProgramListSidebar;