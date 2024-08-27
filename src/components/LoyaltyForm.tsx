'use client';

import { useState } from 'react';

export default function LoyaltyForm() {
  const [action, setAction] = useState('luckySpin');
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

      if (response.ok) {
        setMessage(
          `Success! ${data.transactionHash ? `Transaction Hash: ${data.transactionHash}` : `Tier: ${data.tier}`}`
        );
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error performing action: ${error}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams((prevParams) => ({ ...prevParams, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Action:
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="initialize">Initialize</option>
          <option value="setSpinProbabilities">Set Spin Probabilities</option>
          <option value="createCoupon">Create Coupon</option>
          <option value="setTierThresholds">Set Tier Thresholds</option>
          <option value="earnStamps">Earn Stamps</option>
          <option value="redeemCoupon">Redeem Coupon</option>
          <option value="luckySpin">Lucky Spin</option>
          <option value="getCustomerTier">Get Customer Tier</option>
        </select>
      </label>
      {/* Add input fields based on the selected action */}
      {action === 'initialize' && (
        <label>
          Lucky Spin Enabled:
          <input type="checkbox" name="luckySpinEnabled" onChange={handleInputChange} />
        </label>
      )}
      {action === 'setSpinProbabilities' && (
        <>
          <label>
            Probabilities (comma-separated):
            <input type="text" name="probabilities" onChange={handleInputChange} />
          </label>
          <label>
            Amounts (comma-separated):
            <input type="text" name="amounts" onChange={handleInputChange} />
          </label>
        </>
      )}
      {action === 'createCoupon' && (
        <>
          <label>
            ID:
            <input type="number" name="id" onChange={handleInputChange} />
          </label>
          <label>
            Stamps Required:
            <input type="number" name="stampsRequired" onChange={handleInputChange} />
          </label>
          <label>
            Description:
            <input type="text" name="description" onChange={handleInputChange} />
          </label>
          <label>
            Is Monetary:
            <input type="checkbox" name="isMonetary" onChange={handleInputChange} />
          </label>
          <label>
            Value:
            <input type="number" name="value" onChange={handleInputChange} />
          </label>
        </>
      )}
      {action === 'setTierThresholds' && (
        <label>
          Thresholds (comma-separated):
          <input type="text" name="thresholds" onChange={handleInputChange} />
        </label>
      )}
      {action === 'earnStamps' && (
        <>
          <label>
            Customer Address:
            <input type="text" name="customer" onChange={handleInputChange} />
          </label>
          <label>
            Amount:
            <input type="number" name="amount" onChange={handleInputChange} />
          </label>
        </>
      )}
      {action === 'redeemCoupon' && (
        <>
          <label>
            Customer Address:
            <input type="text" name="customer" onChange={handleInputChange} />
          </label>
          <label>
            Coupon ID:
            <input type="number" name="couponId" onChange={handleInputChange} />
          </label>
        </>
      )}
      {action === 'luckySpin' && (
        <label>
          Customer Address:
          <input type="text" name="customer" onChange={handleInputChange} />
        </label>
      )}
      {action === 'getCustomerTier' && (
        <label>
          Customer Address:
          <input type="text" name="customer" onChange={handleInputChange} />
        </label>
      )}
      <button type="submit">Submit</button>
      <p>{message}</p>
    </form>
  );
}
