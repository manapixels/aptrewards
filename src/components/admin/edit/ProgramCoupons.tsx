'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { MoveString, U64 } from '@aptos-labs/ts-sdk';
import { PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { moduleAddress, moduleName } from '@/constants';
import { getAptosClient } from '@/lib/utils';
import { useProgramStore } from '@/store/programStore';
import { Coupon, Tier } from '@/types/aptrewards';
import { LoyaltyProgram } from "@/types/aptrewards";


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

export default function ProgramCoupons({ program }: { program: LoyaltyProgram }) {

    const { toast } = useToast();
    const { account, signAndSubmitTransaction } = useWallet();
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const { triggerRefetch, fetchProgramDetails, programs } = useProgramStore();
    const [isAddCouponDialogOpen, setIsAddCouponDialogOpen] = useState(false);
    const [newCoupon, setNewCoupon] = useState({
        description: '',
        stampsRequired: 0,
        expirationDate: ''
    });

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
                        new U64(parseInt(program.id)),
                        new MoveString(newCoupon.description),
                        new U64(newCoupon.stampsRequired),
                        new U64(expirationTimestamp),
                    ],
                },
            });

            await getAptosClient().waitForTransaction({ transactionHash: response.hash });

            triggerRefetch();
            fetchProgramDetails(program.id);

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

    useEffect(() => {
        fetchProgramDetails(program.id);
    }, [program.id]);

    return (
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
                                onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                                className="mb-2"
                            />
                            <Label htmlFor="couponStampsRequired">Stamps Required</Label>
                            <Input
                                id="couponStampsRequired"
                                type="number"
                                value={newCoupon.stampsRequired}
                                onChange={(e) => setNewCoupon({ ...newCoupon, stampsRequired: parseInt(e.target.value) })}
                                className="mb-2"
                            />
                            <Label htmlFor="couponExpirationDate">Expiration Date</Label>
                            <Input
                                id="couponExpirationDate"
                                type="date"
                                value={newCoupon.expirationDate}
                                onChange={(e) => setNewCoupon({ ...newCoupon, expirationDate: e.target.value })}
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
                coupons={program?.coupons}
                couponsRedeemed={program?.coupons?.map(coupon => coupon.redemptions) || []}
            />
        </div>
    )

}