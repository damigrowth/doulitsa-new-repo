import { useSubscriptionSheetStore } from '@/lib/stores/use-subscription-sheet-store';

export function useSubscriptionGate() {
  const { open } = useSubscriptionSheetStore();

  const openUpgradeSheet = (reason?: string) => {
    open(reason);
  };

  return { openUpgradeSheet };
}
