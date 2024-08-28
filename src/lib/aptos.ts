import { AccountAddress, Aptos } from "@aptos-labs/ts-sdk";

const COIN_STORE = "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>";

/**
 * Prints the balance of an account
 * @param aptos
 * @param name
 * @param address
 * @returns {Promise<*>}
 *
 */
export const balance = async (aptos: Aptos, name: string, address: AccountAddress) => {
    type Coin = { coin: { value: string } };
    const resource = await aptos.getAccountResource<Coin>({
        accountAddress: address,
        resourceType: COIN_STORE,
    });
    const amount = Number(resource.coin.value);

    console.log(`${name}'s balance is: ${amount}`);
    return amount;
};