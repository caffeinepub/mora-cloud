import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Beneficiary,
  Document,
  Media,
  NeuronEntry,
  Note,
  UserProfile,
} from "../backend.d";
import { DocumentType } from "../backend.d";
import type { ShareLink } from "../types/shareLink";
import { useActor } from "./useActor";

// ── Actor with share link extensions ─────────────────────────────────────

interface ShareLinkActor {
  createShareLink(
    docId: string,
    note: string,
  ): Promise<{ ok: ShareLink } | { err: string }>;
  revokeShareLink(token: string): Promise<{ ok: null } | { err: string }>;
  getShareLinksForDoc(
    docId: string,
  ): Promise<{ ok: ShareLink[] } | { err: string }>;
}

// ── User Profile ──────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.getCallerUserProfile();
      // Handle Motoko optional: ?UserProfile comes back as [] | [UserProfile]
      if (result === null || result === undefined) return null;
      if (Array.isArray(result)) return result.length > 0 ? result[0] : null;
      return result;
    },
    enabled: !!actor && !actorFetching,
    retry: 2,
    retryDelay: 1000,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    // Do NOT gate isFetched on actor — the query result is already correct once fetched
    isFetched: query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ── Capsule ───────────────────────────────────────────────────────────────

export function useCreateCapsule() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.createCapsule();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsuleLockStatus"] });
    },
  });
}

export function useToggleCapsuleLock() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.toggleCapsuleLock();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsuleLockStatus"] });
    },
  });
}

export function useGetCapsuleLockStatus(capsuleOwner: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["capsuleLockStatus", capsuleOwner?.toString()],
    queryFn: async () => {
      if (!actor || !capsuleOwner)
        throw new Error("Actor or owner not available");
      return actor.getCapsuleLockStatus(capsuleOwner);
    },
    enabled: !!actor && !isFetching && !!capsuleOwner,
    // Refresh every 30s so beneficiary page detects live lock changes
    refetchInterval: 30_000,
  });
}

// ── Cycle Balance & Canister ID ───────────────────────────────────────────

export function useGetCycleBalance() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint | null>({
    queryKey: ["cycleBalance"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      try {
        return await actor.getCycleBalance();
      } catch (err) {
        // getCycleBalance is not yet implemented on-chain — return null gracefully
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NotImplemented") || msg.includes("cyclesBalance")) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60_000,
  });
}

export function useGetCanisterId() {
  return useQuery<string>({
    queryKey: ["canisterId"],
    queryFn: async () => {
      // 1. Try fetching from env.json (served as static asset, injected at deploy time)
      try {
        const resp = await fetch("/env.json");
        if (resp.ok) {
          const config = await resp.json();
          const id: string | undefined = config?.backend_canister_id;
          if (id && id !== "undefined" && id.trim().length > 0) {
            return id.trim();
          }
        }
      } catch {
        // fall through
      }
      // 2. Fallback: build-time env variable (local dev)
      const id = (process.env.CANISTER_ID_BACKEND as string | undefined) ?? "";
      if (id && id !== "undefined") return id;
      throw new Error("Canister ID not available");
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: 3,
    retryDelay: 1500,
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────

export function useGetCapsuleNotes(capsuleOwner: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Note[]>({
    queryKey: ["capsuleNotes", capsuleOwner?.toString()],
    queryFn: async () => {
      if (!actor || !capsuleOwner)
        throw new Error("Actor or owner not available");
      try {
        return await actor.getCapsuleNotes(capsuleOwner);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Capsule not found")) return [];
        throw err;
      }
    },
    enabled: !!actor && !isFetching && !!capsuleOwner,
  });
}

export function useCreateNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, body }: { title: string; body: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createNote(title, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsuleNotes"] });
    },
  });
}

export function useUpdateNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      title,
      body,
    }: { noteId: string; title: string; body: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateNote(noteId, title, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsuleNotes"] });
    },
  });
}

export function useDeleteNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteNote(noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsuleNotes"] });
    },
  });
}

// ── Media ─────────────────────────────────────────────────────────────────

export function useGetCapsuleMedia(capsuleOwner: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Media[]>({
    queryKey: ["capsuleMedia", capsuleOwner?.toString()],
    queryFn: async () => {
      if (!actor || !capsuleOwner)
        throw new Error("Actor or owner not available");
      try {
        return await actor.getCapsuleMedia(capsuleOwner);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Capsule not found")) return [];
        throw err;
      }
    },
    enabled: !!actor && !isFetching && !!capsuleOwner,
  });
}

export function useCreateMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      blobId,
      mediaType,
    }: {
      title: string;
      blobId: string;
      mediaType: import("../backend.d").MediaType;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createMedia(title, blobId, mediaType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsuleMedia"] });
    },
  });
}

export function useDeleteMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediaId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteMedia(mediaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsuleMedia"] });
    },
  });
}

// ── Neuron Entries ────────────────────────────────────────────────────────

// NeuronEntry with id — we use neuronId as the stable key for update/delete
export type NeuronEntryWithId = NeuronEntry & { id: string };

