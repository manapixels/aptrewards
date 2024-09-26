'use client'

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getAptosClient } from '@/utils/aptos';
import { moduleAddress, moduleName } from '@/constants';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2, QrCode } from 'lucide-react';
import Html5QrcodePlugin from '@/components/ui/Html5QrCodePlugin';


const AdminFrontend = () => {
    const [data, setData] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [pointsToIssue, setPointsToIssue] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<string>('issue');
    const [isFetching, setIsFetching] = useState(false);

    const { account, signAndSubmitTransaction } = useWallet();
    const client = getAptosClient();

    const handleScanSuccess = (decodedText: string) => {
        setData(decodedText);
        console.log('handleScanSuccess', decodedText);

        try {
            const parsedData = JSON.parse(decodedText);
            if (parsedData.voucherId !== undefined) {
                setActiveTab('redeem');
            } else {
                setActiveTab('issue');
            }
        } catch (error) {
            console.error('Failed to parse scanned data:', error);
            toast.error("Invalid QR code data. Please try again.");
        } finally {
            setScanning(false);
        }
    };

    const handleIssuePoints = async () => {
        if (!account) {
            toast.error("No account connected. Please connect your wallet.");
            return;
        }
        if (!data) {
            toast.error("No customer data. Please scan a QR code first.");
            return;
        }
        if (!moduleAddress || !moduleName) {
            toast.error("Module configuration is missing. Please check your setup.");
            return;
        }
        if (pointsToIssue <= 0) {
            toast.error("Invalid points amount. Please enter a positive number.");
            return;
        }

        setIsFetching(true);

        try {
            const customerData = JSON.parse(data);

            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::earn_points`,
                    typeArguments: [],
                    functionArguments: [
                        customerData.programId,
                        customerData.customer,
                        pointsToIssue
                    ],
                },
            });

            await client.waitForTransaction({ transactionHash: response.hash });

            toast.success(`${pointsToIssue} points have been issued successfully to ${customerData.customer}.`);
            setData(null);
            setPointsToIssue(0);
        } catch (error) {
            console.error('Failed to issue points:', error);
            toast.error("Failed to issue points. Please try again.");
        } finally {
            setIsFetching(false);
        }
    };

    const handleRedeemVoucher = async () => {
        if (!account) throw new Error("No account connected");
        if (!data) throw new Error("No voucher data");
        if (!moduleAddress || !moduleName) throw new Error("No module address or name");

        setIsFetching(true);

        try {
            const voucherData = JSON.parse(data);

            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::redeem_voucher`,
                    typeArguments: [],
                    functionArguments: [
                        voucherData.programId,
                        voucherData.customer,
                        voucherData.voucherId
                    ],
                },
            });

            await client.waitForTransaction({ transactionHash: response.hash });

            toast.success(`Voucher "${voucherData.name}" has been redeemed successfully.`);
            setData(null);
        } catch (error) {
            console.error('Failed to redeem voucher:', error);
            toast.error("Failed to redeem voucher. Please try again.");
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold mb-4">Issue Points & Redeem Vouchers</h1>
                <Button onClick={() => setScanning(true)} className="mb-4">
                    <QrCode className="w-4 h-4 mr-2" />Scan
                </Button>
            </div>
            <Card>
                <CardContent className="pt-6">
                    {scanning && (
                        <div className="mb-4">
                            <div id="reader" className="w-full"></div>
                            <Html5QrcodePlugin
                                fps={10}
                                qrbox={250}
                                disableFlip={false}
                                qrCodeSuccessCallback={handleScanSuccess}
                            />
                            <Button onClick={() => setScanning(false)} className="mt-2">Cancel</Button>
                        </div>
                    )}
                    {data && (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="issue">Issue Points</TabsTrigger>
                                <TabsTrigger value="redeem">Redeem Voucher</TabsTrigger>
                            </TabsList>
                            <div className="p-4">
                                <TabsContent value="issue">
                                    <div>
                                        <h2 className="text-lg font-semibold mb-2">Scanned Customer Data:</h2>
                                        <ScrollArea className="w-full rounded-md border">
                                            <pre className="p-4">{JSON.stringify(JSON.parse(data), null, 2)}</pre>
                                            <ScrollBar orientation="horizontal" />
                                        </ScrollArea>
                                        <div className="mt-4">
                                            <label htmlFor="points" className="block text-sm font-medium text-gray-700">
                                                Points to Issue
                                            </label>
                                            <Input
                                                type="number"
                                                id="points"
                                                value={pointsToIssue}
                                                onChange={(e) => setPointsToIssue(Number(e.target.value))}
                                                className="mt-1"
                                            />
                                        </div>
                                        <Button onClick={handleIssuePoints} className="mt-4 w-full py-4 h-auto" disabled={isFetching}>
                                            {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Issue Points
                                        </Button>
                                    </div>
                                </TabsContent>
                                <TabsContent value="redeem">
                                    <div>
                                        <h2 className="text-lg font-semibold mb-2">Scanned Voucher Data:</h2>
                                        <ScrollArea className="w-full rounded-md border">
                                            <pre className="p-4">{JSON.stringify(JSON.parse(data), null, 2)}</pre>
                                            <ScrollBar orientation="horizontal" />
                                        </ScrollArea>
                                        <Button onClick={handleRedeemVoucher} className="mt-4 w-full py-4 h-auto" disabled={isFetching}>
                                            {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Redeem Voucher
                                        </Button>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminFrontend;
