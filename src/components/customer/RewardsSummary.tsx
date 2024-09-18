'use client'

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { U64, AccountAddress } from '@aptos-labs/ts-sdk';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

import { truncateAddress } from '@/utils/address';
import RedemptionItem from '@/components/customer/RedemptionItem';
import { getAptosClient } from '@/utils/aptos';
import { moduleAddress, moduleName } from "@/constants";
import { ArrowRight, Copy } from 'lucide-react';
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatDate } from '@/utils/dateFormatter';

interface UserProgramDetails {
    programName: string;
    userStamps: number;
    stampValidity: number;
    userTier: string;
    nextTier: string | null;
    stampsToNextTier: number | null;
    ownedCoupons: any[];
    allCoupons: any[];
}

const RewardsSummary = ({ loyaltyProgramId }: { loyaltyProgramId: string }) => {
    const { account } = useWallet();
    const [userDetails, setUserDetails] = useState<UserProgramDetails | null>(null);

    useEffect(() => {
        const fetchUserProgramDetails = async () => {
            if (!account?.address) return;

            try {
                const resource = await getAptosClient().view({
                    payload: {
                        function: `${moduleAddress}::${moduleName}::get_user_program_details`,
                        functionArguments: [
                            new U64(parseInt(loyaltyProgramId)),
                            AccountAddress.fromString('0x3eff8f929e7f170661d0cf17fb51a7a8726b91361d96b68be095639d5eff8db6')
                        ],
                    }
                });

                const [programName, userStamps, stampValidity, ownedCoupons, allCoupons, tiers] = resource as [string, number, number, any[], any[], any[]];

                const currentTier = tiers.reduce((prev, current) =>
                    userStamps >= current.stamps_required ? current : prev
                );

                const nextTier = tiers.find(tier => tier.stamps_required > userStamps);

                const userDetails: UserProgramDetails = {
                    programName,
                    userStamps,
                    stampValidity,
                    userTier: currentTier?.name || 'No Tier',
                    nextTier: nextTier?.name || null,
                    stampsToNextTier: nextTier ? nextTier.stamps_required - userStamps : null,
                    ownedCoupons,
                    allCoupons,
                };

                setUserDetails(userDetails);
            } catch (error) {
                console.error("Error fetching user program details:", error);
                toast.error("Failed to fetch user program details");
            }
        };

        fetchUserProgramDetails();
    }, [loyaltyProgramId, account]);

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        toast.success('Address copied to clipboard');
    };

    if (!userDetails) {
        return <div>Loading...</div>;
    }

    const redeemableCoupons = userDetails.allCoupons.filter(coupon => 
        !userDetails.ownedCoupons.some(owned => owned.id === coupon.id)
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
                        <span className="text-lg font-semibold">{userDetails.userStamps} stamps</span>
                        <div className="w-[1px] h-4 bg-green-600"></div>
                        <span className="text-lg font-semibold ">{userDetails.userTier}</span>
                    </div>
                    {userDetails.nextTier && (
                        <>
                            <div className="text-sm text-gray-600">Expiring {formatDate(new Date(Date.now() + Number(userDetails.stampValidity) * 24 * 60 * 60 * 1000).toLocaleDateString())}</div>
                            <div className="text-sm text-gray-600">{userDetails.stampsToNextTier} more points to unlock {userDetails.nextTier}</div>
                        </>
                    )}
                </div>
                <div className="flex flex-col items-center gap-2 pl-8 border-l border-gray-200">
                    <span className="text-lg font-semibold">Scan to earn stamps</span>
                    <QRCodeSVG value={account?.address || ''} size={150} />
                </div>
            </div>
            <hr className="my-8" />
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">My Coupons <span className="bg-black text-gray-200 px-2 py-1 rounded-md font-mono text-sm">{userDetails.ownedCoupons.length}</span></h2>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">View Redeemable Coupons <ArrowRight className="w-4 h-4 ml-1" /></Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Redeemable Coupons</DialogTitle>
                            <DialogDescription>
                                Coupons you can earn in this program.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {redeemableCoupons.map((coupon, index) => (
                                <RedemptionItem
                                    key={index}
                                    voucherId={coupon.id.toString()}
                                    name={coupon.description}
                                    description={`Requires ${coupon.stamps_required} stamps`}
                                    expiryDate={new Date(Number(coupon.expiration_date) * 1000).toLocaleDateString()}
                                    termsAndConditions={`Max redemptions: ${coupon.max_redemptions}, Current redemptions: ${coupon.redemptions}`}
                                />
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="space-y-4">
                {userDetails.ownedCoupons.map((coupon, index) => (
                    <RedemptionItem
                        key={index}
                        voucherId={coupon.id.toString()}
                        name={coupon.description}
                        description="Ready to use"
                        expiryDate={new Date(Number(coupon.expiration_date) * 1000).toLocaleDateString()}
                        termsAndConditions={`Max redemptions: ${coupon.max_redemptions}, Current redemptions: ${coupon.redemptions}`}
                    />
                ))}
            </div>
        </div>
    );
}

export default RewardsSummary;