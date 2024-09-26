import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import toast from 'react-hot-toast';
import { getAptosClient } from '@/utils/aptos';
import { GetEventsResponse } from '@aptos-labs/ts-sdk';
import { moduleAddress } from '@/constants';

const CustomerEventListeners = ({ onUpdate }: { onUpdate: () => void }) => {
  const { account } = useWallet();
  const [lastCheckedVersions, setLastCheckedVersions] = useState({
    EarnPoints: BigInt(0),
    RedeemVoucher: BigInt(0)
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [pauseFetching, setPauseFetching] = useState(false);
  const aptos = getAptosClient();

  const onVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      console.log("Tab reopened, resume fetching events");
      setPauseFetching(false);
    } else if (document.visibilityState === 'hidden') {
      console.log("Tab closed, pause fetching events");
      setPauseFetching(true);
    }
  }, [pauseFetching]);

  useLayoutEffect(() => {
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [onVisibilityChange]);

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
            _eq: `${moduleAddress}::AptRewardsEvents::${eventHandle}`,
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

  const processEvents = useCallback((events: GetEventsResponse, eventType: string, showToasts: boolean) => {
    let hasUpdates = false;
    let highestVersion = lastCheckedVersions[eventType as keyof typeof lastCheckedVersions];

    // Sort events by version in ascending order
    const sortedEvents = events.sort((a, b) => 
      Number(BigInt(a.transaction_version) - BigInt(b.transaction_version))
    );

    for (const event of sortedEvents) {
      const eventVersion = BigInt(event.transaction_version);
      if (eventVersion > highestVersion) {
        if (event.data.customer === account?.address) {
          if (showToasts) {
            if (eventType === 'EarnPoints') {
              toast.success(`You earned ${event.data.amount} points in program ${event.data.program_id}`);
            } else if (eventType === 'RedeemVoucher') {
              toast.success(`You redeemed voucher ${event.data.voucher_id} in program ${event.data.program_id}`);
            }
          }
          hasUpdates = true;
        }
        highestVersion = eventVersion > highestVersion ? eventVersion : highestVersion;
      }
    }

    if (highestVersion > lastCheckedVersions[eventType as keyof typeof lastCheckedVersions]) {
      setLastCheckedVersions(prev => ({
        ...prev,
        [eventType]: highestVersion
      }));
    }

    if (hasUpdates) {
      onUpdate();
    }
  }, [lastCheckedVersions, account?.address, onUpdate]);

  const checkForNewEvents = useCallback(async () => {
    if (pauseFetching) {
      // console.log('Fetching paused, skipping this interval');
      return;
    }

    try {
      const earnPointsEvents = await fetchEvents('EarnPoints');
      const redeemVoucherEvents = await fetchEvents('RedeemVoucher');

      const showToasts = isInitialized;

      if (earnPointsEvents) processEvents(earnPointsEvents, 'EarnPoints', showToasts);
      if (redeemVoucherEvents) processEvents(redeemVoucherEvents, 'RedeemVoucher', showToasts);

      if (!isInitialized) {
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, [fetchEvents, processEvents, pauseFetching, isInitialized, account?.address]);

  useEffect(() => {
    if (account?.address) {
      const intervalId = setInterval(() => {
        checkForNewEvents();
      }, 5000); // Check every 5 seconds
      return () => clearInterval(intervalId);
    }
  }, [account?.address, checkForNewEvents]);

  return null; // This component doesn't render anything
};

export default CustomerEventListeners;