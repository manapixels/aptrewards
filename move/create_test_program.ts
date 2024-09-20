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
    await aptos.fundAccount({ accountAddress: admin.accountAddress, amount: 100_000_000 });

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
    const pointValidityDays = 30; // 30 days point validity
    const createProgramTxn = await aptos.transaction.build.simple({
        sender: admin.accountAddress,
        data: {
            function: `${MODULE_ADDRESS}::AptRewardsMain::create_loyalty_program`,
            typeArguments: [],
            functionArguments: [programName, pointValidityDays]
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
            benefits: [
                "5% discount on all purchases",
                "Early access to new products",
                "Birthday reward"
            ],
            points: 0
        },
        {
            name: "Silver",
            benefits: [
                "10% discount on all purchases",
                "Exclusive member-only events",
                "2x points on select products"
            ],
            points: 10000
        },
        {
            name: "Gold",
            benefits: [
                "15% discount on all purchases",
                "Priority customer service",
                "Exclusive VIP events",
                "Personalized offers",
                "3x points on select products"
            ],
            points: 50000
        }
    ];

    for (const tier of tiers) {
        const createTierTxn = await aptos.transaction.build.simple({
            sender: admin.accountAddress,
            data: {
                function: `${MODULE_ADDRESS}::AptRewardsMain::add_tier`,
                typeArguments: [],
                functionArguments: [programId, tier.name, tier.points, tier.benefits]
            },
        });

        const createTierResult = await aptos.signAndSubmitTransaction({
            signer: admin,
            transaction: createTierTxn
        })

        const confirmedTierTxn = await aptos.waitForTransaction({ transactionHash: createTierResult.hash });
        // @ts-ignore
        console.log(`Created tier "${tier.name}" with ID:`, confirmedTierTxn?.events?.find(event => event.type.includes("AddTier"))?.data?.tier_id);
    }

    // Create vouchers
    const vouchers = [
        { name: "10% off", points: 5000, description: "", maxRedemptions: 100, termsAndConditions: "Valid for 30 days from issuance." },
        { name: "$5 off", points: 10000, description: "", maxRedemptions: 50, termsAndConditions: "Minimum purchase of $20 required." },
        { name: "Free item", points: 20000, description: "Choose any item up to $10 value", maxRedemptions: 25, termsAndConditions: "One free item per transaction." },
        { name: "$10 off", points: 30000, description: "", maxRedemptions: 20, termsAndConditions: "Cannot be combined with other offers." },
        { name: "VIP experience", points: 50000, description: "Exclusive in-store personal shopping session", maxRedemptions: 10, termsAndConditions: "Reservation required. Subject to availability." }
    ];

    for (const voucher of vouchers) {
        const createVoucherTxn = await aptos.transaction.build.simple({
            sender: admin.accountAddress,
            data: {
                function: `${MODULE_ADDRESS}::AptRewardsMain::create_voucher`,
                typeArguments: [],
                functionArguments: [
                    programId,
                    voucher.name,
                    voucher.description,
                    voucher.points,
                    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // Expiration date (30 days from now)
                    voucher.maxRedemptions,
                    voucher.termsAndConditions
                ]
            }
        });

        const createVoucherResult = await aptos.signAndSubmitTransaction({
            signer: admin,
            transaction: createVoucherTxn
        })

        const confirmedVoucherTxn = await aptos.waitForTransaction({ transactionHash: createVoucherResult.hash });
        // @ts-ignore
        console.log(`Created voucher "${voucher.name}" with ID:`, confirmedVoucherTxn?.events?.find(event => event.type.includes("CreateVoucher"))?.data?.voucher_id);
    }

    // Create 5 random customer accounts and assign points
    const customers: Account[] = [];
    for (let i = 0; i < 5; i++) {
        const customer = Account.generate();
        customers.push(customer);
        await aptos.fundAccount({ accountAddress: customer.accountAddress, amount: 100_000_000 });

        const points = Math.floor(Math.random() * 50000) + 1000; // Random points between 1000 and 50000

        const earnPointsTxn = await aptos.transaction.build.simple({
            sender: admin.accountAddress,
            data: {
                function: `${MODULE_ADDRESS}::AptRewardsMain::earn_points`,
                typeArguments: [],
                functionArguments: [programId, customer.accountAddress.toString(), points]
            }
        });

        const earnPointsResult = await aptos.signAndSubmitTransaction({
            signer: admin,
            transaction: earnPointsTxn
        })

        await aptos.waitForTransaction({ transactionHash: earnPointsResult.hash });
        console.log(`Customer ${i + 1} (${customer.accountAddress.toString()}) earned ${points} points`);

        // Find a voucher that the customer has enough points for
        const availableVouchers = vouchers.filter(voucher => voucher.points <= points);
        if (availableVouchers.length > 0) {
            const randomVoucher = availableVouchers[Math.floor(Math.random() * availableVouchers.length)];
            const voucherIndex = vouchers.indexOf(randomVoucher);

            try {
                // Step 1: Exchange points for voucher
                const exchangePointsTxn = await aptos.transaction.build.simple({
                    sender: customer.accountAddress,
                    data: {
                        function: `${MODULE_ADDRESS}::AptRewardsMain::exchange_points_for_voucher`,
                        typeArguments: [],
                        functionArguments: [programId, voucherIndex]
                    }
                });

                const exchangePointsResult = await aptos.signAndSubmitTransaction({
                    signer: customer,
                    transaction: exchangePointsTxn
                })

                await aptos.waitForTransaction({ transactionHash: exchangePointsResult.hash });
                console.log(`Customer ${i + 1} (${customer.accountAddress.toString()}) exchanged points for voucher ${voucherIndex} (${randomVoucher.name})`);

                // Step 2: Redeem voucher (simulating a cashier redeeming it)
                const redeemVoucherTxn = await aptos.transaction.build.simple({
                    sender: admin.accountAddress,
                    data: {
                        function: `${MODULE_ADDRESS}::AptRewardsMain::redeem_voucher`,
                        typeArguments: [],
                        functionArguments: [programId, customer.accountAddress.toString(), voucherIndex]
                    }
                });

                const redeemVoucherResult = await aptos.signAndSubmitTransaction({
                    signer: admin,
                    transaction: redeemVoucherTxn
                })

                await aptos.waitForTransaction({ transactionHash: redeemVoucherResult.hash });
                console.log(`Customer ${i + 1} (${customer.accountAddress.toString()}) redeemed voucher ${voucherIndex} (${randomVoucher.name})`);
            } catch (error) {
                if (error instanceof Error) {
                    console.error(`Error processing voucher for Customer ${i + 1} (${customer.accountAddress.toString()}):`, error.message);
                } else {
                    console.error(`Error processing voucher for Customer ${i + 1} (${customer.accountAddress.toString()}):`, error);
                }
            }
        } else {
            console.log(`Customer ${i + 1} (${customer.accountAddress.toString()}) doesn't have enough points to redeem any vouchers`);
        }
    }

    console.log("First test program setup completed successfully!");

    // Create a second loyalty program
    const secondProgramName = generateRandomProgramName();
    const secondPointValidityDays = 60; // 60 days point validity for the second program
    const createSecondProgramTxn = await aptos.transaction.build.simple({
        sender: admin.accountAddress,
        data: {
            function: `${MODULE_ADDRESS}::AptRewardsMain::create_loyalty_program`,
            typeArguments: [],
            functionArguments: [secondProgramName, secondPointValidityDays]
        },
    });

    const createSecondProgramResult = await aptos.signAndSubmitTransaction({
        signer: admin,
        transaction: createSecondProgramTxn
    });

    const confirmedSecondTxn = await aptos.waitForTransaction({ transactionHash: createSecondProgramResult.hash });

    // @ts-ignore
    const secondProgramId = confirmedSecondTxn?.events?.find(event => event.type.includes("CreateLoyaltyProgram"))?.data?.program_id;

    console.log(`Created 2nd loyalty program "${secondProgramName}" with ID:`, secondProgramId);

    // Create tiers for the second program
    const secondTiers = [
        { name: "Basic", benefits: ["2% cashback on purchases"], points: 0 },
        { name: "Premium", benefits: ["5% cashback on purchases", "Free shipping"], points: 20000 },
        { name: "Elite", benefits: ["10% cashback on purchases", "Free shipping", "24/7 support"], points: 100000 }
    ];

    for (const tier of secondTiers) {
        const createTierTxn = await aptos.transaction.build.simple({
            sender: admin.accountAddress,
            data: {
                function: `${MODULE_ADDRESS}::AptRewardsMain::add_tier`,
                typeArguments: [],
                functionArguments: [secondProgramId, tier.name, tier.points, tier.benefits]
            },
        });

        const createTierResult = await aptos.signAndSubmitTransaction({
            signer: admin,
            transaction: createTierTxn
        });

        const confirmedTierTxn = await aptos.waitForTransaction({ transactionHash: createTierResult.hash });
        // @ts-ignore
        console.log(`Created tier "${tier.name}" with ID:`, confirmedTierTxn?.events?.find(event => event.type.includes("AddTier"))?.data?.tier_id);
    }

    // Award points to one of the users from the first program
    const selectedCustomerIndex = Math.floor(Math.random() * 5); // Randomly select one of the 5 customers
    const selectedCustomerAddress = customers[selectedCustomerIndex].accountAddress.toString();
    const pointsToAward = 30000; // Award 30000 points to the selected customer

    const earnPointsTxn = await aptos.transaction.build.simple({
        sender: admin.accountAddress,
        data: {
            function: `${MODULE_ADDRESS}::AptRewardsMain::earn_points`,
            typeArguments: [],
            functionArguments: [secondProgramId, selectedCustomerAddress, pointsToAward]
        }
    });

    const earnPointsResult = await aptos.signAndSubmitTransaction({
        signer: admin,
        transaction: earnPointsTxn
    });

    await aptos.waitForTransaction({ transactionHash: earnPointsResult.hash });
    console.log(`Customer ${selectedCustomerIndex + 1} (${selectedCustomerAddress}) earned ${pointsToAward} points in the second program`);

    console.log("Second test program setup completed successfully!");
}

main().catch(console.error);
