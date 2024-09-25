import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState } from "react";

import { moduleAddress, moduleName } from '@/constants';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { getAptosClient } from "@/utils/aptos";

const JoinProgram = ({ programId, onJoinSuccess }: { programId: string, onJoinSuccess: () => void }) => {

    const { account, signAndSubmitTransaction } = useWallet();
    const [name, setName] = useState<string>('');
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const client = getAptosClient();

    const joinProgram = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!account?.address) return;
        if (!name) {
            toast.error('Please enter your name.');
            return;
        }

        try {
            setTransactionInProgress(true);
            const response = await signAndSubmitTransaction({
                sender: account.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::set_customer_name`,
                    typeArguments: [],
                    functionArguments: [
                        programId,
                        name
                    ],
                },
            });

            await client.waitForTransaction({ transactionHash: response.hash });

            toast.success(`You have joined the program successfully.`);
            onJoinSuccess(); // Call the callback function
            setIsOpen(false); // Close the dialog
        } catch (error) {
            console.error('Error joining program:', error);
            toast.error('Failed to join the program. Please try again.');
        } finally {
            setTransactionInProgress(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => setIsOpen(true)}>
                    Join now
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Join Program</DialogTitle>
                </DialogHeader>
                <form onSubmit={joinProgram}>
                    <Label htmlFor="name">
                        Name:
                        <Input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mb-2"
                            autoComplete="off"
                        />
                    </Label>
                    <div className="flex justify-end">
                        <Button type="submit" className="mt-2" disabled={transactionInProgress}>
                            {transactionInProgress ? 'Joining...' : 'Join'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default JoinProgram;
