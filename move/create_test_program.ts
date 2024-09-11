import {
    Account,
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    NetworkToNetworkName,
    AccountAddressInput,
    HexInput,
    InputGenerateTransactionPayloadData
} from "@aptos-labs/ts-sdk";
import dotenv from 'dotenv';

dotenv.config();

const MODULE_ADDRESS = process.env.CONTRACT_ADDRESS as AccountAddressInput;
const NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.TESTNET];

if (!MODULE_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS not set in .env file");
}

if (!process.env.PRIVATE_KEY || !process.env.PUBLIC_KEY) {
    throw new Error("PRIVATE_KEY or PUBLIC_KEY not set in .env file");
}

async function main() {
    // Initialize Aptos SDK
    const aptosConfig = new AptosConfig({ network: NETWORK });
    const aptos = new Aptos(aptosConfig);
    const admin = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(process.env.PRIVATE_KEY as HexInput),
        address: process.env.PUBLIC_KEY as AccountAddressInput,
    });

    console.log("Admin's address:", admin.accountAddress.toString());
    

    // Check if the module is deployed
    try {
        await aptos.getAccountModule({ accountAddress: MODULE_ADDRESS, moduleName: "AptRewardsMain" });
        console.log("Module is deployed on the network.");
    } catch (error) {
        console.error("Module is not deployed on the network.");
        return;
    }
    

    // Fund the admin account
    // await aptos.fundAccount({ accountAddress: admin.accountAddress, amount: 100_000_000 });

    // Function to generate a random program name
    function generateRandomProgramName(): string {
        const adjectives = ['Awesome', 'Stellar', 'Epic', 'Fantastic', 'Supreme'];
        const nouns = ['Rewards', 'Loyalty', 'Perks', 'Benefits', 'Club'];
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${randomAdjective} ${randomNoun}`;
    }

    // Create a new loyalty program
    const programName = generateRandomProgramName();
    const createProgramTxn = await aptos.transaction.build.simple({
        sender: admin.accountAddress,
        data: {
            function: `${MODULE_ADDRESS}::AptRewardsMain::create_loyalty_program`,
            typeArguments: [],
            functionArguments: [programName, true]
        },
    });

    const createProgramResult = await aptos.signAndSubmitTransaction({
        signer: admin,
        transaction: createProgramTxn
    })
    
    // Wait for transaction to be confirmed
    const confirmedTxn = await aptos.waitForTransaction({ transactionHash: createProgramResult.hash });
    
    // @ts-ignore
    const programId = confirmedTxn?.events?.find(event => event.type.includes("CreateLoyaltyProgram"))?.data?.program_id;

    console.log(`Created loyalty program "${programName}" with ID:`, programId);

    // Create tiers
    const tiers = [
        { 
            name: "Bronze", 
            description: "Welcome to our loyalty program! Enjoy basic perks and start earning rewards with every purchase.", 
            stamps: 100 
        },
        { 
            name: "Silver", 
            description: "You're a valued customer! Unlock exclusive discounts and priority service as a Silver member.", 
            stamps: 500 
        },
        { 
            name: "Gold", 
            description: "Experience VIP treatment! As a Gold member, indulge in premium rewards, personalized offers, and exclusive events.", 
            stamps: 1000 
        }
    ];

    const tierTransactions: InputGenerateTransactionPayloadData[] = tiers.map(tier => ({
        function: `${MODULE_ADDRESS}::AptRewardsMain::add_tier`,
        functionArguments: [programId, tier.name, tier.description, tier.stamps]
    }));

    await aptos.transaction.batch.forSingleAccount({
        sender: admin,
        data: tierTransactions
    });

    console.log("Added all tiers");

    // Create coupons
    const coupons = [
        { stamps: 50, description: "10% off", isMonetary: false, value: 10, maxRedemptions: 100 },
        { stamps: 100, description: "$5 off", isMonetary: true, value: 500, maxRedemptions: 50 },
        { stamps: 200, description: "Free item", isMonetary: false, value: 0, maxRedemptions: 25 },
        { stamps: 300, description: "$10 off", isMonetary: true, value: 1000, maxRedemptions: 20 },
        { stamps: 500, description: "VIP experience", isMonetary: false, value: 0, maxRedemptions: 10 }
    ];

    const couponTransactions: InputGenerateTransactionPayloadData[] = coupons.map((coupon, i) => ({
        function: `${MODULE_ADDRESS}::AptRewardsMain::create_coupon`,
        functionArguments: [
            programId, i, coupon.stamps, coupon.description, coupon.isMonetary, 
            coupon.value, Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days expiration
            coupon.maxRedemptions
        ]
    }));

    await aptos.transaction.batch.forSingleAccount({
        sender: admin,
        data: couponTransactions
    });

    console.log("Created all coupons");

    // Create 5 random customer accounts and assign stamps
    for (let i = 0; i < 5; i++) {
        const customer = Account.generate();
        await aptos.fundAccount({ accountAddress: customer.accountAddress, amount: 10_000_000 });

        const stamps = Math.floor(Math.random() * 1000) + 1; // Random stamps between 1 and 1000
        const randomCouponId = Math.floor(Math.random() * coupons.length);

        const customerTransactions: InputGenerateTransactionPayloadData[] = [
            {
                function: `${MODULE_ADDRESS}::AptRewardsMain::earn_stamps`,
                functionArguments: [programId, customer.accountAddress.toString(), stamps * 10] // Assuming 1 stamp per $10 spent
            },
            {
                function: `${MODULE_ADDRESS}::AptRewardsMain::redeem_coupon`,
                functionArguments: [programId, customer.accountAddress.toString(), randomCouponId]
            }
        ];

        await aptos.transaction.batch.forSingleAccount({
            sender: admin,
            data: customerTransactions
        });


        console.log(`Customer ${i + 1} (${customer.accountAddress.toString()}) earned ${stamps} stamps and redeemed coupon ${randomCouponId}`);
    }

    console.log("Test program setup completed successfully!");
}

main().catch(console.error);
