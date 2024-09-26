'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowDownNarrowWide, ArrowDownWideNarrow, Copy, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

import { CustomerTable } from '@/components/admin/users/CustomerTable';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgramStore } from '@/store/programStore';
import { truncateAddress } from '@/utils/address';

const UsersInProgramTable = ({ programId }: { programId: string }) => {
  const { fetchProgramDetails, getTierForCustomer, programs } = useProgramStore();
  const currProgram = programs.find(program => program.id === programId.toString());
  const [isLoading, setIsLoading] = useState(true);
  const [filterTiers, setFilterTiers] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setIsLoading(true);
    fetchProgramDetails(programId).then(() => setIsLoading(false));
}, [programId, fetchProgramDetails]);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const handleTierChange = (tier: string) => {
    setFilterTiers(prev => {
      const newTiers = prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier];
      return newTiers;
    });
  };

  const filteredAndSortedCustomers = () => {
    if (!currProgram) return [];

    let customers = currProgram.customerData?.map((customer) => ({
      address: customer.address,
      points: customer.points,
      tier: getTierForCustomer(currProgram, customer.points),
    }));

    if (filterTiers.length) {
      customers = customers?.filter(customer => filterTiers.includes(customer.tier));
    }

    customers?.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.points - b.points;
      } else {
        return b.points - a.points;
      }
    });

    return customers;
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'index',
      header: '#',
      cell: info => info.row.index + 1,
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row: { original: customer } }) => (
        <div className="flex items-center gap-1">
          {truncateAddress(customer.address)}
          <Copy
            className="w-4 h-4 stroke-gray-600 cursor-pointer"
            onClick={() => handleCopyAddress(customer.address)}
          />
        </div>
      ),
    },
    {
      accessorKey: 'points',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Points
            {column.getIsSorted() === "asc" ? <ArrowDownNarrowWide className="ml-2 h-4 w-4" /> : <ArrowDownWideNarrow className="ml-2 h-4 w-4" />}
          </Button>
        )
      },
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'tier',
      header: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">
              Tier
              <Filter className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilterTiers([])}>
              <Checkbox checked={filterTiers.length === 0} className="mr-2" />
              All
            </DropdownMenuItem>
            {currProgram?.tiers?.map((tier, index) => (
              <DropdownMenuItem key={index} onClick={() => handleTierChange(tier.name)} className="cursor-pointer">
                <Checkbox checked={filterTiers.includes(tier.name)} className="mr-2" />
                {tier.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      cell: info => info.getValue(),
    },
  ];

  if (isLoading) {
    return <div className="p-4"><Skeleton className="h-8 w-full mb-4" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Users in {currProgram?.name}</h1>
      <CustomerTable
        columns={columns}
        data={filteredAndSortedCustomers() || []}
      />
    </div>
  );
};

export default UsersInProgramTable;