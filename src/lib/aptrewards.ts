import { AptosAccount, AptosClient, HexString, Types } from 'aptos';

if (!process.env.APTOS_NODE_URL || !process.env.CONTRACT_ADDRESS || !process.env.CONTRACT_NAME) {
  throw new Error('APTOS_NODE_URL, CONTRACT_ADDRESS, and CONTRACT_NAME must be set in the environment variables');
}

const client = new AptosClient(process.env.APTOS_NODE_URL);

const moduleAddress = process.env.CONTRACT_ADDRESS;
const moduleName = process.env.CONTRACT_NAME;

async function initializeFactory(account: AptosAccount) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::initialize_factory`,
    type_arguments: [],
    arguments: [],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function createLoyaltyProgram(account: AptosAccount, name: string, luckySpinEnabled: boolean) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::create_loyalty_program`,
    type_arguments: [],
    arguments: [Array.from(new TextEncoder().encode(name)), luckySpinEnabled],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function transferOwnership(account: AptosAccount, programId: number, newOwner: HexString) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::transfer_ownership`,
    type_arguments: [],
    arguments: [programId, newOwner],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function getUserPrograms(account: AptosAccount): Promise<number[]> {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::get_user_programs`,
    type_arguments: [],
    arguments: [],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  // Assuming the response is a vector<u64> in Move, we need to parse it to get the actual program IDs.
  const parseProgramIdsFromResponse = (response: any) => {
    // This is a placeholder for the actual parsing logic, which depends on how you're handling responses.
    // For demonstration, let's assume the response is a JSON object with a 'result' property containing the program IDs.
    const programIds = response.result.map((id: any) => id['u64']);
    return programIds;
  };
  const parsedProgramIds = parseProgramIdsFromResponse(transactionRes);
  return parsedProgramIds;
}

async function setSpinProbabilities(account: AptosAccount, programId: number, probabilities: number[], amounts: number[]) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::set_spin_probabilities`,
    type_arguments: [],
    arguments: [programId, probabilities, amounts],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function createCoupon(
  account: AptosAccount,
  programId: number,
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
    arguments: [programId, id, stampsRequired, Array.from(new TextEncoder().encode(description)), isMonetary, value],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function setTierThresholds(account: AptosAccount, programId: number, thresholds: number[]) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::set_tier_thresholds`,
    type_arguments: [],
    arguments: [programId, thresholds],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function earnStamps(account: AptosAccount, programId: number, customer: HexString, amount: number) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::earn_stamps`,
    type_arguments: [],
    arguments: [programId, customer, amount],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function redeemCoupon(account: AptosAccount, programId: number, customer: HexString, couponId: number) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::redeem_coupon`,
    type_arguments: [],
    arguments: [programId, customer, couponId],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function luckySpin(account: AptosAccount, programId: number, customer: HexString) {
  const payload: Types.TransactionPayload_EntryFunctionPayload = {
    type: 'entry_function_payload',
    function: `${moduleAddress}::${moduleName}::lucky_spin`,
    type_arguments: [],
    arguments: [programId, customer],
  };
  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes;
}

async function getCustomerTier(programId: number, customer: HexString): Promise<number> {
  const resource = await client.getAccountResource(
    moduleAddress,
    `${moduleAddress}::${moduleName}::LoyaltyProgramFactory`
  );
  // Note: This implementation might need to be adjusted based on how the Move contract stores and returns data
  // You might need to call a view function or parse the resource data differently
  return 0; // Placeholder return, implement the actual logic based on the contract's data structure
}

export {
  initializeFactory,
  createLoyaltyProgram,
  transferOwnership,
  getUserPrograms,
  setSpinProbabilities,
  createCoupon,
  setTierThresholds,
  earnStamps,
  redeemCoupon,
  luckySpin,
  getCustomerTier,
};
