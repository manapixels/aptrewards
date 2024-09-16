'use client';

import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { PencilIcon, Plus, PlusIcon, User, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress"
import { moduleAddress, moduleName } from '@/constants';
import { getAptosClient } from '@/lib/utils';
import { useProgramStore } from '@/store/programStore';
import { CustomerWithStamps, LoyaltyProgram, Tier } from '@/types/aptrewards';
import { MoveString, MoveVector, U64 } from '@aptos-labs/ts-sdk';
import { CustomerTable } from '@/components/admin/CustomerTable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { truncateAddress } from '@/utils/addressUtils';
import { ColumnDef } from '@tanstack/react-table';

const ProgramTiers = ({ program }: { program: LoyaltyProgram }) => {

    const { toast } = useToast();
    const { account, signAndSubmitTransaction } = useWallet();
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const { fetchProgramDetails, getTierForCustomer } = useProgramStore();

    const [isAddTierDialogOpen, setIsAddTierDialogOpen] = useState(false);
    const [editingTier, setEditingTier] = useState<Tier | null>(null);
    const [isEditTierDialogOpen, setIsEditTierDialogOpen] = useState(false);
    const [newTierBenefits, setNewTierBenefits] = useState<string[]>(['']);

    const [isTierCustomersDialogOpen, setIsTierCustomersDialogOpen] = useState(false);
    const [selectedTier, setSelectedTier] = useState<string | null>(null);

    const handleTierAction = async (action: 'add' | 'edit' | 'remove', tier: Tier) => {
        try {
            if (!account) throw new Error("No account connected");
            if (!program?.id) throw new Error("No program id found")

            setTransactionInProgress(true);

            let functionArguments: any[] = [];
            if (action === 'add') {
                functionArguments = [
                    new U64(parseInt(program?.id)),
                    new MoveString(tier.name),
                    new U64(tier.stampsRequired),
                    MoveVector.MoveString(tier.benefits),
                ];
            } else if (action === 'edit') {
                functionArguments = [
                    new U64(parseInt(program?.id)),
                    new U64(tier.id),
                    new MoveString(tier.name),
                    new U64(tier.stampsRequired),
                    MoveVector.MoveString(tier.benefits),
                ];
            } else if (action === 'remove') {
                functionArguments = [
                    new U64(parseInt(program?.id)),
                    new U64(tier.id),
                ];
            }

            const response = await signAndSubmitTransaction({
                sender: account?.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::${action}_tier`,
                    typeArguments: [],
                    functionArguments,
                },
            });
            await getAptosClient().waitForTransaction({ transactionHash: response.hash });

            toast({
                title: 'Success',
                description: `${action.charAt(0).toUpperCase() + action.slice(1)} tier successfully`,
            });

            fetchProgramDetails(program.id);
        } catch (error) {
            console.error(`Error: ${action} tier:`, error);
            toast({
                title: 'Error',
                description: `Failed to ${action} tier`,
                variant: 'destructive',
            });
        } finally {
            setTransactionInProgress(false);
            if (action === 'add') {
                setNewTierBenefits(['']);
                setIsAddTierDialogOpen(false);
            } else if (action === 'edit') {
                setEditingTier(null);
                setIsEditTierDialogOpen(false);
            }
        }
    };

    const openEditTierDialog = (tier: Tier) => {
        setEditingTier({ ...tier, benefits: [...tier.benefits] });
        setIsEditTierDialogOpen(true);
    };

    const handleAddBenefit = () => {
        if (editingTier) {
            setEditingTier({
                ...editingTier,
                benefits: [...editingTier.benefits, '']
            });
        }
    };

    const handleRemoveBenefit = (index: number) => {
        if (editingTier) {
            const newBenefits = [...editingTier.benefits];
            newBenefits.splice(index, 1);
            setEditingTier({
                ...editingTier,
                benefits: newBenefits
            });
        }
    };

    const handleBenefitChange = (index: number, value: string) => {
        if (editingTier) {
            const newBenefits = [...editingTier.benefits];
            newBenefits[index] = value;
            setEditingTier({
                ...editingTier,
                benefits: newBenefits
            });
        }
    };

    const handleAddNewBenefit = () => {
        setNewTierBenefits([...newTierBenefits, '']);
    };

    const handleRemoveNewBenefit = (index: number) => {
        const updatedBenefits = newTierBenefits.filter((_, i) => i !== index);
        setNewTierBenefits(updatedBenefits);
    };

    const handleNewBenefitChange = (index: number, value: string) => {
        const updatedBenefits = [...newTierBenefits];
        updatedBenefits[index] = value;
        setNewTierBenefits(updatedBenefits);
    };

    const renderTierChart = () => {
        if (!program?.tiers || program.tiers.length === 0) return null;

        const sortedTiers = [...program.tiers].sort((a, b) => a.stampsRequired - b.stampsRequired);
        const maxStamps = sortedTiers[sortedTiers.length - 1].stampsRequired;

        return (
            <div className="px-6 py-4">
                <h4 className="text-sm font-medium mb-2">Progression</h4>
                <div className="relative py-5">
                    <Progress value={100} className="h-2" />
                    {sortedTiers.map((tier, index) => (
                        <div
                            key={tier.id}
                            className="absolute transform -translate-x-3/4 translate-y-1/2 -top-1/2 flex flex-col items-center"
                            style={{ left: `${(tier.stampsRequired / maxStamps) * 100}%` }}
                        >
                            <span className="text-xs font-medium block text-center whitespace-nowrap">
                                {tier.name}
                            </span>
                            <div className="h-4 flex items-center">
                                <div className="w-1 h-1 bg-white rounded-full mx-auto z-10" />
                            </div>
                            <span className="text-xs text-gray-500 block text-center">
                                {tier.stampsRequired}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const handleTierButtonClick = (tierName: string) => {
        setSelectedTier(tierName);
        setIsTierCustomersDialogOpen(true);
    };

    const renderCustomersTable = () => {
        if (!program || !selectedTier) return null;

        const customers = program?.customersWithStamps
            ?.map((customer: CustomerWithStamps, index: number) => ({
                address: customer.customer,
                stamps: customer.stamps,
                tier: getTierForCustomer(program, customer.stamps),
            }))
            ?.filter((customer: { tier: string }) => customer.tier === selectedTier);

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
                    </div>
                ),
            },
            {
                accessorKey: 'stamps',
                header: 'Stamps',
                cell: info => info.getValue(),
            },
            {
                accessorKey: 'tier',
                header: 'Tier',
                cell: info => info.getValue(),
            },
        ];

        return (
            <ScrollArea className="h-[400px]">
                <CustomerTable
                    columns={columns}
                    data={customers || []}
                />
            </ScrollArea>
        );
    };

    return (
        <div>
            <div className="bg-white shadow-sm border rounded-lg">
                <div className="flex justify-between items-center px-6 py-4 bg-gray-100">
                    <h3 className="font-semibold leading-tight">Tiers</h3>
                    <Dialog open={isAddTierDialogOpen} onOpenChange={setIsAddTierDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="border-gray-500">
                                <PlusIcon className="w-4 h-4 stroke-gray-500" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Tier</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target as HTMLFormElement);
                                const newTier: Tier = {
                                    id: 0,
                                    name: formData.get('tierName') as string,
                                    stampsRequired: parseInt(formData.get('tierStampsRequired') as string),
                                    benefits: newTierBenefits.filter(benefit => benefit.trim() !== ''),
                                };
                                handleTierAction('add', newTier);
                            }}>
                                <Label htmlFor="tierName">Tier Name</Label>
                                <Input
                                    id="tierName"
                                    name="tierName"
                                    autoComplete="off"
                                    className="mb-2"
                                />
                                <Label htmlFor="tierStampsRequired">Stamps Required</Label>
                                <Input
                                    id="tierStampsRequired"
                                    name="tierStampsRequired"
                                    type="number"
                                    className="mb-2"
                                />
                                <Label>Benefits</Label>
                                {newTierBenefits.map((benefit, index) => (
                                    <div key={index} className="flex items-center mb-2">
                                        <Input
                                            value={benefit}
                                            onChange={(e) => handleNewBenefitChange(index, e.target.value)}
                                            className="flex-grow"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveNewBenefit(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddNewBenefit}
                                    className="mb-2"
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Add Benefit
                                </Button>
                                <div className="flex justify-end">
                                    <Button type="submit">Add Tier</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {renderTierChart()}

                <div className="divide-y">
                    {program?.tiers?.map((tier: Tier) => (
                        <div key={tier.id} className="px-6 py-4">
                            <div className="flex justify-between">
                                <h4 className="font-medium">{tier.name}</h4>
                                <div className="text-sm">From {tier.stampsRequired} stamps</div>
                            </div>
                            <div className="flex justify-between gap-4">
                                <div className="text-gray-600 text-sm">
                                    <h5 className="font-medium mb-1">Benefits:</h5>
                                    <ul className="list-disc pl-5">
                                        {tier.benefits.map((benefit, index) => (
                                            <li key={index}>{benefit}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="mt-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="border-gray-500" size="sm">
                                                <PencilIcon className="w-4 h-4 stroke-gray-500" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => openEditTierDialog(tier)} className="cursor-pointer">Edit</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleTierAction('remove', tier)} className="cursor-pointer">Remove</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 border">
                    {program?.tiers?.map((tier: Tier) => (
                        <button
                            key={tier.id}
                            onClick={() => handleTierButtonClick(tier.name)}
                            className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left [&:not(:first-child)]:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:px-8 sm:py-6 hover:bg-gray-100"
                        >
                            <span className="text-xs text-muted-foreground">
                                {tier.name}
                            </span>
                            <span className="text-lg font-bold leading-none sm:text-3xl">
                                {tier?.customerCount || 0} <User className="w-4 h-4 inline-block stroke-gray-500" />
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <Dialog open={isEditTierDialogOpen} onOpenChange={setIsEditTierDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Tier</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (editingTier) {
                            handleTierAction('edit', editingTier);
                        }
                    }}>
                        <Label htmlFor="tierName">Tier Name</Label>
                        <Input
                            id="tierName"
                            name="tierName"
                            autoComplete="off"
                            value={editingTier?.name || ''}
                            onChange={(e) => setEditingTier(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="mb-2"
                        />
                        <Label htmlFor="tierStampsRequired">Stamps Required</Label>
                        <Input
                            id="tierStampsRequired"
                            name="tierStampsRequired"
                            type="number"
                            value={editingTier?.stampsRequired || 0}
                            onChange={(e) => setEditingTier(prev => prev ? { ...prev, stampsRequired: parseInt(e.target.value) } : null)}
                            className="mb-2"
                        />
                        <Label>Benefits</Label>
                        {editingTier?.benefits.map((benefit, index) => (
                            <div key={index} className="flex items-center mb-2">
                                <Input
                                    name="tierBenefits"
                                    value={benefit}
                                    onChange={(e) => handleBenefitChange(index, e.target.value)}
                                    className="flex-grow"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveBenefit(index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddBenefit}
                            className="mb-2"
                        >
                            <Plus className="h-4 w-4 mr-2" /> Add Benefit
                        </Button>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={transactionInProgress}>
                                {transactionInProgress ? 'Updating...' : 'Update'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isTierCustomersDialogOpen} onOpenChange={setIsTierCustomersDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Customers in {selectedTier} Tier</DialogTitle>
                    </DialogHeader>
                    {renderCustomersTable()}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default ProgramTiers;