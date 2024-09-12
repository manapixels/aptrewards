'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { AlertCircle, Plus, X } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { moduleAddress, moduleName } from '@/constants';
import { getAptosClient } from '@/lib/utils';
import { useProgramStore } from '@/store/programStore';
import { Tier } from '@/types/aptrewards';
import { MoveString, MoveVector, U64 } from '@aptos-labs/ts-sdk';

export default function EditExistingProgramForm({ programId }: { programId: string }) {
    const { toast } = useToast();
    const { account, signAndSubmitTransaction } = useWallet();
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const { triggerRefetch, fetchProgramDetails, programs, isFetchingOneProgram } = useProgramStore();
    const currProgram = programs.find(program => program.id === programId.toString());

    const [name, setName] = useState('');
    const [stampValidityDays, setStampValidityDays] = useState(0);

    const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
    const [isAddTierOpen, setIsAddTierOpen] = useState(false);
    const [editingTier, setEditingTier] = useState<Tier | null>(null);

    useEffect(() => {
        fetchProgramDetails(programId);
    }, [programId, fetchProgramDetails]);

    useEffect(() => {
        if (currProgram) {
            setName(currProgram.name);
            setStampValidityDays(currProgram?.stampValidityDays || 0);
        }
    }, [currProgram]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setTransactionInProgress(true);
            if (!account) throw new Error("No account connected");
            if (!moduleAddress || !moduleName) throw new Error("No module address or name");

            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::edit_loyalty_program`,
                    typeArguments: [],
                    functionArguments: [
                        programId,
                        name,
                        stampValidityDays,
                    ],
                },
            });

            await getAptosClient().waitForTransaction({ transactionHash: response.hash });

            triggerRefetch();
            fetchProgramDetails(programId);

            toast({
                title: 'Success',
                description: 'Program updated successfully',
            });
            setIsEditProgramOpen(false);
        } catch (error) {
            console.error('Error updating program:', error);
            toast({
                title: 'Error',
                description: 'Error updating program',
                variant: 'destructive',
            });
        } finally {
            setTransactionInProgress(false);
        }
    };

    const handleTierAction = async (action: 'add' | 'edit' | 'remove', tier: Tier) => {
        try {
            if (!account) throw new Error("No account connected");
            if (!currProgram?.id) throw new Error("No program id found")

            let functionArguments: any[] = [];
            if (action === 'add') {
                functionArguments = [
                    new U64(parseInt(currProgram?.id)),
                    new MoveString(tier.name),
                    new U64(tier.stampsRequired),
                    MoveVector.MoveString(tier.benefits),
                ];
            } else if (action === 'edit') {
                functionArguments = [
                    new U64(parseInt(currProgram?.id)),
                    new U64(tier.id),
                    new MoveString(tier.name),
                    new U64(tier.stampsRequired),
                    MoveVector.MoveString(tier.benefits),
                ];
            } else if (action === 'remove') {
                functionArguments = [       
                    new U64(parseInt(currProgram?.id)),
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

            fetchProgramDetails(currProgram.id);
            setIsAddTierOpen(false);
            setEditingTier(null);
            setIsEditProgramOpen(false);
        } catch (error) {
            console.error(`Error: ${action} tier:`, error);
            toast({
                title: 'Error',
                description: `Failed to ${action} tier`,
                variant: 'destructive',
            });
        }
    };

    const handleEditTier = (tier: Tier) => {
        setEditingTier({ ...tier, benefits: [...tier.benefits] });
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

    if (!currProgram && !isFetchingOneProgram) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No access to this loyalty program</AlertTitle>
                <AlertDescription>
                    Choose a different loyalty program to edit.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white shadow-sm border rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Loyalty Program Details</h3>
                    <Dialog open={isEditProgramOpen} onOpenChange={setIsEditProgramOpen}>
                        <DialogTrigger asChild>
                            <Button className="border-gray-600" variant="outline" size="sm">Edit</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <Label htmlFor="name">
                                    Name:
                                    <Input
                                        type="text"
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mb-2"
                                    />
                                </Label>
                                <Label htmlFor="stampValidityDays">
                                    Stamp Validity Days:
                                    <Input
                                        type="number"
                                        id="stampValidityDays"
                                        value={stampValidityDays}
                                        onChange={(e) => setStampValidityDays(Number(e.target.value))}
                                        className="mb-2"
                                    />
                                </Label>
                                <div className="flex justify-end">
                                    <Button type="submit" className="mt-2" disabled={transactionInProgress}>
                                        {transactionInProgress ? 'Updating...' : 'Update'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-gray-600 text-xs">Name:</Label>
                        <p className="font-medium">{currProgram?.name}</p>
                    </div>
                    <div>
                        <Label className="text-gray-600 text-xs">Stamp Validity Days:</Label>
                        <p className="font-medium">{currProgram?.stampValidityDays || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-sm border rounded-lg p-6">
                <div className="flex justify-between align-center mb-4">
                <h3 className="font-semibold">Manage Tiers</h3>
                <Dialog open={isAddTierOpen} onOpenChange={setIsAddTierOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-gray-500">Add Tier</Button>
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
                                benefits: (formData.get('tierBenefits') as string).split(',').map(benefit => benefit.trim()),
                            };
                            handleTierAction('add', newTier);
                        }}>
                            <Label htmlFor="tierName">Tier Name</Label>
                            <Input
                                id="tierName"
                                name="tierName"
                                className="mb-2"
                            />
                            <Label htmlFor="tierStampsRequired">Stamps Required</Label>
                            <Input
                                id="tierStampsRequired"
                                name="tierStampsRequired"
                                type="number"
                                className="mb-2"
                            />
                            <Label htmlFor="tierBenefits">Benefits (comma-separated)</Label>
                            <Input
                                id="tierBenefits"
                                name="tierBenefits"
                                className="mb-2"
                            />
                            <div className="flex justify-end">
                                <Button type="submit">Add Tier</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
                </div>
                
                {currProgram?.tiers?.map((tier: Tier) => (
                    <div key={tier.id} className="mb-4 p-4 border rounded">
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
                                        <Button variant="outline" className="border-gray-500" size="sm">Edit</Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                                            <Dialog>
                                                <DialogTrigger onClick={() => handleEditTier(tier)}>
                                                    Edit details
                                                </DialogTrigger>
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
                                                            <Button type="submit">Update Tier</Button>
                                                        </div>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleTierAction('remove', tier)} className="cursor-pointer">Remove Tier</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}