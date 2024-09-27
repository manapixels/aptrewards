'use client'

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { U64, AccountAddress } from '@aptos-labs/ts-sdk';
import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { ArrowRight, ArrowRightLeft, Copy } from 'lucide-react';

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
import { Skeleton } from "@/components/ui/skeleton";
import CustomerEventListeners from '@/components/CustomerEventListeners';
import JoinProgram from './JoinProgram';
import { calculateExpirationDate } from '@/store/programStore';

const RewardsSummary = ({ loyaltyProgramId }: { loyaltyProgramId: string }) => {
    const { account } = useWallet();
    const [userDetails, setUserDetails] = useState<UserProgramDetails | null>(null);
    const [isFetchError, setIsFetchError] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchUserProgramDetails = async () => {
        if (!account?.address) return;

        if (isFetchError) { setIsFetchError(false); }

        try {
            const resource = await getAptosClient().view({
                payload: {
                    function: `${moduleAddress}::${moduleName}::get_user_program_details`,
                    functionArguments: [
                        new U64(parseInt(loyaltyProgramId)),
                        AccountAddress.fromString(account.address)
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

            const nextTier = tiers.find((tier: any) => Number(tier.points_required) > Number(points));

            const ownedVouchers = owned_vouchers?.data.map((voucher: any) => ({
                id: voucher?.value.id,
                name: voucher?.value.name,
                description: voucher?.value.description,
                expirationDate: calculateExpirationDate(
                    voucher?.value.redemption_expiration_timestamps?.data?.find((item: any) => item?.key == account?.address)?.value,
                    Number(voucher?.value.validity_days)
                ),
                termsAndConditions: voucher?.value.terms_and_conditions,
                imageUrl: voucher?.value.image_url,
                userVoucherCounts: voucher?.value.user_voucher_counts?.data?.find((item: any) => item?.key == account?.address)?.value
            })).filter((voucher: any) => voucher.userVoucherCounts !== "0");

            const userDetails: UserProgramDetails = {
                programId: program_id,
                programName: program_name,
                points: Number(points),
                lifetimePoints: Number(lifetime_points),
                pointValidityDays: Number(point_validity_days),
                ownedVouchers,
                allVouchers: all_vouchers?.data.map((voucher: any) => ({
                    id: voucher?.value.id,
                    name: voucher?.value.name,
                    description: voucher?.value.description,
                    validityDays: Number(voucher?.value.validity_days),
                    termsAndConditions: voucher?.value.terms_and_conditions,
                    imageUrl: voucher?.value.image_url,
                    pointsRequired: Number(voucher?.value.points_required),
                    maxRedemptions: Number(voucher?.value.max_redemptions),
                    totalRedemptions: Number(voucher?.value.total_redemptions),
                })),
                tiers: tiers.map((tier: any) => ({
                    id: Number(tier.id),
                    name: tier.name,
                    pointsRequired: Number(tier.points_required),
                    benefits: tier.benefits,
                    customerCount: tier.customer_count,
                })),
                currentTier: currentTier ? {
                    id: Number(currentTier.id),
                    name: currentTier.name,
                    pointsRequired: Number(currentTier.points_required),
                    benefits: currentTier.benefits,
                    customerCount: currentTier.customer_count,
                } : null,
                nextTier: nextTier ? {
                    id: Number(nextTier.id),
                    name: nextTier.name,
                    pointsRequired: Number(nextTier.points_required),
                    benefits: nextTier.benefits,
                    customerCount: nextTier.customer_count,
                } : null,
                pointsToNextTier: nextTier ? Number(nextTier.points_required) - Number(points) : null,
            };

            setUserDetails(userDetails);
        } catch (error) {
            console.error("Error fetching user program details:", error);
            // toast.error("Failed to fetch user program details");
            setIsFetchError(true);
        }
    };

    useEffect(() => {
        fetchUserProgramDetails();
    }, [loyaltyProgramId, account]);

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address).then(() => {
            toast.success('Address copied to clipboard');
        }).catch((error) => {
            console.error('Failed to copy address to clipboard:', error);
            toast.error('Failed to copy address to clipboard');
        });
    };

    const generateQRCodeData = () => {
        if (!account?.address || !userDetails) return '';

        const qrData = {
            programId: loyaltyProgramId,
            customer: account.address,
            // We're not including voucherId or name here as this QR code is for earning points, not redeeming
        };

        return JSON.stringify(qrData);
    };

    if (!userDetails && !isFetchError) {
        return (
            <div className="space-y-4 md:-mt-4">
                <div className="relative flex justify-center">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 justify-center md:justify-between">
                    <div className="flex flex-col md:block items-center">
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-6 w-36 mb-2" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-48 mt-1" />
                    </div>
                    <div className="flex flex-col w-full md:w-auto items-center gap-2 pt-4 md:pt-0 md:pl-8 border-t md:border-t-0 md:border-l border-gray-200">
                        <Skeleton className="h-6 w-40 mb-2" />
                        <Skeleton className="h-[150px] w-[150px]" />
                    </div>
                </div>
                <Skeleton className="h-[1px] w-full my-8" />
                <div className="flex justify-between items-center mb-4">
                    <Skeleton className="h-8 w-40" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((_, index) => (
                        <Skeleton key={index} className="h-24 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (isFetchError) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-lg aspect-square pattern-circle-tile flex flex-col items-center justify-center">
                <div className="bg-white px-4 py-10 rounded-lg">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Start earning points!</h1>
                    <p className="text-gray-600 mb-4">
                        Looks like you're not part of this program yet. Join now and start your journey to amazing perks and rewards.
                    </p>
                    <JoinProgram programId={loyaltyProgramId} onJoinSuccess={fetchUserProgramDetails} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:-mt-4">
            {userDetails && <CustomerEventListeners onUpdate={() => {
                fetchUserProgramDetails();
            }} />}

            <div className="overflow-hidden whitespace-nowrap bg-black text-gray-200 -mx-4 text-sm py-2 uppercase font-mono tracking-wider">
                <div className="animate-marquee inline-block">
                    10% additional point bonus until {formatDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000))} &nbsp; ... &nbsp;
                </div>
                <div className="animate-marquee inline-block">
                    10% additional point bonus until {formatDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000))} &nbsp; ... &nbsp;
                </div>
            </div>
            <div className="relative flex justify-center ">
                <div className="absolute top-[50%] translate-y-[-50%] left-0 border-t border-gray-200 w-full"></div>
                <div className="text-sm font-semibold text-gray-400 px-8 py-2 rounded-md tracking-widest bg-white relative z-10 font-mono uppercase">
                    {userDetails?.programName}
                </div>
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 justify-center md:justify-between">
                <div className="flex flex-col md:block items-center">
                    <div className="text-2xl text-gray-700 font-bold tracking-wider flex items-center gap-1">
                        {truncateAddress(account?.address)}
                        <Copy
                            className="w-4 h-4 stroke-gray-600 cursor-pointer"
                            onClick={() => handleCopyAddress(account?.address || '')}
                        />
                    </div>
                    <div className="flex flex-row items-center gap-2 text-[#ae7427] mt-1 mb-2">
                        <span className="text-lg font-semibold">{userDetails?.points?.toLocaleString()} points</span>
                        <div className="w-[1px] h-4 bg-[#ae7427]"></div>
                        <span className="text-lg font-semibold ">{userDetails?.currentTier?.name}</span>
                    </div>
                    {userDetails?.nextTier && (
                        <>
                            <div className="text-sm text-gray-600">Expiring {formatDate(new Date(Date.now() + Number(userDetails.pointValidityDays) * 24 * 60 * 60 * 1000).toLocaleDateString())}</div>
                            <div className="text-sm text-gray-600">{userDetails.pointsToNextTier?.toLocaleString()} more points to unlock {userDetails.nextTier?.name}</div>
                        </>
                    )}
                </div>
                <div className="flex flex-col w-full md:w-auto items-center gap-2 pt-4 md:pt-0 md:pl-8 border-t md:border-t-0 md:border-l border-gray-200">
                    <span className="text-lg font-semibold">Scan to earn points</span>
                    <QRCodeSVG value={generateQRCodeData()} size={150} />
                </div>
            </div>
            <hr className="my-8" />
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">My Vouchers <span className="bg-black text-gray-200 px-2 py-1 rounded-md font-mono text-sm">{userDetails?.ownedVouchers.length}</span></h2>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                            <span className="hidden md:block">Exchange for Vouchers</span>
                            <ArrowRight className="w-4 h-4 ml-1 hidden md:block" />
                            <ArrowRightLeft className="w-4 h-4 ml-1 block md:hidden" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Redeemable Vouchers</DialogTitle>
                            <DialogDescription>
                                Vouchers you can earn in this program.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {userDetails?.allVouchers?.map((voucher, index) => (
                                <RedeemableVoucherItem
                                    key={index}
                                    id={voucher.id}
                                    name={voucher.name}
                                    description={voucher.description}
                                    validityDays={voucher.validityDays}
                                    termsAndConditions={voucher.termsAndConditions}
                                    pointsRequired={voucher.pointsRequired}
                                    maxRedemptions={voucher.maxRedemptions}
                                    totalRedemptions={voucher.totalRedemptions}
                                    onExchangeSuccess={() => {
                                        fetchUserProgramDetails();
                                        setIsDialogOpen(false);
                                    }}
                                    programId={loyaltyProgramId}
                                />
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="space-y-4">
                {userDetails?.ownedVouchers && userDetails.ownedVouchers.length > 0 ? (
                    userDetails.ownedVouchers.map((voucher) => (
                        <MyVoucherItem
                            key={voucher.id}
                            userAddress={account?.address || ''}
                            programId={loyaltyProgramId}
                            id={voucher.id}
                            name={voucher.name}
                            description={voucher.description}
                            expirationDate={voucher.expirationDate}
                            termsAndConditions={voucher.termsAndConditions}
                        />
                    ))
                ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 mb-4">You don't have any vouchers yet.</p>
                        <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                            View Redeemable Vouchers
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RewardsSummary;