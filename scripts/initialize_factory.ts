import { AptosClient, AptosAccount, FaucetClient, Types } from "aptos";

const NODE_URL = process.env.APTOS_NODE_URL || "https://fullnode.devnet.aptoslabs.com";
const FAUCET_URL = process.env.APTOS_FAUCET_URL || "https://faucet.devnet.aptoslabs.com";

const client = new AptosClient(NODE_URL);
const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

async function initializeFactory() {
  // Create a new account or use an existing one
  const account = new AptosAccount();
  
  // Fund the account
  await faucetClient.fundAccount(account.address(), 100_000_000);

  const payload: Types.TransactionPayload = {
    type: "entry_function_payload",
    function: "loyaltyprogram_addr::LoyaltyProgram::initialize_factory",
    type_arguments: [],
    arguments: []
  };

  const txnRequest = await client.generateTransaction(account.address(), payload);
  const signedTxn = await client.signTransaction(account, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);

  console.log(`Factory initialized. Transaction hash: ${transactionRes.hash}`);
}

initializeFactory().catch(console.error);