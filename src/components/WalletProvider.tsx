'use client';

import { Network, NetworkToNetworkName } from '@aptos-labs/ts-sdk';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { MartianWallet } from '@martianwallet/aptos-wallet-adapter';
import { FewchaWallet } from 'fewcha-plugin-wallet-adapter';
import { PropsWithChildren } from 'react';
import toast from 'react-hot-toast';

export const WalletProvider = ({ children }: PropsWithChildren) => {

  const wallets = [new FewchaWallet(), new MartianWallet()];

  const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.TESTNET];

  return (
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={true}
      optInWallets={["Petra", "Pontem Wallet"]}
      dappConfig={{
        network: APTOS_NETWORK as Network || Network.TESTNET,
      }}
      onError={(error) => {
        toast.error(error || 'Unknown wallet error');
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
};
