'use client';

import { Network, NetworkToNetworkName } from '@aptos-labs/ts-sdk';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { MartianWallet } from '@martianwallet/aptos-wallet-adapter';
import { FewchaWallet } from 'fewcha-plugin-wallet-adapter';
import { PropsWithChildren } from 'react';

// import { useAutoConnect } from './AutoConnectProvider';
import { useToast } from './ui/use-toast';

export const WalletProvider = ({ children }: PropsWithChildren) => {
  // const { autoConnect } = useAutoConnect();
  const { toast } = useToast();

  const wallets = [new FewchaWallet(), new MartianWallet()];

  const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.TESTNET];

  return (
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={true}
      optInWallets={["Petra", "Pontem Wallet"]}
      dappConfig={{
        network: APTOS_NETWORK as Network || Network.TESTNET,
        // aptosConnectDappId: '57fa42a9-29c6-4f1e-939c-4eefa36d9ff5',
        // mizuwallet: {
        //   manifestURL: 'https://assets.mz.xyz/static/config/mizuwallet-connect-manifest.json',
        // },
      }}
      onError={(error) => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error || 'Unknown wallet error',
        });
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
};
