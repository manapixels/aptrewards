import { Account, Ed25519PrivateKey, Aptos, AptosConfig, Network, NetworkToNetworkName } from "@aptos-labs/ts-sdk";
import dotenv from "dotenv";
import { compilePackage, getPackageBytesToPublish } from "./utils";

const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.TESTNET];

const config = new AptosConfig({ network: APTOS_NETWORK });
export const aptos = new Aptos(config);


dotenv.config();

async function initializeFactory() {
    if (!process.env.PRIVATE_KEY) {
        console.error("PRIVATE_KEY is not set in the environment variables");
        return;
    }

    const account = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(process.env.PRIVATE_KEY),
    });


    // Fund the account; skip if already funded
    try {
        console.log("Funding account...");
        await aptos.fundAccount({
            accountAddress: account.accountAddress,
            amount: 100_000_000,
        });
    } catch (error) {
        console.error('Error funding account', error);
    }

    console.log("\n=== Compiling AptRewards package locally ===");

    compilePackage(
        "move", "move/aptrewards.json",
        [{ name: "AptRewards", address: account.accountAddress }]
    );

    const { metadataBytes, byteCode } = getPackageBytesToPublish("move/aptrewards.json");

    console.log(`\n=== Publishing AptRewards package to ${aptos.config.network} network ===`);

    // Publish AptRewards package to chain
    const transaction = await aptos.publishPackageTransaction({
        account: account.accountAddress,
        metadataBytes,
        moduleBytecode: byteCode,
    });

    const pendingTransaction = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
    });

    console.log(`Publish package transaction hash: ${pendingTransaction.hash}`);
    await aptos.waitForTransaction({ transactionHash: pendingTransaction.hash });
}

initializeFactory().catch(console.error);