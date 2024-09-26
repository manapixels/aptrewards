import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
    validityDays,
    termsAndConditions,
    imageUrl,
    pointsRequired,
    maxRedemptions,
    totalRedemptions,
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
                            <p className="text-sm text-gray-500">Valid for {validityDays} days</p>
                            <p className="text-sm text-gray-500">{pointsRequired.toLocaleString()} points required</p>
                            <p className="text-sm text-gray-500">Redemptions: {totalRedemptions} / {maxRedemptions}</p>
                            <div className="mt-3 flex items-center">
                                <Dialog open={isExchangeOpen} onOpenChange={setIsExchangeOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">View Details</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{name}</DialogTitle>
                                        </DialogHeader>
                                        <div className="mt-2">
                                            <p>{description}</p>
                                            <p className="text-sm text-gray-500">Valid for {validityDays} days</p>
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
                                                className="w-full mt-4 py-2"
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