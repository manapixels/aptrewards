'use client'

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Barcode, DiscAlbum, Users } from 'lucide-react';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useProgramStore } from '@/store/programStore';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const AdminMenuPanel: React.FC = () => {
    const pathname = usePathname();
    const { account } = useWallet();
    const { programs, fetchPrograms, shouldRefetch } = useProgramStore();
    const [isLoading, setIsLoading] = useState(true);
    const [isProgramsOpen, setIsProgramsOpen] = useState(false);
    const [isUsersOpen, setIsUsersOpen] = useState(false);

    useEffect(() => {
        if (account?.address) {
            setIsLoading(true);
            fetchPrograms(account.address).then(() => setIsLoading(false));
        }
    }, [account?.address, shouldRefetch, fetchPrograms]);

    const ProgramsDropdown = () => (
        <DropdownMenu open={isProgramsOpen} onOpenChange={setIsProgramsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`col-span-1 flex flex-col items-center py-2 px-4 h-auto ${pathname.startsWith('/admin/edit') ? 'text-[#a7783a] font-bold' : 'text-gray-600'}`}>
                    <DiscAlbum className={`h-6 w-6 ${pathname.startsWith('/admin/edit') ? 'stroke-[#a7783a]' : 'stroke-gray-600'}`} />
                    <span className="text-xs mt-1">Programs</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <>
                        {programs.map((program) => (
                            <DropdownMenuItem key={`program-${program.id}`}>
                                <Link href={`/admin/edit/${program.id}`} className="w-full" onClick={() => setIsProgramsOpen(false)}>
                                    {program.name}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem className="bg-gray-100">
                            <Link href="/admin/new" className="w-full" onClick={() => setIsProgramsOpen(false)}>
                                + New Program
                            </Link>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const UsersDropdown = () => (
        <DropdownMenu open={isUsersOpen} onOpenChange={setIsUsersOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`col-span-1 flex flex-col items-center py-2 px-4 h-auto ${pathname.startsWith('/admin/users') ? 'text-[#a7783a] font-bold' : 'text-gray-600'}`}>
                    <Users className={`h-6 w-6 ${pathname.startsWith('/admin/users') ? 'stroke-[#a7783a]' : 'stroke-gray-600'}`} />
                    <span className="text-xs mt-1">Users</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <>
                        {programs.map((program) => (
                            <DropdownMenuItem key={`users-${program.id}`}>
                                <Link href={`/admin/users/${program.id}`} className="w-full" onClick={() => setIsUsersOpen(false)}>
                                    {program.name}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <div className="sticky bottom-0 left-0 right-0 bg-gray-100 shadow-lg md:hidden z-50 border-t border-gray-400">
            <nav className="grid grid-cols-3 justify-around items-center">
                <ProgramsDropdown />
                <Link href="/admin/issue" className={`col-span-1 flex flex-col items-center py-2 px-4 ${pathname === '/admin/issue' ? 'text-[#a7783a] font-bold' : 'text-white'}`}>
                    <Barcode className={`h-6 w-6 ${pathname === '/admin/issue' ? 'outline-white' : 'outline-white'}`} />
                    <span className="text-md mt-1">Scan</span>
                    {/* <div className="bg-gray-900 rounded-full w-24 h-24 absolute z-[-1] top-[50%] translate-y-[-50%] border border-gray-400"></div> */}
                    <div className="bg-gray-900 rounded-full w-24 h-24 fixed z-[-1] -bottom-12 border border-gray-400"></div>
                </Link>
                <UsersDropdown />
            </nav>
        </div>
    );
};

export default AdminMenuPanel;