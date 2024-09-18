'use client';

import { useState } from 'react';

export default function CustomerPanel() {
    const [action, setAction] = useState('earnStamps');
    const [params, setParams] = useState({});
    const [message, setMessage] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
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
            setMessage(`Success! ${data.transactionHash ? `Transaction Hash: ${data.transactionHash}` : `Tier: ${data.tier}`}`);
        } catch (error) {
            setMessage(`Error performing action: ${error}`);
        }
    }

    return (
        <div>
            <h2>Customer Panel</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    Action:
                    <select value={action} onChange={(e) => setAction(e.target.value)}>
                        <option value="earnStamps">Earn Stamps</option>
                        <option value="redeemVoucher">Redeem Voucher</option>
                        <option value="luckySpin">Lucky Spin</option>
                        <option value="getCustomerTier">Get Customer Tier</option>
                    </select>
                </label>
                {/* Add input fields based on the selected action */}
                {/* ... (similar to the original LoyaltyForm) */}
                <button type="submit">Submit</button>
                <p>{message}</p>
            </form>
        </div>
    );
}