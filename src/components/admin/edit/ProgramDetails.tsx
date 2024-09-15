'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Copy, PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { moduleAddress, moduleName } from '@/constants';
import { getAptosClient } from '@/lib/utils';
import { useProgramStore } from '@/store/programStore';
import { LoyaltyProgram } from '@/types/aptrewards';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { truncateAddress } from '@/utils/addressUtils';

const ProgramDetails = ({ program }: { program: LoyaltyProgram }) => {
    const { fetchProgramDetails, getTierForCustomer } = useProgramStore();

    useEffect(() => {
        if (program.id) {
            fetchProgramDetails(program.id);
        }
    }, [program.id]);

    const { toast } = useToast();
    const { account, signAndSubmitTransaction } = useWallet();
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const { triggerRefetch, programs, isFetchingOneProgram } = useProgramStore();
    const currProgram = programs.find(p => p.id === program.id);

    const [name, setName] = useState('');
    const [stampValidityDays, setStampValidityDays] = useState(0);

    const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
    const [isCustomersModalOpen, setIsCustomersModalOpen] = useState(false);

    useEffect(() => {
        if (currProgram) {
            setName(currProgram.name);
            setStampValidityDays(currProgram.stampValidityDays);
        }
    }, [currProgram]);

    const handleEditProgram = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setTransactionInProgress(true);
            if (!account) throw new Error("No account connected");
            if (!moduleAddress || !moduleName) throw new Error("No module address or name");

            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::edit_loyalty_program`,
                    typeArguments: [],
                    functionArguments: [
                        program.id,
                        name,
                        stampValidityDays,
                    ],
                },
            });

            await getAptosClient().waitForTransaction({ transactionHash: response.hash });

            triggerRefetch();
            fetchProgramDetails(program.id);

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
            setIsEditProgramOpen(false);
        }
    };

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        toast({
            title: 'Copied',
            description: 'Address copied to clipboard',
        });
    };

    const renderCustomersTable = () => {
        if (!currProgram || !currProgram.customers || !currProgram.customerStamps) return null;

        return (
            <ScrollArea className="h-[400px]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">#</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Stamps</TableHead>
                            <TableHead>Tier</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currProgram.customers.map((customer, index) => (
                            <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="flex items-center gap-1">
                                    {truncateAddress(customer)} 
                                    <Copy 
                                        className="w-4 h-4 stroke-gray-600 cursor-pointer" 
                                        onClick={() => handleCopyAddress(customer)} 
                                    />
                                </TableCell>
                                <TableCell>{currProgram.customerStamps[index] || 0}</TableCell>
                                <TableCell>{getTierForCustomer(currProgram, currProgram.customerStamps[index] || 0)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        );
    };

    return (
        <div className="bg-white shadow-sm border rounded-lg">
            <div className="flex justify-between items-center px-6 py-4 bg-gray-100">
                <h3 className="font-semibold">Details</h3>
                <Dialog open={isEditProgramOpen} onOpenChange={setIsEditProgramOpen}>
                    <DialogTrigger asChild>
                        <Button className="border-gray-600" variant="outline" size="sm">
                            <PencilIcon className="w-4 h-4 stroke-gray-600" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEditProgram}>
                            <Label htmlFor="name">
                                Name:
                                <Input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mb-2"
                                />
                            </Label>
                            <Label htmlFor="stampValidityDays">
                                Stamp Validity Days:
                                <Input
                                    type="number"
                                    id="stampValidityDays"
                                    value={stampValidityDays}
                                    onChange={(e) => setStampValidityDays(Number(e.target.value))}
                                    className="mb-2"
                                />
                            </Label>
                            <div className="flex justify-end">
                                <Button type="submit" className="mt-2" disabled={transactionInProgress}>
                                    {transactionInProgress ? 'Updating...' : 'Update'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="grid grid-cols-2 border">
                <button
                    onClick={() => setIsCustomersModalOpen(true)}
                    className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:px-8 sm:py-6 hover:bg-gray-100"
                >
                    <span className="text-xs text-muted-foreground">
                        Customers
                    </span>
                    <span className="text-lg font-bold leading-none sm:text-3xl">
                        {currProgram?.numCustomers || 'N/A'}
                    </span>
                </button>
                <div
                    className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:px-8 sm:py-6"
                >
                    <span className="text-xs text-muted-foreground">
                        Stamps Issued
                    </span>
                    <span className="text-lg font-bold leading-none sm:text-3xl">
                        {currProgram?.totalStampsIssued || 'N/A'}
                    </span>
                </div>
            </div>

            <Dialog open={isCustomersModalOpen} onOpenChange={setIsCustomersModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Customers</DialogTitle>
                    </DialogHeader>
                    {renderCustomersTable()}
                </DialogContent>
            </Dialog>

            <div className="px-6 py-4 text-sm">
                <div className="font-semibold">Options:</div>
                <ul className="list-disc pl-5">
                    <li>
                        <span className="text-gray-600">Stamp Validity Days:</span>
                        <span className="ml-1">{currProgram?.stampValidityDays || 'N/A'}</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}

export default ProgramDetails;
