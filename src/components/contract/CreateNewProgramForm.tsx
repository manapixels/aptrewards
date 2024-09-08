'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { getAptosClient } from '@/lib/utils';
import { useToast } from '../ui/use-toast';

const initializeFormSchema = z.object({
    name: z.string().min(2).max(50),
    luckySpinEnabled: z.boolean(),
})

const aptosClient = getAptosClient();
const moduleAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const moduleName = process.env.NEXT_PUBLIC_CONTRACT_NAME;

const checkFactoryInitialized = async (address: string): Promise<boolean> => {
    return aptosClient
        .view({
            payload: {
                function: `${moduleAddress}::${moduleName}::is_factory_initialized`,
                functionArguments: [address],
            },
        })
        .then((response) => {
            return response[0] as boolean;
        });
};


export default function CreateNewProgramForm() {

    const { toast } = useToast();
    const { account, signAndSubmitTransaction } = useWallet();
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);

    const isFactoryInitialized = () => {
        if (!account) return false;
        checkFactoryInitialized(account?.address).then((response) => {
            return response;
        });
    }

    const methods = useForm<z.infer<typeof initializeFormSchema>>({
        resolver: zodResolver(initializeFormSchema),
        defaultValues: {
            name: "",
            luckySpinEnabled: true,
        },
    })

    const handleSubmit = async (data: z.infer<typeof initializeFormSchema>) => {
        setTransactionInProgress(true);
        try {
            if (!account) throw new Error("No account connected");
            if (!moduleAddress || !moduleName) throw new Error("No module address or name");

            await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::create_loyalty_program`,
                    typeArguments: [],
                    functionArguments: [data.name, data.luckySpinEnabled]
                },

            });

            // Handle successful transaction (e.g., show a success message)
            setSuccess(true);
            toast({
                title: 'Success',
                description: 'Loyalty program created successfully',
            });
        } catch (error) {
            console.error('Error creating loyalty program:', error);
            // Handle error (e.g., show an error message to the user)
            toast({
                title: 'Error',
                description: 'Error creating loyalty program',
            });
        } finally {
            setTransactionInProgress(false);
        }
    };

    const initializeFactory = async () => {
        setTransactionInProgress(true);
        try {
            if (!account) throw new Error("No account connected");
            if (!moduleAddress || !moduleName) throw new Error("No module address or name");

            await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::initialize_factory`,
                    typeArguments: [],
                    functionArguments: []
                },
            });
        } catch (error) {
            console.error('Error creating loyalty program:', error);
            // Handle error (e.g., show an error message to the user)
            toast({
                title: 'Error',
                description: 'Error creating loyalty program',
            });
        } finally {
            setTransactionInProgress(false);
        }

    }

    return (
        <div className="bg-slate-50 p-4 rounded-lg">
            <h2 className="text-lg font-bold mb-4">Create Loyalty Program</h2>

            {isFactoryInitialized() ? (
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(handleSubmit)} className="p-2 bg-white rounded-lg">
                        <FormField
                            control={methods.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Brand name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <div className="mt-2">
                            <FormLabel>Features</FormLabel>
                        </div>
                        <FormField
                            control={methods.control}
                            name="luckySpinEnabled"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 border p-4 rounded-md flex items-center gap-2" htmlFor="luckySpinEnabled">
                                        <FormControl>
                                            <Checkbox
                                                id="luckySpinEnabled"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>

                                        Spin for rewards
                                    </FormLabel>
                                </FormItem>
                            )}
                        />
                        <div className="mt-4 flex justify-end">
                            <Button type="submit" disabled={transactionInProgress}>
                                {transactionInProgress ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            ) : (
                <div>
                    <Button onClick={initializeFactory}>Initialize Loyalty Program Contract</Button>
                </div>
            )}
        </div>
    );
}