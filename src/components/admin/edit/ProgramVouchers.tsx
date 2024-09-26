'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { MoveString, U64 } from '@aptos-labs/ts-sdk';
import { PlusIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Skeleton } from "@/components/ui/skeleton";

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { moduleAddress, moduleName } from '@/constants';
import { getAptosClient } from '@/utils/aptos';
import { useProgramStore } from '@/store/programStore';
import { RedeemableVoucher } from '@/types/aptrewards';
import { LoyaltyProgram } from "@/types/aptrewards";


const VoucherRedemptionsTable = ({ vouchers, vouchersRedeemed }: { vouchers: RedeemableVoucher[] | undefined, vouchersRedeemed: number[] | undefined }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Voucher Name</TableHead>
                <TableHead>Voucher Description</TableHead>
                <TableHead>Points Required</TableHead>
                <TableHead>Validity (Days)</TableHead>
                <TableHead className="text-right">Redemptions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {vouchers?.map((voucher, index) => (
                <TableRow key={voucher.id}>
                    <TableCell className="font-medium">{voucher.name}</TableCell>
                    <TableCell className="font-medium">{voucher.description}</TableCell>
                    <TableCell>{voucher.pointsRequired.toLocaleString()}</TableCell>
                    <TableCell>{voucher.validityDays}</TableCell>
                    <TableCell className="text-right">{vouchersRedeemed?.[index] || 0}</TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);

export default function ProgramVouchers({ program, isLoading }: { program: LoyaltyProgram, isLoading: boolean }) {

    const { account, signAndSubmitTransaction } = useWallet();
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const { triggerRefetch, fetchProgramDetails, programs } = useProgramStore();
    const [isAddVoucherDialogOpen, setIsAddVoucherDialogOpen] = useState(false);
    const [newVoucher, setNewVoucher] = useState({
        name: '',
        description: '',
        pointsRequired: 0,
        validityDays: 0,
        maxRedemptions: 0,
        termsAndConditions: ''
    });

    const handleAddVoucher = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setTransactionInProgress(true);
            if (!account) throw new Error("No account connected");
            if (!moduleAddress || !moduleName) throw new Error("No module address or name");

            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::create_voucher`,
                    typeArguments: [],
                    functionArguments: [
                        new U64(parseInt(program.id)),
                        new MoveString(newVoucher.name),
                        new MoveString(newVoucher.description),
                        new U64(newVoucher.pointsRequired),
                        new U64(newVoucher.validityDays),
                        new U64(newVoucher.maxRedemptions),
                        new MoveString(newVoucher.termsAndConditions),
                    ],
                },
            });

            await getAptosClient().waitForTransaction({ transactionHash: response.hash });

            triggerRefetch();
            fetchProgramDetails(program.id);

            toast.success('Voucher created successfully');
        } catch (error) {
            console.error('Error creating voucher:', error);
            toast.error('Error creating voucher');
        } finally {
            setTransactionInProgress(false);
            setIsAddVoucherDialogOpen(false);
        }
    };

    useEffect(() => {
        fetchProgramDetails(program.id);
    }, [program.id]);

    const renderSkeletons = () => (
        <div className="bg-white shadow-sm border rounded-lg">
            <div className="flex justify-between items-center px-6 py-4 bg-gray-100">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-8" />
            </div>
            <div className="p-4">
                <div className="flex items-center space-x-4 py-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
                {[...Array(3)].map((_, index) => (
                    <div key={index} className="flex items-center space-x-4 py-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                ))}
            </div>
        </div>
    );

    if (isLoading) {
        return renderSkeletons();
    }

    return (
        <div className="bg-white shadow-sm border rounded-lg">
            <div className="flex justify-between items-center px-6 py-4 bg-gray-100">
                <h3 className="font-semibold">Vouchers</h3>
                <Dialog open={isAddVoucherDialogOpen} onOpenChange={setIsAddVoucherDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-gray-500">
                            <PlusIcon className="w-4 h-4 stroke-gray-500" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Voucher</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddVoucher}>
                            <Label htmlFor="voucherName">Name</Label>
                            <Input
                                id="voucherName"
                                value={newVoucher.name}
                                onChange={(e) => setNewVoucher({ ...newVoucher, name: e.target.value })}
                                className="mb-2"
                            />
                            <Label htmlFor="voucherDescription">Description</Label>
                            <Input
                                id="voucherDescription"
                                value={newVoucher.description}
                                onChange={(e) => setNewVoucher({ ...newVoucher, description: e.target.value })}
                                className="mb-2"
                            />
                            <Label htmlFor="voucherPointsRequired">Points Required</Label>
                            <Input
                                id="voucherPointsRequired"
                                type="number"
                                value={newVoucher.pointsRequired}
                                onChange={(e) => setNewVoucher({ ...newVoucher, pointsRequired: parseInt(e.target.value) })}
                                className="mb-2"
                            />
                            <Label htmlFor="voucherValidityDays">Validity (Days)</Label>
                            <Input
                                id="voucherValidityDays"
                                type="number"
                                value={newVoucher.validityDays}
                                onChange={(e) => setNewVoucher({ ...newVoucher, validityDays: parseInt(e.target.value) })}
                                className="mb-2"
                            />
                            <Label htmlFor="voucherMaxRedemptions">Max Redemptions</Label>
                            <Input
                                id="voucherMaxRedemptions"
                                type="number"
                                value={newVoucher.maxRedemptions}
                                onChange={(e) => setNewVoucher({ ...newVoucher, maxRedemptions: parseInt(e.target.value) })}
                                className="mb-2"
                            />
                            <Label htmlFor="voucherTermsAndConditions">Terms and Conditions</Label>
                            <Input
                                id="voucherTermsAndConditions"
                                value={newVoucher.termsAndConditions}
                                onChange={(e) => setNewVoucher({ ...newVoucher, termsAndConditions: e.target.value })}
                                className="mb-2"
                            />
                            <div className="flex justify-end">
                                <Button type="submit" disabled={transactionInProgress}>
                                    {transactionInProgress ? 'Creating...' : 'Create Voucher'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            <VoucherRedemptionsTable
                vouchers={program?.vouchers}
                vouchersRedeemed={program?.vouchers?.map(voucher => voucher.redemptions) || []}
            />
        </div>
    )

}