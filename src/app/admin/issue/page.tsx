'use client'

import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAptosClient } from '@/utils/aptos';
import { moduleAddress, moduleName } from '@/constants';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const IssuePage = () => {
    const [data, setData] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [pointsToIssue, setPointsToIssue] = useState<number>(0);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    const { account, signAndSubmitTransaction } = useWallet();
    const client = getAptosClient();

    const startScanning = () => {
        setScanning(true);
        scannerRef.current = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );
        scannerRef.current.render(handleScan, handleError);
    };

    const stopScanning = () => {
        if (scannerRef.current) {
            scannerRef.current.clear();
        }
        setScanning(false);
    };

    const handleScan = (decodedText: string) => {
        setData(decodedText);
        stopScanning();
    };

    const handleError = (err: any) => {
        console.error(err);
        toast.error("Failed to scan QR code. Please try again.");
    };

    const handleIssuePoints = async () => {
        if (!account) throw new Error("No account connected");
        if (!data) throw new Error("No customer data");
        if (!moduleAddress || !moduleName) throw new Error("No module address or name");
        if (pointsToIssue <= 0) throw new Error("Invalid points amount");

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

            toast.success(`${pointsToIssue} points have been issued successfully.`);
            setData(null);
            setPointsToIssue(0);
        } catch (error) {
            console.error('Failed to issue points:', error);
            toast.error("Failed to issue points. Please try again.");
        }
    };

    const handleRedeemVoucher = async () => {
        if (!account) throw new Error("No account connected");
        if (!data) throw new Error("No voucher data");
        if (!moduleAddress || !moduleName) throw new Error("No module address or name");

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
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Issue Points & Redeem Vouchers</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Scan QR Code</CardTitle>
                </CardHeader>
                <CardContent>
                    {scanning ? (
                        <div className="mb-4">
                            <div id="reader" className="w-full"></div>
                            <Button onClick={stopScanning} className="mt-2">Cancel</Button>
                        </div>
                    ) : (
                        <Button onClick={startScanning} className="mb-4">Start Scanning</Button>
                    )}
                    {data && (
                        <Tabs defaultValue="issue" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="issue">Issue Points</TabsTrigger>
                                <TabsTrigger value="redeem">Redeem Voucher</TabsTrigger>
                            </TabsList>
                            <TabsContent value="issue">
                                <div>
                                    <h2 className="text-lg font-semibold mb-2">Scanned Customer Data:</h2>
                                    <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(JSON.parse(data), null, 2)}</pre>
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
                                    <Button onClick={handleIssuePoints} className="mt-4">Issue Points</Button>
                                </div>
                            </TabsContent>
                            <TabsContent value="redeem">
                                <div>
                                    <h2 className="text-lg font-semibold mb-2">Scanned Voucher Data:</h2>
                                    <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(JSON.parse(data), null, 2)}</pre>
                                    <Button onClick={handleRedeemVoucher} className="mt-4">Redeem Voucher</Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default IssuePage;
