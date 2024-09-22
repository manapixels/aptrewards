'use client'

import React, { useState, useEffect, useCallback } from 'react';
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
    const [isOpen, setIsOpen] = useState(false);

    const closeDropdown = useCallback(() => {
        console.log('closeDropdown');
        setIsOpen(false);
    }, []);

    useEffect(() => {
        if (account?.address) {
            setIsLoading(true);
            fetchPrograms(account.address).then(() => setIsLoading(false));
        }
    }, [account?.address, shouldRefetch, fetchPrograms]);

    const renderProgramsDropdown = () => (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`flex flex-col items-center py-2 px-4 h-auto ${pathname === '/admin/issue' ? 'text-[#a7783a]' : 'text-gray-600'
                    }`}>
                    <DiscAlbum className={`h-6 w-6 ${pathname === '/admin/issue' ? 'outline-[#a7783a]' : 'outline-gray-600'
                    }`} />
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
                                <Link href={`/admin/edit/${program.id}`} className="w-full" onClick={closeDropdown}>
                                    {program.name}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem className="bg-gray-100">
                            <Link href="/admin/new" className="w-full" onClick={closeDropdown}>
                                + New Program
                            </Link>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-100 shadow-lg md:hidden z-50 border-t border-gray-400">
            <nav className="flex justify-around items-center">
                {renderProgramsDropdown()}
                <Link href="/admin/issue" className={`flex flex-col items-center py-2 px-4 ${pathname === '/admin/issue' ? 'text-[#a7783a]' : 'text-white'
                    }`}>
                    <Barcode className={`h-6 w-6 ${pathname === '/admin/issue' ? 'outline-white' : 'outline-white'
                    }`} />
                    <span className="text-md mt-1">Issue</span>
                    <div className="bg-gray-900 rounded-full w-24 h-24 absolute z-[-1] top-[50%] translate-y-[-50%] border border-gray-400"></div>
                </Link>
                <Link href="/admin/users" className={`flex flex-col items-center py-2 px-4 ${pathname === '/admin/users' ? 'text-[#a7783a]' : 'text-gray-600'
                    }`}>
                    <Users className={`h-6 w-6 ${pathname === '/admin/users' ? 'outline-[#a7783a]' : 'outline-gray-600'
                    }`} />
                    <span className="text-xs mt-1">Users</span>
                </Link>
            </nav>
        </div>
    );
};

export default AdminMenuPanel;