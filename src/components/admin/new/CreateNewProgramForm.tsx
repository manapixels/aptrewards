'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { FormControl, FormField, FormItem, FormLabel } from '../../ui/form';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { moduleAddress, moduleName } from '@/constants';
import { getAptosClient } from '@/utils/aptos';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useProgramStore } from '@/store/programStore';
import toast from 'react-hot-toast';

const initializeFormSchema = z.object({
    name: z.string().min(2).max(50),
    // luckySpinEnabled: z.boolean(),
    pointValidityDays: z.number().min(1).max(365),
})

export default function CreateNewProgramForm() {

    const router = useRouter();
    const { account, signAndSubmitTransaction } = useWallet();
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const triggerRefetch = useProgramStore((state) => state.triggerRefetch);

    const methods = useForm<z.infer<typeof initializeFormSchema>>({
        resolver: zodResolver(initializeFormSchema),
        defaultValues: {
            name: "",
            // luckySpinEnabled: true,
            pointValidityDays: 365,
        },
    })

    const handleSubmit = async (data: z.infer<typeof initializeFormSchema>) => {
        try {
            setTransactionInProgress(true);
            if (!account) throw new Error("No account connected");
            if (!moduleAddress || !moduleName) throw new Error("No module address or name");

            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::create_loyalty_program`,
                    typeArguments: [],
                    functionArguments: [data.name, data.pointValidityDays]
                },

            });

            // if (!programId) throw new Error("Program ID not found in transaction result");

            await getAptosClient().waitForTransaction({ transactionHash: response.hash }).then((response) => {
                // @ts-ignore
                const programId = response?.events?.find((event: any) => event?.data?.program_id)?.data?.program_id;
                
                // Trigger refetch in ProgramListSidebar
                triggerRefetch();

                setTimeout(() => {
                    router.push(`/admin/edit/${programId}`);
                }, 2000);
                
            });

            // Handle successful transaction
            setSuccess(true);
            toast.success('Loyalty program created successfully');

        } catch (error) {
            console.error('Error creating loyalty program:', error);
            toast.error('Error creating loyalty program');
        } finally {
            setTransactionInProgress(false);
        }
    };

    return (
        <div className="bg-slate-50 p-4 rounded-lg">
            <h2 className="text-lg font-bold mb-4">Create Loyalty Program</h2>

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
                    {/* <FormField
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
                    /> */}
                    <div className="mt-4 flex justify-end">
                        <Button type="submit" disabled={transactionInProgress || success} className={`${success ? "bg-green-500" : ""}`}>
                            {transactionInProgress ? 'Creating...' : success ? `${<Check />}${" "}Created` : 'Create'}
                        </Button>
                    </div>
                </form>
            </FormProvider>
        </div>
    );
}