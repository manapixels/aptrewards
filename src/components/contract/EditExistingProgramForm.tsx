'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { moduleAddress, moduleName } from '@/constants';
import { getAptosClient } from '@/lib/utils';
import { useProgramStore } from '@/store/programStore';
import TierManagement from './TierManagement';

export default function EditExistingProgramForm({ programId }: { programId: string }) {

    const { toast } = useToast();
    const { account, signAndSubmitTransaction } = useWallet();
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const { triggerRefetch, fetchProgramDetails, programs } = useProgramStore();
    const currProgram = programs.find(program => program.id === programId.toString());

    useEffect(() => {
        fetchProgramDetails(programId);
    }, [programId, fetchProgramDetails]);

    const handleSubmit = async (action: string, params: any) => {
        try {
            setTransactionInProgress(true);
            if (!account) throw new Error("No account connected");
            if (!moduleAddress || !moduleName) throw new Error("No module address or name");

            let functionName = '';
            let functionArguments = [];

            switch (action) {
                case 'setSpinProbabilities':
                    functionName = 'set_spin_probabilities';
                    functionArguments = [programId, [params.probability], [params.amount]];
                    break;
                case 'createCoupon':
                    functionName = 'create_coupon';
                    functionArguments = [
                        programId,
                        params.stampsRequired,
                        params.description,
                        params.isMonetary,
                        params.value,
                        Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days from now
                        1 // max_redemptions
                    ];
                    break;
                default:
                    throw new Error("Invalid action");
            }

            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::${functionName}`,
                    typeArguments: [],
                    functionArguments: functionArguments
                },
            });

            await getAptosClient().waitForTransaction({ transactionHash: response.hash });

            triggerRefetch();
            fetchProgramDetails(programId);

            toast({
                title: 'Success',
                description: 'Program updated successfully',
            });
        } catch (error) {
            console.error('Error updating program:', error);
            toast({
                title: 'Error',
                description: 'Error updating program',
                variant: 'destructive',
            });
        } finally {
            setTransactionInProgress(false);
        }
    };

    if (!currProgram) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white shadow-sm border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Set Spin Probabilities</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const probability = (e.target as any).probability.value;
                    const amount = (e.target as any).amount.value;
                    handleSubmit('setSpinProbabilities', { probability, amount });
                }}>
                    <Label htmlFor="probability">
                        Probability:
                        <Input
                            type="range"
                            name="probability"
                            min="0"
                            max="100"
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </Label>
                    <Input
                        type="number"
                        name="amount"
                        placeholder="Amount"
                        className="mt-2 p-2 border rounded w-full"
                    />
                    <Button type="submit" className="w-full mt-2" disabled={transactionInProgress}>
                        {transactionInProgress ? 'Updating...' : 'Set Spin Probabilities'}
                    </Button>
                </form>
            </div>

            <div className="bg-white shadow-sm border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Create Coupon</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const stampsRequired = (e.target as any).stampsRequired.value;
                    const description = (e.target as any).description.value;
                    const isMonetary = (e.target as any).isMonetary.checked;
                    const value = (e.target as any).value.value;
                    handleSubmit('createCoupon', { stampsRequired, description, isMonetary, value });
                }}>
                    <Label htmlFor="stampsRequired">
                        Stamps Required
                        <Input
                            type="number"
                            name="stampsRequired"
                            placeholder="Stamps Required"
                            className="mb-2"
                        />
                    </Label>
                    <Label htmlFor="description">
                        Description
                        <Input
                            type="text"
                            name="description"
                            placeholder="Description"
                            className="mb-2"
                        />
                    </Label>
                    <div className="flex items-center space-x-2 mb-2">
                        <Checkbox id="isMonetary" name="isMonetary" />
                        <Label htmlFor="isMonetary">Is Monetary</Label>
                    </div>
                    <Label htmlFor="value">
                        Value
                        <Input
                            type="number"
                            name="value"
                            placeholder="Value"
                            className="mb-2"
                        />
                    </Label>
                    <Button type="submit" className="w-full mt-2" disabled={transactionInProgress}>
                        {transactionInProgress ? 'Creating...' : 'Create Coupon'}
                    </Button>
                </form>
            </div>

            <TierManagement program={currProgram} />
        </div>
    );
}