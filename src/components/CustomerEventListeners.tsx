import { useState, useEffect, useLayoutEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import toast from 'react-hot-toast';
import { getAptosClient } from '@/utils/aptos';
import { GetEventsResponse } from '@aptos-labs/ts-sdk';

const CustomerEventListeners = () => {
  const { account } = useWallet();
  const [lastCheckedVersion, setLastCheckedVersion] = useState<string | null>(null);
  const [pauseFetching, setPauseFetching] = useState(false);
  const aptos = getAptosClient();

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

    const resp = await aptos.getEvents({
      options: {
        where: {
          account_address: {
            _eq: "0x0000000000000000000000000000000000000000000000000000000000000000",
          },
          sequence_number: {
            _eq: "0",
          },
          creation_number: {
            _eq: "0",
          },
          indexed_type: {
            _eq: `0x3e8b6b010d432f652a612db7afdb7b80c42f1b96b05e1e8e2abfbaa1b03f5299::AptRewardsEvents::${eventHandle}`,
          },
          data: {
            _contains: {
              customer: account?.address,
            },
          },
        },
      },
    });

    return resp as GetEventsResponse;
  };

  const processEvents = (events: GetEventsResponse, eventType: string) => {
    // Sort events by version in ascending order
    const sortedEvents = events.sort((a, b) => 
      Number(BigInt(a.transaction_version) - BigInt(b.transaction_version))
    );

    for (const event of sortedEvents) {
      if (BigInt(event.transaction_version) > BigInt(lastCheckedVersion || "0")) {
        if (event.data.customer === account?.address) {
          if (eventType === 'EarnPoints') {
            toast.success(`You earned ${event.data.amount} points in program ${event.data.program_id}`);
          } else if (eventType === 'RedeemVoucher') {
            toast.success(`You redeemed voucher ${event.data.voucher_id} in program ${event.data.program_id}`);
          }
        }
        setLastCheckedVersion(event.transaction_version);
      }
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