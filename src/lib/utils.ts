import { Aptos, AptosConfig, Network, NetworkToNetworkName } from '@aptos-labs/ts-sdk';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type ClassValue = string | number | null | undefined | { [key: string]: boolean };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.TESTNET];
const config = new AptosConfig({ network: APTOS_NETWORK });
export const getAptosClient = () => new Aptos(config);

export const isSendableNetwork = (connected: boolean, networkName?: string): boolean => {
  return connected && !isMainnet(connected, networkName);
};

export const isMainnet = (connected: boolean, networkName?: string): boolean => {
  return connected && networkName === Network.MAINNET;
};