# AptRewards

A blockchain-powered loyalty program platform on Aptos.

## Vision

AptRewards transforms loyalty programs into powerful, transparent ecosystems on the blockchain. By eliminating intermediaries and providing real-time, immutable transactions, we empower businesses to create truly engaging rewards systems while giving customers full control and ownership of their earned points.

## Key Features

AptRewards offers a range of powerful features for businesses and customers:

- **Program Management**
  - Create and manage multiple loyalty programs
  - Customize point systems and validity periods
  - Set up tiered rewards with unique benefits

- **Digital Vouchers**
  - Issue and manage digital vouchers
  - Set redemption limits and validity periods
  - Implement secure two-step redemption process

- **Customer Engagement**
  - Maintain detailed customer profiles
  - Track point balances and tier status
  - Automatic point expiration to encourage engagement

- **Blockchain Advantages**
  - Real-time transaction processing
  - Transparent program ownership
  - Immutable record of all loyalty activities

## Getting Started

1. Run `aptos init` to initialize the Aptos CLI.
2. Run `npm run aptos:deploy_and_init` to deploy and initialize the package.
3. (optional) Run `npm run aptos:create_test_program` to create a test program and some dummy data onchain. Requires the following in .env

    ```json
    APTOS_NETWORK=<testnet or mainnet>
    PRIVATE_KEY=<your_private_key>
    PUBLIC_KEY=<your_public_key>
    CONTRACT_ADDRESS=<your_contract_address> (auto-populated by running create_test_program)
    CONTRACT_NAME=<your_contract_name> (e.g. AptRewardsMain)
    ```

    To try out a deployed version of AptRewards, use the following:

    ```json
    APTOS_NETWORK=testnet
    PRIVATE_KEY=<your_private_key>
    PUBLIC_KEY=<your_public_key>
    CONTRACT_ADDRESS=0x27b7aa5e8f40fb65cb7740472b85492b09793359b4deb018cd6202a015bbc6b1
    CONTRACT_NAME=AptRewardsMain
    ```

4. Run `npm run dev` to start the front-end (Next.js) application. Requires the following in .env

    ```json
    NEXT_PUBLIC_CONTRACT_ADDRESS=<your_contract_address>
    NEXT_PUBLIC_CONTRACT_NAME=<your_contract_name> (e.g. AptRewardsMain)
    NEXT_PUBLIC_NETWORK=<testnet or mainnet>
    ```
