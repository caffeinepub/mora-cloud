import { useActor as useCoreActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { Backend } from "../backend";

/**
 * Thin wrapper around the core-infrastructure useActor hook,
 * pre-configured with this project's createActor function.
 */
export function useActor(): { actor: Backend | null; isFetching: boolean } {
  return useCoreActor(createActor);
}
