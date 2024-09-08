'use client'

import { useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

const RedeemPage = () => {
    const [data, setData] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

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
        toast({
            title: "Error",
            description: "Failed to scan QR code. Please try again.",
            variant: "destructive",
        });
    };

    const handleRedeem = async () => {
        if (!data) return;

        try {
            const voucherData = JSON.parse(data);
            // TODO: Implement the actual redemption logic here
            console.log('Redeeming voucher:', voucherData);

            toast({
                title: "Success",
                description: `Voucher "${voucherData.name}" has been redeemed.`,
            });

            setData(null);
        } catch (error) {
            console.error('Failed to redeem voucher:', error);
            toast({
                title: "Error",
                description: "Failed to redeem voucher. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Redeem Voucher</h1>
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
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Scanned Voucher:</h2>
                            <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(JSON.parse(data), null, 2)}</pre>
                            <Button onClick={handleRedeem} className="mt-4">Redeem Voucher</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default RedeemPage;
