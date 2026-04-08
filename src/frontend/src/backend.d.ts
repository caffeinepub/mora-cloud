import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Beneficiary {
    id: string;
    username: string;
    displayName: string;
    createdAt: Time;
    hashedPassword: string;
}
export interface NeuronEntry {
    dissolveDate: string;
    notes: string;
    neuronId: string;
    designatedController: string;
    votingPreferences: string;
}
export type Result_2 = {
    __kind__: "ok";
    ok: Array<ShareLink>;
} | {
    __kind__: "err";
    err: string;
};
export type Time = bigint;
export interface Document {
    id: string;
    title: string;
    documentType: DocumentType;
    createdAt: Time;
    updatedAt: Time;
    blobId: string;
}
export type Result_1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export type Result = {
    __kind__: "ok";
    ok: ShareLinkAccess;
} | {
    __kind__: "err";
    err: string;
};
export type Result_3 = {
    __kind__: "ok";
    ok: ShareLink;
} | {
    __kind__: "err";
    err: string;
};
export interface AdminMetrics {
    totalMedia: bigint;
    visitCount: bigint;
    totalCapsules: bigint;
    totalNotes: bigint;
    totalUsers: bigint;
    totalNeuronEntries: bigint;
}
export interface ShareLinkAccess {
    title: string;
    documentType: string;
    blobId: string;
    docId: string;
}
export interface ShareLink {
    token: string;
    expiresAt: Time;
    revoked: boolean;
    note: string;
    createdAt: Time;
    docId: string;
}
export interface Media {
    id: string;
    title: string;
    createdAt: Time;
    blobId: string;
    mediaType: MediaType;
}
export interface UserProfile {
    name: string;
    email?: string;
}
export interface Note {
    id: string;
    title: string;
    body: string;
    createdAt: Time;
    updatedAt: Time;
}
export enum DocumentType {
    pdf = "pdf",
    word = "word",
    excel = "excel",
    powerpoint = "powerpoint"
}
export enum MediaType {
    video = "video",
    photo = "photo"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addBeneficiary(username: string, hashedPassword: string, displayName: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    beneficiaryLogin(capsuleOwner: Principal, username: string, password: string): Promise<string>;
    beneficiaryLogout(token: string): Promise<void>;
    createCapsule(): Promise<void>;
    createDoc(title: string, blobId: string, documentType: DocumentType): Promise<Document>;
    createMedia(title: string, blobId: string, mediaType: MediaType): Promise<string>;
    createNeuronEntry(neuronId: string, dissolveDate: string, designatedController: string, votingPreferences: string, notes: string): Promise<string>;
    createNote(title: string, body: string): Promise<string>;
    createShareLink(docId: string, note: string): Promise<Result_3>;
    deleteCapsule(): Promise<void>;
    deleteDoc(docId: string): Promise<void>;
    deleteMedia(mediaId: string): Promise<void>;
    deleteNeuronEntry(entryId: string): Promise<void>;
    deleteNote(noteId: string): Promise<void>;
    getAdminMetrics(): Promise<AdminMetrics>;
    getBeneficiaries(): Promise<Array<Beneficiary>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCanisterId(): Promise<Principal>;
    getCapsuleDocs(): Promise<Array<Document>>;
    getCapsuleLockStatus(capsuleOwner: Principal): Promise<boolean>;
    getCapsuleMedia(capsuleOwner: Principal): Promise<Array<Media>>;
    getCapsuleNotes(capsuleOwner: Principal): Promise<Array<Note>>;
    getCycleBalance(): Promise<bigint>;
    getGlobalInstructions(capsuleOwner: Principal): Promise<string>;
    getNeuronEntries(capsuleOwner: Principal): Promise<Array<NeuronEntry>>;
    getShareLinksForDoc(docId: string): Promise<Result_2>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isAdminSetup(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isLoggedInToBeneficiarySession(token: string): Promise<boolean>;
    recordVisit(): Promise<void>;
    removeBeneficiary(username: string): Promise<void>;
    revokeShareLink(token: string): Promise<Result_1>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setGlobalInstructions(instructions: string): Promise<void>;
    setupFirstAdmin(): Promise<void>;
    toggleCapsuleLock(): Promise<void>;
    updateDoc(docId: string, title: string): Promise<Document>;
    updateNeuronEntry(entryId: string, neuronId: string, dissolveDate: string, designatedController: string, votingPreferences: string, notes: string): Promise<void>;
    updateNote(noteId: string, title: string, body: string): Promise<void>;
    validateBeneficiarySession(token: string): Promise<Principal | null>;
    validateShareLink(token: string): Promise<Result>;
}
