'use client'

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { U64, AccountAddress } from '@aptos-labs/ts-sdk';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { ArrowRight, Copy } from 'lucide-react';

import RedeemableVoucherItem from '@/components/customer/RedeemableVoucherItem';
import MyVoucherItem from '@/components/customer/MyVoucherItem';
import { truncateAddress } from '@/utils/address';
import { getAptosClient } from '@/utils/aptos';
import { formatDate } from '@/utils/dateFormatter';
import { moduleAddress, moduleName } from "@/constants";
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { UserProgramDetails } from '@/types/aptrewards';

const RewardsSummary = ({ loyaltyProgramId }: { loyaltyProgramId: string }) => {
    const { account } = useWallet();
    const [userDetails, setUserDetails] = useState<UserProgramDetails | null>(null);

    const fetchUserProgramDetails = async () => {
        if (!account?.address) return;

        try {
            const resource = await getAptosClient().view({
                payload: {
                    function: `${moduleAddress}::${moduleName}::get_user_program_details`,
                    functionArguments: [
                        new U64(parseInt(loyaltyProgramId)),
                        AccountAddress.fromString('0x991d4766be3306bc138fcda1d3e4e1ebb2dd0858fc7932c1a273964a2e0e5718')
                    ],
                }
            });

            const { 
                program_id, 
                program_name, 
                points, 
                lifetime_points, 
                point_validity_days, 
                owned_vouchers, 
                all_vouchers, 
                tiers
            } = resource[0] as any;

            const currentTier = tiers.reduce((prev: any, current: any) =>
                points >= current.points_required ? current : prev
            );

            const nextTier = tiers.find((tier: any) => tier.points_required > points);

            const userDetails: UserProgramDetails = {
                programId: program_id,
                programName: program_name,
                points,
                pointValidityDays: point_validity_days,
                lifetimePoints: lifetime_points,
                ownedVouchers: owned_vouchers,
                allVouchers: all_vouchers,
                tiers,
                currentTier,
                nextTier,
                pointsToNextTier: nextTier ? nextTier.points_required - points : null,
            };

            setUserDetails(userDetails);
        } catch (error) {
            console.error("Error fetching user program details:", error);
            toast.error("Failed to fetch user program details");
        }
    };

    useEffect(() => {
        fetchUserProgramDetails();
    }, [loyaltyProgramId, account]);

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        toast.success('Address copied to clipboard');
    };

    if (!userDetails) {
        return <div>Loading...</div>;
    }

    const redeemableVouchers = userDetails.allVouchers.filter(voucher =>
        !userDetails.ownedVouchers.some(owned => owned.id === voucher.id)
    );

    return (
        <div className="space-y-4 -mt-4">
            <div className="relative flex justify-center ">
                <div className="absolute top-[50%] translate-y-[-50%] left-0 border-t border-gray-200 w-full"></div>
                <div className="text-sm font-semibold text-gray-400 px-8 py-2 rounded-md tracking-widest bg-white relative z-10 font-mono uppercase">
                    {userDetails.programName}
                </div>
            </div>
            <div className="flex items-center space-x-4 justify-between">
                <div>
                    <div className="text-2xl text-gray-700 font-bold tracking-wider flex items-center gap-1">
                        {truncateAddress(account?.address)}
                        <Copy
                            className="w-4 h-4 stroke-gray-600 cursor-pointer"
                            onClick={() => handleCopyAddress(account?.address || '')}
                        />
                    </div>
                    <div className="flex flex-row items-center gap-2 text-green-600 mt-1 mb-2">
                        <span className="text-lg font-semibold">{userDetails.points} points</span>
                        <div className="w-[1px] h-4 bg-green-600"></div>
                        <span className="text-lg font-semibold ">{userDetails.currentTier?.name}</span>
                    </div>
                    {userDetails.nextTier && (
                        <>
                            <div className="text-sm text-gray-600">Expiring {formatDate(new Date(Date.now() + Number(userDetails.pointValidityDays) * 24 * 60 * 60 * 1000).toLocaleDateString())}</div>
                            <div className="text-sm text-gray-600">{userDetails.pointsToNextTier} more points to unlock {userDetails.nextTier?.name}</div>
                        </>
                    )}
                </div>
                <div className="flex flex-col items-center gap-2 pl-8 border-l border-gray-200">
                    <span className="text-lg font-semibold">Scan to earn points</span>
                    <QRCodeSVG value={account?.address || ''} size={150} />
                </div>
            </div>
            <hr className="my-8" />
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">My Vouchers <span className="bg-black text-gray-200 px-2 py-1 rounded-md font-mono text-sm">{userDetails.ownedVouchers.length}</span></h2>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">Exchange for Vouchers <ArrowRight className="w-4 h-4 ml-1" /></Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Redeemable Vouchers</DialogTitle>
                            <DialogDescription>
                                Vouchers you can earn in this program.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {redeemableVouchers.map((voucher, index) => (
                                <RedeemableVoucherItem
                                    key={index}
                                    id={voucher.id}
                                    name={voucher.description}
                                    description={`Requires ${voucher.pointsRequired} points`}
                                    expirationDate={new Date(Number(voucher.expirationDate) * 1000).toLocaleDateString()}
                                    termsAndConditions={voucher.termsAndConditions}
                                    pointsRequired={voucher.pointsRequired}
                                    maxRedemptions={voucher.maxRedemptions}
                                    redemptions={voucher.redemptions}
                                    onExchangeSuccess={() => {
                                        // Refresh the user details
                                        fetchUserProgramDetails();
                                    }}
                                    programId={loyaltyProgramId}
                                />
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="space-y-4">
                {userDetails.ownedVouchers.map((voucher, index) => (
                    <MyVoucherItem
                        key={index}
                        id={voucher.id}
                        name={voucher.description}
                        description="Ready to use"
                        expirationDate={new Date(Number(voucher.expirationDate) * 1000).toLocaleDateString()}
                        termsAndConditions={voucher.termsAndConditions}
                    />
                ))}
            </div>
        </div>
    );
}

export default RewardsSummary;