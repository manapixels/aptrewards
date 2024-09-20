import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatDate } from '@/utils/dateFormatter';
import { RedeemableVoucher } from '@/types/aptrewards';
import { moduleAddress, moduleName } from '@/constants';
import { getAptosClient } from '@/utils/aptos';
import { U64 } from '@aptos-labs/ts-sdk';
import toast from 'react-hot-toast';

interface RedeemableVoucherItemProps extends RedeemableVoucher {
    onExchangeSuccess: () => void;
    programId: string;
}

const RedeemableVoucherItem: React.FC<RedeemableVoucherItemProps> = ({
    id,
    name,
    description,
    expirationDate,
    termsAndConditions,
    imageUrl,
    pointsRequired,
    maxRedemptions,
    redemptions,
    onExchangeSuccess,
    programId
}) => {
    const [isExchangeOpen, setIsExchangeOpen] = useState(false);
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const { account, signAndSubmitTransaction } = useWallet();

    const handleExchange = async () => {
        if (!account) {
            toast.error("No account connected");
            return;
        }

        try {
            setTransactionInProgress(true);

            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::exchange_points_for_voucher`,
                    typeArguments: [],
                    functionArguments: [
                        new U64(parseInt(programId)),
                        new U64(parseInt(id))
                    ],
                },
            });

            await getAptosClient().waitForTransaction({ transactionHash: response.hash });

            toast.success("Voucher exchanged successfully");
            onExchangeSuccess(); // Callback to refresh the voucher list or update the UI
            setIsExchangeOpen(false);
        } catch (error) {
            console.error("Error exchanging voucher:", error);
            toast.error("Failed to exchange voucher");
        } finally {
            setTransactionInProgress(false);
        }
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
                            <p className="text-sm text-gray-500">Valid until {formatDate(expirationDate)}</p>
                            <p className="text-sm text-gray-500">{pointsRequired} points required</p>
                            <div className="mt-3 flex items-center">
                                <Dialog open={isExchangeOpen} onOpenChange={setIsExchangeOpen}>
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
                                            <p className="text-sm text-gray-500">Valid until {formatDate(expirationDate)}</p>
                                            <Accordion type="single" collapsible>
                                                <AccordionItem value="terms">
                                                    <AccordionTrigger>Terms and Conditions</AccordionTrigger>
                                                    <AccordionContent>
                                                        {termsAndConditions}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                            <Button 
                                                onClick={handleExchange} 
                                                className="w-full py-6"
                                                disabled={transactionInProgress}
                                            >
                                                {transactionInProgress ? 'Exchanging...' : 'Exchange'}
                                            </Button>
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