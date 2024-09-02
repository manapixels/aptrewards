import { Account, Ed25519PrivateKey, Aptos, AptosConfig, Network, NetworkToNetworkName } from "@aptos-labs/ts-sdk";
import dotenv from "dotenv";
import { compilePackage } from "./utils";

const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.TESTNET];

const config = new AptosConfig({ network: APTOS_NETWORK });
export const aptos = new Aptos(config);


dotenv.config();

export async function compile() {

    if (!process.env.PRIVATE_KEY) {
        console.error("PRIVATE_KEY is not set in the environment variables");
        return;
    }

    const account = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(process.env.PRIVATE_KEY),
    });

    console.log("\n=== Compiling AptRewards package locally ===");

    compilePackage(
        "move", "move/aptrewards.json",
        [{ name: "AptRewards", address: account.accountAddress }]
    );
}

compile().catch(console.error);