import dotenv from 'dotenv';
import cli from "@aptos-labs/ts-sdk/dist/common/cli/index.js";

dotenv.config();

async function publish() {
    if (!process.env.CONTRACT_ADDRESS) {
        throw new Error(
            "CONTRACT_ADDRESS variable is not set, make sure you have published the module before upgrading it",
        );
    }

    const move = new cli.Move();

    move.upgradeObjectPackage({
        packageDirectoryPath: "move",
        objectAddress: process.env.CONTRACT_ADDRESS,
        namedAddresses: {
            // Upgrade module from an object
            // @ts-ignore
            AptRewards: process.env.CONTRACT_ADDRESS,
        },
        // profile: `${process.env.PROJECT_NAME}-${process.env.APTOS_NETWORK}`,
    });
}
publish();