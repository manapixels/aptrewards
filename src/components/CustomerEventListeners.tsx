import { useState, useEffect, useLayoutEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import toast from 'react-hot-toast';
import { moduleAddress } from '@/constants';

interface Event {
  version: string;
  guid: {
    creation_number: string;
    account_address: string;
  };
  sequence_number: string;
  type: string;
  data: any;
}

const CustomerEventListeners = () => {
  const { account } = useWallet();
  const [lastCheckedVersion, setLastCheckedVersion] = useState<string | null>(null);
  const [pauseFetching, setPauseFetching] = useState(false);

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && pauseFetching) {
      console.log("Tab reopened, resume fetching events");
      setPauseFetching(false);
    } else if (document.visibilityState === 'hidden' && !pauseFetching) {
      console.log("Tab closed, pause fetching events");
      setPauseFetching(true);
    }
  };

  useLayoutEffect(() => {
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const fetchEvents = async (eventHandle: string) => {
    if (!account?.address) return;

    const url = `https://fullnode.testnet.aptoslabs.com/v1/accounts/${moduleAddress}/events/${moduleAddress}::AptRewardsEvents::${eventHandle}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const events: Event[] = await response.json();
    return events;
  };

  const processEvents = (events: Event[], eventType: string) => {
    events.forEach(event => {
      if (event.data.customer === account?.address) {
        if (eventType === 'EarnPoints') {
          toast.success(`You earned ${event.data.amount} points in program ${event.data.program_id}`);
        } else if (eventType === 'RedeemVoucher') {
          toast.success(`You redeemed voucher ${event.data.voucher_id} in program ${event.data.program_id}`);
        }
      }
    });

    if (events.length > 0) {
      setLastCheckedVersion(events[events.length - 1].version);
    }
  };

  const checkForNewEvents = async () => {
    if (pauseFetching) return;

    try {
      const earnPointsEvents = await fetchEvents('EarnPoints');
      const redeemVoucherEvents = await fetchEvents('RedeemVoucher');

      if (earnPointsEvents) processEvents(earnPointsEvents, 'EarnPoints');
      if (redeemVoucherEvents) processEvents(redeemVoucherEvents, 'RedeemVoucher');
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  useEffect(() => {
    if (account?.address) {
      checkForNewEvents();
      const intervalId = setInterval(checkForNewEvents, 10000); // Check every 10 seconds
      return () => clearInterval(intervalId);
    }
  }, [account?.address]);

  return null; // This component doesn't render anything
};

export default CustomerEventListeners;