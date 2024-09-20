'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { MoveString, U64 } from '@aptos-labs/ts-sdk';
import { PlusIcon } from 'lucide-react';
import toast from 'react-hot-toast';

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
                <TableHead>Voucher Description</TableHead>
                <TableHead>Points Required</TableHead>
                <TableHead>Expiration Date</TableHead>
                <TableHead className="text-right">Redemptions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {vouchers?.map((voucher, index) => (
                <TableRow key={voucher.id}>
                    <TableCell className="font-medium">{voucher.description}</TableCell>
                    <TableCell>{voucher.pointsRequired.toLocaleString()}</TableCell>
                    <TableCell>{new Date(parseInt(voucher.expirationDate) * 1000).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{vouchersRedeemed?.[index] || 0}</TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);

export default function ProgramVouchers({ program }: { program: LoyaltyProgram }) {

    const { account, signAndSubmitTransaction } = useWallet();
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const { triggerRefetch, fetchProgramDetails, programs } = useProgramStore();
    const [isAddVoucherDialogOpen, setIsAddVoucherDialogOpen] = useState(false);
    const [newVoucher, setNewVoucher] = useState({
        description: '',
        pointsRequired: 0,
        expirationDate: ''
    });

    const handleAddVoucher = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setTransactionInProgress(true);
            if (!account) throw new Error("No account connected");
            if (!moduleAddress || !moduleName) throw new Error("No module address or name");

            const expirationTimepoint = Math.floor(new Date(newVoucher.expirationDate).getTime() / 1000);

            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::create_voucher`,
                    typeArguments: [],
                    functionArguments: [
                        new U64(parseInt(program.id)),
                        new MoveString(newVoucher.description),
                        new U64(newVoucher.pointsRequired),
                        new U64(expirationTimepoint),
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
                            <Label htmlFor="voucherExpirationDate">Expiration Date</Label>
                            <Input
                                id="voucherExpirationDate"
                                type="date"
                                value={newVoucher.expirationDate}
                                onChange={(e) => setNewVoucher({ ...newVoucher, expirationDate: e.target.value })}
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