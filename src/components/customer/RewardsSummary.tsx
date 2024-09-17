'use client'

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { U64, AccountAddress } from '@aptos-labs/ts-sdk';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

import { truncateAddress } from '@/utils/address';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RedemptionItem from '@/components/customer/RedemptionItem';
import { getAptosClient } from '@/utils/aptos';
import { moduleAddress, moduleName } from "@/constants";


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

    if (!userDetails) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-4 justify-between">
                <div>
                    <div className="text-xl font-bold">{userDetails.programName}</div>
                    <div className="text-red-500 text-lg">Current Points: {userDetails.userStamps}</div>
                    <div>(expiring in {userDetails.stampValidity} days)</div>
                    <div>Membership ID: {truncateAddress(account?.address)}</div>
                </div>
                <QRCodeSVG value={account?.address || ''} size={150} />
            </div>
            <hr className="my-8" />
            <Tabs defaultValue="status">
                <TabsList className="grid w-full grid-cols-3 p-0 h-auto">
                    <TabsTrigger value="status">Status</TabsTrigger>
                    <TabsTrigger value="owned-vouchers">
                        Owned Vouchers ({userDetails.ownedCoupons.length})
                    </TabsTrigger>
                    <TabsTrigger value="available-vouchers">
                        Available Vouchers ({userDetails.allCoupons.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="status">
                    <div className="text-center">
                        <div className="text-lg font-bold">Your Status: {userDetails.userTier}</div>
                        {userDetails.nextTier && (
                            <>
                                <div>(through {new Date(Date.now() + Number(userDetails.stampValidity) * 24 * 60 * 60 * 1000).toLocaleDateString()})</div>
                                <div className="text-xl">{userDetails.stampsToNextTier} more points</div>
                                <div>to unlock {userDetails.nextTier}</div>
                            </>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="owned-vouchers">
                    <div className="space-y-4">
                        {userDetails.ownedCoupons.map((coupon, index) => (
                            <RedemptionItem
                                key={index}
                                voucherId={coupon.id.toString()}
                                name={coupon.description}
                                description="Owned"
                                expiryDate={new Date(Number(coupon.expiration_date) * 1000).toLocaleDateString()}
                                termsAndConditions={`Max redemptions: ${coupon.max_redemptions}, Current redemptions: ${coupon.redemptions}`}
                            />
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="available-vouchers">
                    <div className="space-y-4">
                        {userDetails.allCoupons.map((coupon, index) => (
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
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default RewardsSummary;