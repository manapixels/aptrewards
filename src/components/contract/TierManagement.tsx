import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { LoyaltyProgram, Tier } from '@/types/aptrewards';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { moduleAddress, moduleName } from '@/constants';
import { getAptosClient } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useProgramStore } from '@/store/programStore';

export default function TierManagement({ program } : { program: LoyaltyProgram | undefined} ) {
    const { account, signAndSubmitTransaction } = useWallet();
    const { toast } = useToast();
    const { fetchProgramDetails } = useProgramStore();

    const handleSubmit = async (action: 'add' | 'edit' | 'remove', tier: Tier) => {
        try {
            if (!account) throw new Error("No account connected");
            if (!program?.id) throw new Error("No program id found")

            const response = await signAndSubmitTransaction({
                sender: account?.address,
                data: {
                    function: `${moduleAddress}::${moduleName}::${action}_tier`,
                    typeArguments: [],
                    functionArguments: [
                        program?.id,
                        action === 'remove' ? tier.id : tier.name,
                        action === 'remove' ? undefined : tier.description,
                        action === 'remove' ? undefined : tier.stampsRequired,
                    ].filter(arg => arg !== undefined),
                },
            });
            await getAptosClient().waitForTransaction({ transactionHash: response.hash });

            toast({
                title: 'Success',
                description: `${<span className="capitalize">{action}</span>} tier successfully`,
            });

            fetchProgramDetails(program.id);
        } catch (error) {
            console.error(`Error: ${action} tier:`, error);
            toast({
                title: 'Error',
                description: `Failed to ${action} tier`,
                variant: 'destructive',
            });
        }
    };

    if (!program) {
        return <div>Loading...</div>;
    }

    return (
        <div className="bg-white shadow-sm border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Manage Tiers</h3>

            {/* Display existing tiers */}
            {program?.tiers?.map((tier: Tier) => (
                <div key={tier.id} className="mb-4 p-4 border rounded">
                    <h4 className="font-medium">{tier.name}</h4>
                    <p>{tier.description}</p>
                    <p>Stamps required: {tier.stampsRequired}</p>
                    <div className="mt-2">
                        <Button onClick={() => handleSubmit('edit', tier)} className="mr-2">Edit</Button>
                        <Button onClick={() => handleSubmit('remove', tier)} variant="destructive">Remove</Button>
                    </div>
                </div>
            ))}

            {/* Form to add new tier */}
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const newTier: Tier = {
                    id: 0,
                    name: formData.get('tierName') as string,
                    description: formData.get('tierDescription') as string,
                    stampsRequired: parseInt(formData.get('tierStampsRequired') as string),
                };
                handleSubmit('add', newTier);
            }} className="mt-4">
                <Label htmlFor="tierName">Tier Name</Label>
                <Input
                    id="tierName"
                    name="tierName"
                    className="mb-2"
                />
                <Label htmlFor="tierDescription">Description</Label>
                <Input
                    id="tierDescription"
                    name="tierDescription"
                    className="mb-2"
                />
                <Label htmlFor="tierStampsRequired">Stamps Required</Label>
                <Input
                    id="tierStampsRequired"
                    name="tierStampsRequired"
                    type="number"
                    className="mb-2"
                />
                <Button type="submit">Add Tier</Button>
            </form>
        </div>
    );
}