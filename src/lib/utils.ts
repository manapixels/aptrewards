import { Aptos, AptosConfig, Network, NetworkToNetworkName } from '@aptos-labs/ts-sdk';
import { NetworkInfo } from '@aptos-labs/wallet-adapter-core';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type ClassValue = string | number | null | undefined | { [key: string]: boolean };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.DEVNET];

const config = new AptosConfig({ network: APTOS_NETWORK });
export const aptos = new Aptos(config);

export const aptosClient = (network?: NetworkInfo | null) => {
  if (network?.name === Network.DEVNET) {
    return DEVNET_CLIENT;
  } else if (network?.name === Network.TESTNET) {
    return TESTNET_CLIENT;
  } else if (network?.name === Network.MAINNET) {
    throw new Error('Please use devnet or testnet for testing');
  } else {
    const CUSTOM_CONFIG = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: network?.url
    });
    return new Aptos(CUSTOM_CONFIG);
  }
};

// Devnet client
export const DEVNET_CONFIG = new AptosConfig({
  network: Network.DEVNET,
});
export const DEVNET_CLIENT = new Aptos(DEVNET_CONFIG);

// Testnet client
export const TESTNET_CONFIG = new AptosConfig({ network: Network.TESTNET });
export const TESTNET_CLIENT = new Aptos(TESTNET_CONFIG);

export const isSendableNetwork = (connected: boolean, networkName?: string): boolean => {
  return connected && !isMainnet(connected, networkName);
};

export const isMainnet = (connected: boolean, networkName?: string): boolean => {
  return connected && networkName === Network.MAINNET;
};