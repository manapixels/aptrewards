'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { moduleAddress, moduleName } from '@/constants';
import { getAptosClient } from '@/lib/utils';
import { useProgramStore } from '@/store/programStore';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tier } from '@/types/aptrewards';

export default function EditExistingProgramForm({ programId }: { programId: string }) {
    const { toast } = useToast();
    const { account, signAndSubmitTransaction } = useWallet();
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const { triggerRefetch, fetchProgramDetails, programs, isFetchingOneProgram } = useProgramStore();
    const currProgram = programs.find(program => program.id === programId.toString());

    const [name, setName] = useState('');
    const [spinProbability, setSpinProbability] = useState('');
    const [spinAmount, setSpinAmount] = useState('');
    const [stampValidityDays, setStampValidityDays] = useState('');

    const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
    const [isAddTierOpen, setIsAddTierOpen] = useState(false);
    const [editingTier, setEditingTier] = useState<Tier | null>(null);

    useEffect(() => {
        fetchProgramDetails(programId);
    }, [programId, fetchProgramDetails]);

    useEffect(() => {
        if (currProgram) {
            setName(currProgram.name);
            setStampValidityDays(currProgram.stampValidityDays?.toString() || '');
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
                        parseInt(stampValidityDays),
                        [parseInt(spinProbability)],
                        [parseInt(spinAmount)]
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

            const response = await signAndSubmitTransaction({
                sender: account?.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::${action}_tier`,
                    typeArguments: [],
                    functionArguments: [
                        currProgram?.id,
                        action === 'remove' ? tier.id : tier.name,
                        action === 'remove' ? undefined : tier.description,
                        action === 'remove' ? undefined : tier.stampsRequired,
                    ].filter(arg => arg !== undefined),
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
        } catch (error) {
            console.error(`Error: ${action} tier:`, error);
            toast({
                title: 'Error',
                description: `Failed to ${action} tier`,
                variant: 'destructive',
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
                                {/* <div className="flex items-center space-x-2 mb-2">
                                    <Checkbox
                                        id="luckySpinEnabled"
                                        checked={luckySpinEnabled}
                                        onCheckedChange={(checked) => setLuckySpinEnabled(checked as boolean)}
                                    />
                                    <Label htmlFor="luckySpinEnabled">Lucky Spin Enabled</Label>
                                </div> */}
                                {/* <Label htmlFor="spinProbability">
                                    Spin Probability:
                                    <Input
                                        type="number"
                                        id="spinProbability"
                                        value={spinProbability}
                                        onChange={(e) => setSpinProbability(e.target.value)}
                                        className="mb-2"
                                    />
                                </Label>
                                <Label htmlFor="spinAmount">
                                    Spin Amount:
                                    <Input
                                        type="number"
                                        id="spinAmount"
                                        value={spinAmount}
                                        onChange={(e) => setSpinAmount(e.target.value)}
                                        className="mb-2"
                                    />
                                </Label> */}
                                <Label htmlFor="stampValidityDays">
                                    Stamp Validity Days:
                                    <Input
                                        type="number"
                                        id="stampValidityDays"
                                        value={stampValidityDays}
                                        onChange={(e) => setStampValidityDays(e.target.value)}
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
                            <Label>Name:</Label>
                            <p className="font-medium">{currProgram?.name}</p>
                        </div>
                        <div>
                            <Label>Stamp Validity Days:</Label>
                            <p className="font-medium">{currProgram?.stampValidityDays || 'N/A'}</p>
                        </div>
                    </div>
            </div>

            <div className="bg-white shadow-sm border rounded-lg p-6">
                <h3 className="font-semibold mb-4">Manage Tiers</h3>
                {currProgram?.tiers?.map((tier: Tier) => (
                    <div key={tier.id} className="mb-4 p-4 border rounded">
                        <h4 className="font-medium">{tier.name}</h4>
                        <p>{tier.description}</p>
                        <p>Stamps required: {tier.stampsRequired}</p>
                        <div className="mt-2">
                            <Dialog open={editingTier?.id === tier.id} onOpenChange={(open) => !open && setEditingTier(null)}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => setEditingTier(tier)} className="mr-2">Edit</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Edit Tier</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target as HTMLFormElement);
                                        const updatedTier: Tier = {
                                            ...tier,
                                            name: formData.get('tierName') as string,
                                            description: formData.get('tierDescription') as string,
                                            stampsRequired: parseInt(formData.get('tierStampsRequired') as string),
                                        };
                                        handleTierAction('edit', updatedTier);
                                    }}>
                                        <Label htmlFor="tierName">Tier Name</Label>
                                        <Input
                                            id="tierName"
                                            name="tierName"
                                            defaultValue={tier.name}
                                            className="mb-2"
                                        />
                                        <Label htmlFor="tierDescription">Description</Label>
                                        <Input
                                            id="tierDescription"
                                            name="tierDescription"
                                            defaultValue={tier.description}
                                            className="mb-2"
                                        />
                                        <Label htmlFor="tierStampsRequired">Stamps Required</Label>
                                        <Input
                                            id="tierStampsRequired"
                                            name="tierStampsRequired"
                                            type="number"
                                            defaultValue={tier.stampsRequired}
                                            className="mb-2"
                                        />
                                        <div className="flex justify-end">
                                            <Button type="submit">Update Tier</Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                            <Button onClick={() => handleTierAction('remove', tier)} variant="destructive">Remove</Button>
                        </div>
                    </div>
                ))}

                <Dialog open={isAddTierOpen} onOpenChange={setIsAddTierOpen}>
                    <DialogTrigger asChild>
                        <Button>Add New Tier</Button>
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
                                description: formData.get('tierDescription') as string,
                                stampsRequired: parseInt(formData.get('tierStampsRequired') as string),
                            };
                            handleTierAction('add', newTier);
                        }}>
                            <Label htmlFor="tierName">Tier Name</Label>
                            <Input
                                id="tierName"
                                name="tierName"
                                className="mb-2"
                            />
                            <Label htmlFor="tierDescription">Description</Label>
                            <Input
                                id="tierDescription"
                                name="tierDescription"
                                className="mb-2"
                            />
                            <Label htmlFor="tierStampsRequired">Stamps Required</Label>
                            <Input
                                id="tierStampsRequired"
                                name="tierStampsRequired"
                                type="number"
                                className="mb-2"
                            />
                            <div className="flex justify-end">
                                <Button type="submit">Add Tier</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}