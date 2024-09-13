'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { AlertCircle, PencilIcon, Plus, PlusIcon, User, X } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Coupon, Tier } from '@/types/aptrewards';
import { MoveString, MoveVector, U64 } from '@aptos-labs/ts-sdk';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const CouponRedemptionsTable = ({ coupons, couponsRedeemed }: { coupons: Coupon[] | undefined, couponsRedeemed: number[] | undefined }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Coupon Description</TableHead>
                <TableHead>Stamps Required</TableHead>
                <TableHead>Expiration Date</TableHead>
                <TableHead className="text-right">Redemptions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {coupons?.map((coupon, index) => (
                <TableRow key={coupon.id}>
                    <TableCell className="font-medium">{coupon.description}</TableCell>
                    <TableCell>{coupon.stampsRequired}</TableCell>
                    <TableCell>{new Date(coupon.expirationDate * 1000).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{couponsRedeemed?.[index] || 0}</TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);

export default function EditProgramForm({ programId }: { programId: string }) {
    const { toast } = useToast();
    const { account, signAndSubmitTransaction } = useWallet();
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const { triggerRefetch, fetchProgramDetails, programs, isFetchingOneProgram } = useProgramStore();
    const currProgram = programs.find(program => program.id === programId.toString());

    const [name, setName] = useState('');
    const [stampValidityDays, setStampValidityDays] = useState(0);

    const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
    const [isAddTierDialogOpen, setIsAddTierDialogOpen] = useState(false);
    const [editingTier, setEditingTier] = useState<Tier | null>(null);
    const [isEditTierDialogOpen, setIsEditTierDialogOpen] = useState(false);

    const [newTierBenefits, setNewTierBenefits] = useState<string[]>(['']);

    const [isAddCouponDialogOpen, setIsAddCouponDialogOpen] = useState(false);
    const [newCoupon, setNewCoupon] = useState({
        description: '',
        stampsRequired: 0,
        expirationDate: ''
    });

    useEffect(() => {
        fetchProgramDetails(programId);
    }, [programId, fetchProgramDetails]);

    useEffect(() => {
        if (currProgram) {
            setName(currProgram.name);
            setStampValidityDays(currProgram?.stampValidityDays || 0);
        }
    }, [currProgram]);

    const handleEditProgram = async (e: React.FormEvent) => {
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
        } catch (error) {
            console.error('Error updating program:', error);
            toast({
                title: 'Error',
                description: 'Error updating program',
                variant: 'destructive',
            });
        } finally {
            setTransactionInProgress(false);
            setIsEditProgramOpen(false);
        }
    };

    const handleTierAction = async (action: 'add' | 'edit' | 'remove', tier: Tier) => {
        try {
            if (!account) throw new Error("No account connected");
            if (!currProgram?.id) throw new Error("No program id found")

            setTransactionInProgress(true);

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

    const handleAddCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setTransactionInProgress(true);
            if (!account) throw new Error("No account connected");
            if (!moduleAddress || !moduleName) throw new Error("No module address or name");

            const expirationTimestamp = Math.floor(new Date(newCoupon.expirationDate).getTime() / 1000);

            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::create_coupon`,
                    typeArguments: [],
                    functionArguments: [
                        new U64(parseInt(programId)),
                        new MoveString(newCoupon.description),
                        new U64(newCoupon.stampsRequired),
                        new U64(expirationTimestamp),
                    ],
                },
            });

            await getAptosClient().waitForTransaction({ transactionHash: response.hash });

            triggerRefetch();
            fetchProgramDetails(programId);

            toast({
                title: 'Success',
                description: 'Coupon created successfully',
            });
        } catch (error) {
            console.error('Error creating coupon:', error);
            toast({
                title: 'Error',
                description: 'Error creating coupon',
                variant: 'destructive',
            });
        } finally {
            setTransactionInProgress(false);
            setIsAddCouponDialogOpen(false);
        }
    };

    const renderTierChart = () => {
        if (!currProgram?.tiers || currProgram.tiers.length === 0) return null;

        const sortedTiers = [...currProgram.tiers].sort((a, b) => a.stampsRequired - b.stampsRequired);
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

    const renderProgramStats = () => {
        if (!currProgram) return null;

        const stats = [
            { label: "Customers", value: currProgram.numCustomers },
            { label: "Stamps Issued", value: currProgram.totalStampsIssued },
        ];

        return (
            <div className="grid grid-cols-2 border">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:px-8 sm:py-6"
                    >
                        <span className="text-xs text-muted-foreground">
                            {stat.label}
                        </span>
                        <span className="text-lg font-bold leading-none sm:text-3xl">
                            {stat.value || 'N/A'}
                        </span>
                    </div>
                ))}
            </div>
        );
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
            <div>
            <div className="text-gray-500 text-sm">Rewards Program</div>
            <h1 className="font-bold text-2xl ml-2 my-4"><div className="inline bg-gray-100 px-2 py-1 h-100 mr-2"></div>{currProgram?.name}</h1>
            </div>
            <div className="bg-white shadow-sm border rounded-lg">
                
                <div className="flex justify-between items-center px-6 py-4 bg-gray-100">
                    <h3 className="font-semibold">Details</h3>
                    <Dialog open={isEditProgramOpen} onOpenChange={setIsEditProgramOpen}>
                        <DialogTrigger asChild>
                            <Button className="border-gray-600" variant="outline" size="sm">
                                <PencilIcon className="w-4 h-4 stroke-gray-600" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleEditProgram}>
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
                {renderProgramStats()}

                <div className="px-6 py-4 text-sm">
                    <div className="font-semibold">Options:</div>
                    <ul className="list-disc pl-5">
                        <li>
                            <span className="text-gray-600">Stamp Validity Days:</span>
                            <span className="ml-1">{currProgram?.stampValidityDays || 'N/A'}</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Tiers */}
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
                    {currProgram?.tiers?.map((tier: Tier) => (
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
                    {currProgram?.tiers?.map((tier, index) => (
                        <div
                            key={tier.id}
                            className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left [&:not(:first-child)]:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:px-8 sm:py-6"
                        >
                            <span className="text-xs text-muted-foreground">
                                {tier.name}
                            </span>
                            <span className="text-lg font-bold leading-none sm:text-3xl">
                                {currProgram.customersPerTier?.[index] || 0} <User className="w-4 h-4 inline-block stroke-gray-500" />
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Coupons */}
            <div className="bg-white shadow-sm border rounded-lg">
                <div className="flex justify-between items-center px-6 py-4 bg-gray-100">
                    <h3 className="font-semibold">Coupons</h3>
                    <Dialog open={isAddCouponDialogOpen} onOpenChange={setIsAddCouponDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="border-gray-500">
                                <PlusIcon className="w-4 h-4 stroke-gray-500" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Coupon</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddCoupon}>
                                <Label htmlFor="couponDescription">Description</Label>
                                <Input
                                    id="couponDescription"
                                    value={newCoupon.description}
                                    onChange={(e) => setNewCoupon({...newCoupon, description: e.target.value})}
                                    className="mb-2"
                                />
                                <Label htmlFor="couponStampsRequired">Stamps Required</Label>
                                <Input
                                    id="couponStampsRequired"
                                    type="number"
                                    value={newCoupon.stampsRequired}
                                    onChange={(e) => setNewCoupon({...newCoupon, stampsRequired: parseInt(e.target.value)})}
                                    className="mb-2"
                                />
                                <Label htmlFor="couponExpirationDate">Expiration Date</Label>
                                <Input
                                    id="couponExpirationDate"
                                    type="date"
                                    value={newCoupon.expirationDate}
                                    onChange={(e) => setNewCoupon({...newCoupon, expirationDate: e.target.value})}
                                    className="mb-2"
                                />
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={transactionInProgress}>
                                        {transactionInProgress ? 'Creating...' : 'Create Coupon'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
                <CouponRedemptionsTable
                    coupons={currProgram?.coupons}
                    couponsRedeemed={currProgram?.couponsRedeemed}
                />
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
        </div>
    );
}