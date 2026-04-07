import { useCallback, useEffect, useState } from "react";

/**
 * Persists the capsule lock state in localStorage, keyed by principal ID.
 * Defaults to `true` (locked) when no stored value exists.
 */
export function usePersistentLockState(
  principalId: string | null,
): [boolean, (updater: ((prev: boolean) => boolean) | boolean) => void] {
  const storageKey = principalId
    ? `capsule_locked_${principalId}`
    : "capsule_locked_default";

  const readFromStorage = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === null) return true; // default: locked
      return JSON.parse(stored) as boolean;
    } catch {
      return true;
    }
  }, [storageKey]);

  const [capsuleLocked, setInternalState] = useState<boolean>(readFromStorage);

  // Re-read from localStorage when principal changes
  useEffect(() => {
    setInternalState(readFromStorage());
  }, [readFromStorage]);

  const setCapsuleLocked = useCallback(
    (updater: ((prev: boolean) => boolean) | boolean) => {
      setInternalState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    },
    [storageKey],
  );

  return [capsuleLocked, setCapsuleLocked];
}
