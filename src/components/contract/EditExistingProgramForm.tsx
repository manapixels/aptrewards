'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';

export default function EditExistingProgramForm() {
    const [message, setMessage] = useState('');

    const handleSubmit = async (action: string, params: any) => {
        setMessage('Processing...');

        try {
            const response = await fetch('/api/loyalty', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action, ...params }),
            });

            const data = await response.json();
            setMessage(`Success! ${data.transactionHash ? `Transaction Hash: ${data.transactionHash}` :
                data.tier ? `Tier: ${data.tier}` :
                    data.initialized !== undefined ? `Initialized: ${data.initialized}` :
                        JSON.stringify(data)}`);
        } catch (error) {
            setMessage(`Error performing action: ${error}`);
        }
    };

    return (
        <div>
            <div className="bg-white shadow-md rounded-lg p-4">
                <h3 className="font-semibold mb-2">Set Spin Probabilities</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const probability = (e.target as any).probability.value;
                    const amount = (e.target as any).amount.value;
                    handleSubmit('setSpinProbabilities', { probability, amount });
                }}>
                    <Label htmlFor="probability">
                        Probability:
                        <input
                            type="range"
                            name="probability"
                            min="0"
                            max="100"
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </Label>
                    <input
                        type="number"
                        name="amount"
                        placeholder="Amount"
                        className="mt-2 p-2 border rounded w-full"
                    />
                    <Button type="submit" className="w-full mt-2">Set Spin Probabilities</Button>
                </form>
            </div>

            <div className="bg-white shadow-md rounded-lg p-4">
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
                    <Button type="submit" className="w-full mt-2">Create Coupon</Button>
                </form>
            </div>

            <div className="bg-white shadow-md rounded-lg p-4">
                <h3 className="font-semibold mb-2">Set Tier Thresholds</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const bronzeThreshold = (e.target as any).bronzeThreshold.value;
                    const silverThreshold = (e.target as any).silverThreshold.value;
                    const goldThreshold = (e.target as any).goldThreshold.value;
                    handleSubmit('setTierThresholds', { bronzeThreshold, silverThreshold, goldThreshold });
                }}>
                    <Label htmlFor="bronzeThreshold">
                        Bronze Threshold
                        <Input
                            type="number"
                            name="bronzeThreshold"
                            placeholder="Bronze Threshold"
                            className="mb-2"
                        />
                    </Label>
                    <Label htmlFor="silverThreshold">
                        Silver Threshold
                        <Input
                            type="number"
                            name="silverThreshold"
                            placeholder="Silver Threshold"
                            className="mb-2"
                        />
                    </Label>
                    <Label htmlFor="goldThreshold">
                        Gold Threshold
                        <Input
                            type="number"
                            name="goldThreshold"
                            placeholder="Gold Threshold"
                            className="mb-2"
                        />
                    </Label>
                    <Button type="submit" className="w-full mt-2">Set Tier Thresholds</Button>
                </form>
            </div>

            <p className="text-sm bg-white p-4 rounded-lg shadow-md mt-4">{message}</p>
        </div>
    );
}