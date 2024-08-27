import { AptosAccount, HexString } from 'aptos';
import { NextApiRequest, NextApiResponse } from 'next';

import {
  createCoupon,
  earnStamps,
  getCustomerTier,
  initialize,
  luckySpin,
  redeemCoupon,
  setSpinProbabilities,
  setTierThresholds,
} from '../lib/loyalty';

if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY must be set in the environment variables');
}

const account = new AptosAccount(Buffer.from(process.env.PRIVATE_KEY, 'hex'));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { action, ...params } = req.body;

    try {
      let transactionRes;
      switch (action) {
        case 'initialize':
          transactionRes = await initialize(account, params.luckySpinEnabled);
          break;
        case 'setSpinProbabilities':
          transactionRes = await setSpinProbabilities(account, params.probabilities, params.amounts);
          break;
        case 'createCoupon':
          transactionRes = await createCoupon(
            account,
            params.id,
            params.stampsRequired,
            params.description,
            params.isMonetary,
            params.value
          );
          break;
        case 'setTierThresholds':
          transactionRes = await setTierThresholds(account, params.thresholds);
          break;
        case 'earnStamps':
          transactionRes = await earnStamps(account, new HexString(params.customer), params.amount);
          break;
        case 'redeemCoupon':
          transactionRes = await redeemCoupon(account, new HexString(params.customer), params.couponId);
          break;
        case 'luckySpin':
          transactionRes = await luckySpin(account, new HexString(params.customer));
          break;
        case 'getCustomerTier':
          const tier = await getCustomerTier(account, new HexString(params.customer));
          return res.status(200).json({ success: true, tier });
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      res.status(200).json({ success: true, transactionHash: transactionRes.hash });
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      res.status(500).json({ error: `Error performing ${action}` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
