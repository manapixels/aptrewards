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

interface RedeemableVoucherItemProps {
    name: string;
    description: string;
    expiryDate: string;
    termsAndConditions: string;
    imageUrl?: string;
    voucherId: string; // Add this prop for unique voucher identification
}

const RedeemableVoucherItem: React.FC<RedeemableVoucherItemProps> = ({
    name,
    description,
    expiryDate,
    termsAndConditions,
    imageUrl,
    voucherId
}) => {
    const [isExchangeOpen, setIsExchangeOpen] = useState(false);

    const handleExchange = () => {

    };

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className="flex flex-col h-full">
                    <div className="flex flex-grow">
                        <div className="w-1/3 bg-gray-200 flex-shrink-0">
                            {imageUrl ? (
                                <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full patterned-placeholder"></div>
                            )}
                        </div>
                        <div className="flex-grow flex flex-col justify-center p-4">
                            <h3 className="font-bold text-lg">{name}</h3>
                            <p className="text-sm text-gray-500">Valid until {formatDate(expiryDate)}</p>
                            <div className="mt-3 flex items-center">
                                <Dialog open={isExchangeOpen} onOpenChange={(open) => {
                                    setIsExchangeOpen(open);
                                }}>
                                    <DialogTrigger asChild>
                                        <Button variant="secondary" className="border border-gray-400" size="sm">Redeem</Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>{name}</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            {imageUrl && (
                                                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                                                    <img src={imageUrl} alt={name} className="max-w-full max-h-full object-contain" />
                                                </div>
                                            )}
                                            {!imageUrl && <div className="w-full h-48 bg-gray-200"></div>}
                                            <p>{description}</p>
                                            <p className="text-sm text-gray-500">Valid until {formatDate(expiryDate)}</p>
                                            <Accordion type="single" collapsible>
                                                <AccordionItem value="terms">
                                                    <AccordionTrigger>Terms and Conditions</AccordionTrigger>
                                                    <AccordionContent>
                                                        {termsAndConditions}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                            <Button onClick={handleExchange} className="w-full py-6">Exchange</Button>
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

export default RedeemableVoucherItem;