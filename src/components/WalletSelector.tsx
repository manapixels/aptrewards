'use client';

import {
  AboutAptosConnect,
  AboutAptosConnectEducationScreen,
  AnyAptosWallet,
  APTOS_CONNECT_ACCOUNT_URL,
  AptosPrivacyPolicy,
  groupAndSortWallets,
  isAptosConnectWallet,
  isInstallRequired,
  truncateAddress,
  useWallet,
  WalletItem,
  WalletSortingOptions,
} from '@aptos-labs/wallet-adapter-react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { ArrowLeft, ArrowRight, ChevronDown, Copy, LogOut, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getAptosClient } from '@/utils/aptos';
import { moduleAddress, moduleName } from '@/constants';
import { UserProgramDetails } from '@/types/aptrewards';


export function WalletSelector(walletSortingOptions: WalletSortingOptions) {
  const { account, connected, disconnect, wallet, network } = useWallet();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<UserProgramDetails[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const closeDialog = useCallback(() => setIsDialogOpen(false), []);

  const copyAddress = useCallback(async () => {
    if (!account?.address) return;
    try {
      await navigator.clipboard.writeText(account.address);
      toast.success('Copied wallet address to clipboard.');
    } catch {
      toast.error('Failed to copy wallet address.');
    }
  }, [account?.address]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!account?.address) return;

      try {
        const resource = await getAptosClient().view({
          payload: {
            function: `${moduleAddress}::${moduleName}::get_user_details`,
            functionArguments: [AccountAddress.fromString('0x3eff8f929e7f170661d0cf17fb51a7a8726b91361d96b68be095639d5eff8db6')],
          }
        });

        const rawDataArray = resource[0] as any[];
        const formattedUserDetails: UserProgramDetails[] = rawDataArray.map((program: any) => {

          const currentTier = program.tiers.reduce((prev: any, current: any) =>
            program.points >= current.pointsRequired ? current : prev
          );

          const nextTier = program.tiers.find((tier: any) => tier.pointsRequired > program.points);

          return {
            programId: program.program_id,
            programName: program.program_name,
            points: program.points,
            lifetimePoints: program.lifetime_points,
            pointValidityDays: program.point_validity_days,
            ownedVouchers: program.owned_vouchers,
            allVouchers: program.all_vouchers,
            tiers: program.tiers,
            currentTier,
            nextTier,
            pointsToNextTier: nextTier ? nextTier.pointsRequired - program.points : null,
          }
        });

        setUserDetails(formattedUserDetails);
      } catch (error) {
        console.error("Error fetching user program details:", error);
      }
    };

    fetchUserDetails();
  }, [account]);

  const networkSupported = network?.name.toLowerCase() === process.env.NEXT_PUBLIC_NETWORK
  const userDisplayName = account?.ansName || truncateAddress(account?.address) || ''
  let displayText = 'Welcome, ' + userDisplayName || 'Unknown' + '!';
  if (!networkSupported) {
    displayText = 'Network not supported. Change to ' + process.env.NEXT_PUBLIC_NETWORK
  }

  console.log(userDetails);

  return connected ? (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button>{displayText}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="py-2">
          <div className="text-lg font-semibold my-3 px-4">{userDisplayName}</div>
          <div className="bg-gray-100 rounded-md p-1.5 flex flex-col gap-2">
            {userDetails.map((program) => (
              <Button
                variant="ghost"
                key={program.programId}
                className="py-2 h-auto w-full text-left flex items-center justify-start gap-3 border border-transparent bg-white hover:bg-white hover:border-gray-900"
                asChild
              >
                <Link href={`/co/${program.programId}`}>
                  <div className="aspect-square w-10 h-10 rounded-md bg-green-600"></div>
                  <div>
                    <h3 className="text-gray-500">{program.programName}</h3>
                    {program.currentTier && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs">Status</span>
                          <span className="font-semibold text-sm">{program.currentTier.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs">Points</span>
                          <span className="font-semibold text-sm">{program.points}</span>
                        </div>
                      </>
                    )}
                  </div>
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <DropdownMenuItem onSelect={copyAddress} className="gap-2">
          <Copy className="h-4 w-4" /> Copy address
        </DropdownMenuItem>
        <DropdownMenuItem>

        </DropdownMenuItem>
        {wallet && isAptosConnectWallet(wallet) && (
          <DropdownMenuItem asChild>
            <a href={APTOS_CONNECT_ACCOUNT_URL} target="_blank" rel="noopener noreferrer" className="flex gap-2">
              <User className="h-4 w-4" /> Account
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={disconnect} className="gap-2">
          <LogOut className="h-4 w-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>Connect a Wallet</Button>
      </DialogTrigger>
      <ConnectWalletDialog close={closeDialog} {...walletSortingOptions} />
    </Dialog>
  );
}

interface ConnectWalletDialogProps extends WalletSortingOptions {
  close: () => void;
}

function ConnectWalletDialog({ close, ...walletSortingOptions }: ConnectWalletDialogProps) {
  const { wallets = [] } = useWallet();

  const { aptosConnectWallets, availableWallets, installableWallets } = groupAndSortWallets(
    wallets,
    walletSortingOptions
  );

  const hasAptosConnectWallets = !!aptosConnectWallets.length;

  return (
    <DialogContent className="max-h-screen overflow-auto">
      <AboutAptosConnect renderEducationScreen={renderEducationScreen}>
        <DialogHeader>
          <DialogTitle className="flex flex-col text-center leading-snug">
            {hasAptosConnectWallets ? (
              <>
                <span>Log in or sign up</span>
                <span>with Social + Aptos Connect</span>
              </>
            ) : (
              'Connect Wallet'
            )}
          </DialogTitle>
        </DialogHeader>

        {hasAptosConnectWallets && (
          <div className="flex flex-col gap-2 pt-3">
            {aptosConnectWallets.map((wallet) => (
              <AptosConnectWalletRow key={wallet.name} wallet={wallet} onConnect={close} />
            ))}
            <p className="flex gap-1 justify-center items-center text-muted-foreground text-sm">
              Learn more about{' '}
              <AboutAptosConnect.Trigger className="flex gap-1 py-3 items-center text-foreground">
                Aptos Connect <ArrowRight size={16} />
              </AboutAptosConnect.Trigger>
            </p>
            <AptosPrivacyPolicy className="flex flex-col items-center py-1">
              <p className="text-xs leading-5">
                <AptosPrivacyPolicy.Disclaimer />{' '}
                <AptosPrivacyPolicy.Link className="text-muted-foreground underline underline-offset-4" />
                <span className="text-muted-foreground">.</span>
              </p>
              <AptosPrivacyPolicy.PoweredBy className="flex gap-1.5 items-center text-xs leading-5 text-muted-foreground" />
            </AptosPrivacyPolicy>
            <div className="flex items-center gap-3 pt-4 text-muted-foreground">
              <div className="h-px w-full bg-secondary" />
              Or
              <div className="h-px w-full bg-secondary" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-3">
          {availableWallets.map((wallet) => (
            <WalletRow key={wallet.name} wallet={wallet} onConnect={close} />
          ))}
          {!!installableWallets.length && (
            <Collapsible className="flex flex-col gap-3">
              <CollapsibleTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-2">
                  More wallets <ChevronDown />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-3">
                {installableWallets.map((wallet) => (
                  <WalletRow key={wallet.name} wallet={wallet} onConnect={close} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </AboutAptosConnect>
    </DialogContent>
  );
}

interface WalletRowProps {
  wallet: AnyAptosWallet;
  onConnect?: () => void;
}

function WalletRow({ wallet, onConnect }: WalletRowProps) {
  return (
    <WalletItem
      wallet={wallet}
      onConnect={onConnect}
      className="flex items-center justify-between px-4 py-3 gap-4 border rounded-md"
    >
      <div className="flex items-center gap-4">
        <WalletItem.Icon className="h-6 w-6" />
        <WalletItem.Name className="text-base font-normal" />
      </div>
      {isInstallRequired(wallet) ? (
        <Button size="sm" variant="ghost" asChild>
          <WalletItem.InstallLink />
        </Button>
      ) : (
        <WalletItem.ConnectButton asChild>
          <Button size="sm">Connect</Button>
        </WalletItem.ConnectButton>
      )}
    </WalletItem>
  );
}

function AptosConnectWalletRow({ wallet, onConnect }: WalletRowProps) {
  return (
    <WalletItem wallet={wallet} onConnect={onConnect}>
      <WalletItem.ConnectButton asChild>
        <Button size="lg" variant="outline" className="w-full gap-4">
          <WalletItem.Icon className="h-5 w-5" />
          <WalletItem.Name className="text-base font-normal" />
        </Button>
      </WalletItem.ConnectButton>
    </WalletItem>
  );
}

function renderEducationScreen(screen: AboutAptosConnectEducationScreen) {
  return (
    <>
      <DialogHeader className="grid grid-cols-[1fr_4fr_1fr] items-center space-y-0">
        <Button variant="ghost" size="icon" onClick={screen.cancel}>
          <ArrowLeft />
        </Button>
        <DialogTitle className="leading-snug text-base text-center">About Aptos Connect</DialogTitle>
      </DialogHeader>

      <div className="flex h-[162px] pb-3 items-end justify-center">
        <screen.Graphic />
      </div>
      <div className="flex flex-col gap-2 text-center pb-4">
        <screen.Title className="text-xl" />
        <screen.Description className="text-sm text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a]:text-foreground" />
      </div>

      <div className="grid grid-cols-3 items-center">
        <Button size="sm" variant="ghost" onClick={screen.back} className="justify-self-start">
          Back
        </Button>
        <div className="flex items-center gap-2 place-self-center">
          {screen.screenIndicators.map((ScreenIndicator, i) => (
            <ScreenIndicator key={i} className="py-4">
              <div className="h-0.5 w-6 transition-colors bg-muted [[data-active]>&]:bg-foreground" />
            </ScreenIndicator>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={screen.next} className="gap-2 justify-self-end">
          {screen.screenIndex === screen.totalScreens - 1 ? 'Finish' : 'Next'}
          <ArrowRight size={16} />
        </Button>
      </div>
    </>
  );
}
