import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Forward } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '@/utils/dateFormatter';
import { MyVoucher } from '@/types/aptrewards';

const MyVoucherItem: React.FC<MyVoucher> = ({
    id,
    name,
    description,
    expirationDate,
    termsAndConditions,
    imageUrl,
}) => {
    const [isRedeemOpen, setIsRedeemOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [transferAddress, setTransferAddress] = useState('');
    const [showQRCode, setShowQRCode] = useState(false);
    
    const handleTransfer = (e: React.FormEvent) => {
        e.preventDefault();
        // Implement transfer logic here
        console.log('Transferring to:', transferAddress);
        setIsTransferOpen(false);
        setTransferAddress('');
    };

    const handleRedeem = () => {
        setShowQRCode(true);
    };

    const qrCodeData = JSON.stringify({
        id,
        name,
        expirationDate
    });

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className="flex flex-col h-full">
                    <div className="flex flex-grow">
                        <div className="w-1/4 md:w-1/3 bg-gray-200 flex-shrink-0">
                            {imageUrl ? (
                                <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full patterned-placeholder"></div>
                            )}
                        </div>
                        <div className="flex-grow flex flex-col justify-center p-4">
                            <h3 className="font-bold text-lg">{name}</h3>
                            <p className="text-sm text-gray-500">Valid until {formatDate(Number(expirationDate))}</p>
                            <div className="mt-3 flex items-center">
                                <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="mr-2">
                                            <Forward className="h-4 w-4 mr-2" />
                                            Transfer
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Transfer Voucher</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleTransfer} className="space-y-4">
                                            <div>
                                                <Label htmlFor="transferAddress">Recipient Address</Label>
                                                <Input
                                                    id="transferAddress"
                                                    value={transferAddress}
                                                    onChange={(e) => setTransferAddress(e.target.value)}
                                                    placeholder="Enter recipient's address"
                                                />
                                            </div>
                                            <Button type="submit">Transfer</Button>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                                <Dialog open={isRedeemOpen} onOpenChange={(open) => {
                                    setIsRedeemOpen(open);
                                    if (!open) setShowQRCode(false);
                                }}>
                                    <DialogTrigger asChild>
                                        <Button variant="secondary" className="border border-gray-400" size="sm">Redeem</Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>{name}</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            {!showQRCode && (
                                                <>
                                                    {imageUrl && (
                                                        <div className="w-full h-48 bg-gray-200 patterned-placeholder flex items-center justify-center">
                                                            <img src={imageUrl} alt={name} className="max-w-full max-h-full object-contain" />
                                                        </div>
                                                    )}
                                                    {!imageUrl && <div className="w-full h-48 bg-gray-200 patterned-placeholder"></div>}
                                                    <p>{description}</p>
                                                    <p className="text-sm text-gray-500">Valid until {formatDate(expirationDate)}</p>
                                                    <Accordion type="single" collapsible>
                                                        <AccordionItem value="terms">
                                                            <AccordionTrigger>Terms and Conditions</AccordionTrigger>
                                                            <AccordionContent>
                                                                {termsAndConditions}
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    </Accordion>
                                                    <Button onClick={handleRedeem} className="w-full py-6">Redeem</Button>
                                                </>
                                            )}
                                            {showQRCode && (
                                                <div className="flex flex-col items-center space-y-4">
                                                    <QRCodeSVG value={qrCodeData} size={200} />
                                                    <p className="text-center">Show this QR code to staff for redemption</p>
                                                    <Button onClick={() => setShowQRCode(false)}>Back</Button>
                                                </div>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default MyVoucherItem;