export function useGetNeuronEntries(capsuleOwner: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<NeuronEntryWithId[]>({
    queryKey: ["neuronEntries", capsuleOwner?.toString()],
    queryFn: async () => {
      if (!actor || !capsuleOwner)
        throw new Error("Actor or owner not available");
      try {
        const entries = await actor.getNeuronEntries(capsuleOwner);
        // Use neuronId as the stable map key for update/delete operations
        return entries.map((e) => ({ ...e, id: e.neuronId }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Capsule not found")) return [];
        throw err;
      }
    },
    enabled: !!actor && !isFetching && !!capsuleOwner,
  });
}

export function useGetGlobalInstructions(capsuleOwner: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: ["globalInstructions", capsuleOwner?.toString()],
    queryFn: async () => {
      if (!actor || !capsuleOwner)
        throw new Error("Actor or owner not available");
      try {
        return await actor.getGlobalInstructions(capsuleOwner);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Capsule not found")) return "";
        throw err;
      }
    },
    enabled: !!actor && !isFetching && !!capsuleOwner,
  });
}

export function useSetGlobalInstructions() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instructions: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setGlobalInstructions(instructions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalInstructions"] });
    },
  });
}

export function useCreateNeuronEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      neuronId: string;
      dissolveDate: string;
      designatedController: string;
      votingPreferences: string;
      notes: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createNeuronEntry(
        entry.neuronId,
        entry.dissolveDate,
        entry.designatedController,
        entry.votingPreferences,
        entry.notes,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neuronEntries"] });
    },
  });
}

export function useUpdateNeuronEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      entryId: string;
      neuronId: string;
      dissolveDate: string;
      designatedController: string;
      votingPreferences: string;
      notes: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      // entryId is the neuronId used as the map key in the backend
      return actor.updateNeuronEntry(
        entry.entryId,
        entry.neuronId,
        entry.dissolveDate,
        entry.designatedController,
        entry.votingPreferences,
        entry.notes,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neuronEntries"] });
    },
  });
}

export function useDeleteNeuronEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!actor) throw new Error("Actor not available");
      // entryId is the neuronId used as the map key in the backend
      return actor.deleteNeuronEntry(entryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neuronEntries"] });
    },
  });
}

// ── Beneficiaries ─────────────────────────────────────────────────────────

export function useGetBeneficiaries() {
  const { actor, isFetching } = useActor();

  return useQuery<Beneficiary[]>({
    queryKey: ["beneficiaries"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getBeneficiaries();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddBeneficiary() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      username,
      hashedPassword,
      displayName,
    }: { username: string; hashedPassword: string; displayName: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addBeneficiary(username, hashedPassword, displayName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });
    },
  });
}

export function useRemoveBeneficiary() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.removeBeneficiary(username);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });
    },
  });
}

// ── Delete Capsule ────────────────────────────────────────────────────────

export function useDeleteCapsule() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteCapsule();
    },
    onSuccess: () => {
      // Invalidate all queries so nothing stale lingers after deletion
      queryClient.clear();
    },
  });
}

// ── Documents ─────────────────────────────────────────────────────────────

export { DocumentType };

export function useGetCapsuleDocs() {
  const { actor, isFetching } = useActor();

  return useQuery<Document[]>({
    queryKey: ["capsuleDocs"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      try {
        return await actor.getCapsuleDocs();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Capsule not found")) return [];
        throw err;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateDoc() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      blobId,
      documentType,
    }: {
      title: string;
      blobId: string;
      documentType: DocumentType;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createDoc(title, blobId, documentType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsuleDocs"] });
    },
  });
}

export function useUpdateDoc() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ docId, title }: { docId: string; title: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateDoc(docId, title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsuleDocs"] });
    },
  });
}

export function useDeleteDoc() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (docId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteDoc(docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsuleDocs"] });
    },
  });
}

// ── Share Links ───────────────────────────────────────────────────────────

function asShareActor(actor: unknown): ShareLinkActor {
  return actor as ShareLinkActor;
}

export function useGetShareLinksForDoc(docId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<ShareLink[]>({
    queryKey: ["shareLinks", docId],
    queryFn: async () => {
      if (!actor || !docId) throw new Error("Actor or docId not available");
      const result = await asShareActor(actor).getShareLinksForDoc(docId);
      if ("err" in result) throw new Error(result.err);
      return result.ok;
    },
    enabled: !!actor && !isFetching && !!docId,
    refetchInterval: 30_000,
  });
}

export function useCreateShareLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      docId,
      note,
    }: {
      docId: string;
      note: string;
    }): Promise<ShareLink> => {
      if (!actor) throw new Error("Actor not available");
      const result = await asShareActor(actor).createShareLink(docId, note);
      if ("err" in result) throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["shareLinks", variables.docId],
      });
    },
  });
}

export function useRevokeShareLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await asShareActor(actor).revokeShareLink(token);
      if ("err" in result) throw new Error(result.err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareLinks"] });
    },
  });
}
