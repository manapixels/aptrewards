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
    await aptos.fundAccount({ accountAddress: admin.accountAddress, amount: 100_000_000 });

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
        // Initialize the factory
        console.log(`Object address is: ${response?.objectAddress}`);

        // console.log("====== Initializing Factory ======\n");

        // const initializeFactoryTxn = await aptos.transaction.build.simple({
        //     sender: admin.accountAddress,
        //     data: {
        //         // All transactions on Aptos are implemented via smart contracts.
        //         function: `${response?.objectAddress}::AptRewardsMain::initialize_factory`,
        //         functionArguments: [],
        //     },
        // });

        // const pendingTxn = await aptos.signAndSubmitTransaction({ signer: admin, transaction: initializeFactoryTxn });
        // const initializeFactoryResponse = await aptos.waitForTransaction({ transactionHash: pendingTxn.hash });

        // console.log("Factory initialized successfully. - ", initializeFactoryResponse.hash);

        // Write the contract address to a JSON file
        // const contractInfo = {
        //     address: moduleAddress
        // };
        // fs.writeFileSync(path.join(__dirname, "contract_address.json"), JSON.stringify(contractInfo, null, 2));

        // console.log(`Contract address written to contract_address.json: ${moduleAddress}`);
    });


}

main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});