'use client'

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { truncateAddress } from '@/utils/addressUtils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const RewardsSummary = ({ loyaltyProgramId }: { loyaltyProgramId: string }) => {
    const { account } = useWallet();

    useEffect(() => {
        console.log(loyaltyProgramId)
    }, [loyaltyProgramId])

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-4 justify-between">
                <div>
                    <img src="/path/to/rewards-card-image.jpg" alt="" className="w-24 h-24" />
                    <div className="text-xl font-bold">Mr. Beelzeloo</div>
                    <div className="text-red-500 text-lg">Current Points: 5</div>
                    <div>(expiring on 25 Aug 2025)</div>
                    <div>Membership ID: {truncateAddress(account?.address)}</div>
                </div>
                <QRCodeSVG value={account?.address || ''} size={150} />
            </div>
            <hr className="my-4" />
            <Tabs defaultValue="card">
                <TabsList className="grid w-full grid-cols-2 p-0 h-auto">
                    <TabsTrigger value="card" className="text-lg px-12 py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-gray-800">Card</TabsTrigger>
                    <TabsTrigger value="vouchers" className="text-lg px-12 py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-gray-800"><span className="font-bold text-red-500 pr-1">3</span>Vouchers</TabsTrigger>
                </TabsList>
                <TabsContent value="card">
                    <div className="text-center">
                        <div className="text-lg font-bold">Your Status</div>
                        <div>(through 25 Aug 2024)</div>
                        <div className="text-xl">5/1000 points</div>
                        <div>to unlock next level</div>
                    </div>
                </TabsContent>
                <TabsContent value="vouchers">Change your password here.</TabsContent>
            </Tabs>
        </div>
    );
}

export default RewardsSummary;