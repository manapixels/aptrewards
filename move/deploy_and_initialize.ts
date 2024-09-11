import cli from "@aptos-labs/ts-sdk/dist/common/cli/index.js";
import {
    Account,
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    NetworkToNetworkName,
} from "@aptos-labs/ts-sdk";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.TESTNET];

async function main() {
    // Pre-requisite checks
    if (!process.env.CONTRACT_ADDRESS) {
        throw new Error("CONTRACT_ADDRESS environment variable not set");
    }
    if (!process.env.PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY environment variable not set")
    }
    if (!process.env.PUBLIC_KEY) {
        throw new Error("PUBLIC_KEY environment variable not set")
    }
    // Initialize Aptos SDK
    const aptosConfig = new AptosConfig({ network: APTOS_NETWORK });
    const aptos = new Aptos(aptosConfig);
    const admin = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(process.env.PRIVATE_KEY as string),
        address: process.env.PUBLIC_KEY as string,
    });

    console.log("====== Account info ======\n");
    console.log(`Admin's address is: ${admin.accountAddress.toString()}\n`);
    // Fund Admin account
    // await aptos.fundAccount({ accountAddress: admin.accountAddress, amount: 100_000_000 });

    const move = new cli.Move();

    console.log("====== Publish Package ======\n");

    // Deploy the package
    move.createObjectAndPublishPackage({
        packageDirectoryPath: "move",
        addressName: "aptrewards_addr",
        namedAddresses: {
            // Publish module to new object, but since we create the object on the fly, we fill in the publisher's account address here
            //@ts-ignore
            aptrewards_addr: process.env.CONTRACT_ADDRESS as string,
        },
        extraArguments: [],
    }).then(async (response) => {
        console.log("Package deployed successfully", response);
        console.log(`Object address is: ${response?.objectAddress}`);

        // Update .env file with new contract address
        if (response?.objectAddress) {
            const envPath = path.resolve(process.cwd(), '.env');
            let envContent = fs.readFileSync(envPath, 'utf8');
            
            envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${response.objectAddress}`);
            envContent = envContent.replace(/NEXT_PUBLIC_CONTRACT_ADDRESS=.*/, `NEXT_PUBLIC_CONTRACT_ADDRESS=${response.objectAddress}`);
            
            fs.writeFileSync(envPath, envContent);
            
            console.log(`Updated .env file with new contract address: ${response.objectAddress}`);
        }        
    });


}

main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});