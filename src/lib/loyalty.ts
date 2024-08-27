import { AptosAccount, AptosClient, HexString, Types } from 'aptos';

if (!process.env.APTOS_NODE_URL || !process.env.CONTRACT_ADDRESS || !process.env.CONTRACT_NAME) {
  throw new Error('APTOS_NODE_URL, CONTRACT_ADDRESS, and CONTRACT_NAME must be set in the environment variables');
}

const client = new AptosClient(process.env.APTOS_NODE_URL);

const moduleAddress = process.env.CONTRACT_ADDRESS;
const moduleName = process.env.CONTRACT_NAME;
async function initialize(account: AptosAccount, luckySpinEnabled: boolean) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::initialize`,
    type_arguments: [],
    arguments: [luckySpinEnabled],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function setSpinProbabilities(account: AptosAccount, probabilities: number[], amounts: number[]) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::set_spin_probabilities`,
    type_arguments: [],
    arguments: [probabilities, amounts],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function createCoupon(
  account: AptosAccount,
  id: number,
  stampsRequired: number,
  description: string,
  isMonetary: boolean,
  value: number
) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::create_coupon`,
    type_arguments: [],
    arguments: [id, stampsRequired, Array.from(new TextEncoder().encode(description)), isMonetary, value],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function setTierThresholds(account: AptosAccount, thresholds: number[]) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::set_tier_thresholds`,
    type_arguments: [],
    arguments: [thresholds],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function earnStamps(account: AptosAccount, customer: HexString, amount: number) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::earn_stamps`,
    type_arguments: [],
    arguments: [customer, amount],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function redeemCoupon(account: AptosAccount, customer: HexString, couponId: number) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::redeem_coupon`,
    type_arguments: [],
    arguments: [customer, couponId],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function luckySpin(account: AptosAccount, customer: HexString) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::lucky_spin`,
    type_arguments: [],
    arguments: [customer],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function getCustomerTier(account: AptosAccount, customer: HexString): Promise<number> {
  const resource = await client.getAccountResource(
    account.address(),
    `${moduleAddress}::${moduleName}::LoyaltyProgram`
  );
  const merchant = (resource.data as any).merchants[0];
  const lifetimeStamps = (merchant as any).customer_lifetime_stamps[customer.toString()];
  const tierThresholds = (merchant as any).tier_thresholds;
  for (let i = 0; i < tierThresholds.length; i++) {
    if (lifetimeStamps >= tierThresholds[i]) {
      return i + 1;
    }
  }
  return 0;
}

export {
  initialize,
  setSpinProbabilities,
  createCoupon,
  setTierThresholds,
  earnStamps,
  redeemCoupon,
  luckySpin,
  getCustomerTier,
};
