import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Array "mo:core/Array";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Timer "mo:core/Timer";

import Storage "mo:caffeineai-object-storage/Storage";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import AccessControl "mo:caffeineai-authorization/access-control";

import ShareLinkTypes "types/sharelinks";
import ShareLinkLib "lib/sharelinks";

actor {
  type Result<T, E> = { #ok : T; #err : E };

  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinObjectStorage();

  module Capsule {
    public func compare(capsule1 : Capsule, capsule2 : Capsule) : Order.Order {
      Text.compare(capsule1.owner.toText(), capsule2.owner.toText());
    };
  };

  module Note {
    public func compare(note1 : Note, note2 : Note) : Order.Order {
      Text.compare(note1.title, note2.title);
    };
  };

  module Media {
    public func compare(media1 : Media, media2 : Media) : Order.Order {
      Text.compare(media1.title, media2.title);
    };
  };

  module Document {
    public func compare(doc1 : Document, doc2 : Document) : Order.Order {
      Text.compare(doc1.title, doc2.title);
    };
  };

  module Beneficiary {
    public func compare(beneficiary1 : Beneficiary, beneficiary2 : Beneficiary) : Order.Order {
      Text.compare(beneficiary1.username, beneficiary2.username);
    };
  };

  public type UserProfile = {
    name : Text;
    email : ?Text;
  };

  type Media = {
    id : Text;
    title : Text;
    blobId : Text;
    mediaType : MediaType;
    createdAt : Time.Time;
  };

  type MediaType = { #photo; #video };

  type Document = {
    id : Text;
    title : Text;
    blobId : Text;
    documentType : DocumentType;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type DocumentType = { #pdf; #word; #excel; #powerpoint };

  type Note = {
    id : Text;
    title : Text;
    body : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type Beneficiary = {
    id : Text;
    username : Text;
    hashedPassword : Text;
    displayName : Text;
    createdAt : Time.Time;
  };

  type NeuronEntry = {
    neuronId : Text;
    dissolveDate : Text;
    designatedController : Text;
    votingPreferences : Text;
    notes : Text;
  };

  type Capsule = {
    owner : Principal;
    locked : Bool;
    notes : Map.Map<Text, Note>;
    media : Map.Map<Text, Media>;
    docs : Map.Map<Text, Document>;
    beneficiaries : Map.Map<Text, Beneficiary>;
    neuronEntries : Map.Map<Text, NeuronEntry>;
    globalInstructions : Text;
  };

  type AdminMetrics = {
    totalUsers : Nat;
    totalCapsules : Nat;
    visitCount : Nat;
    totalNotes : Nat;
    totalMedia : Nat;
    totalNeuronEntries : Nat;
  };

  var visitCount : Nat = 0;

  let capsules = Map.empty<Principal, Capsule>();
  let beneficiarySessions = Map.empty<Text, (Principal, Text, Time.Time)>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let shareLinks = Map.empty<Text, ShareLinkTypes.ShareLink>();
  var shareLinkNonce : Nat = 0;

  // User Profile Management (required by instructions)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func recordVisit() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can record visits");
    };
    visitCount += 1;
  };

  public query func isAdminSetup() : async Bool {
    accessControlState.adminAssigned;
  };

  public shared ({ caller }) func setupFirstAdmin() : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to set up admin");
    };
    if (accessControlState.adminAssigned) {
      Runtime.trap("Admin already set up");
    };
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
  };

  public query ({ caller }) func getAdminMetrics() : async AdminMetrics {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Only callable by admin");
    };

    let totalCapsules = capsules.size();
    let totalUsers = userProfiles.size();

    // Calculate totalNotes, totalMedia, and totalNeuronEntries
    var totalNotes : Nat = 0;
    var totalMedia : Nat = 0;
    var totalNeuronEntries : Nat = 0;

    for (capsule in capsules.values()) {
      totalNotes += capsule.notes.size();
      totalMedia += capsule.media.size();
      totalNeuronEntries += capsule.neuronEntries.size();
    };

    let metrics : AdminMetrics = {
      totalUsers;
      totalCapsules;
      visitCount;
      totalNotes;
      totalMedia;
      totalNeuronEntries;
    };
    metrics;
  };

  // Capsule Management
  public shared ({ caller }) func createCapsule() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create capsules");
    };

    if (capsules.containsKey(caller)) {
      Runtime.trap("Capsule already exists");
    };

    let newCapsule : Capsule = {
      owner = caller;
      locked = true;
      notes = Map.empty<Text, Note>();
      media = Map.empty<Text, Media>();
      docs = Map.empty<Text, Document>();
      beneficiaries = Map.empty<Text, Beneficiary>();
      neuronEntries = Map.empty<Text, NeuronEntry>();
      globalInstructions = "";
    };

    capsules.add(caller, newCapsule);
  };

  public shared ({ caller }) func deleteCapsule() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can delete capsules");
    };

    switch (capsules.get(caller)) {
      case (null) { Runtime.trap("Capsule not found") };
      case (?_capsule) {
        capsules.remove(caller);
        userProfiles.remove(caller);
      };
    };
  };

  public shared ({ caller }) func toggleCapsuleLock() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can toggle capsule lock");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can toggle lock");
    };

    let updatedCapsule : Capsule = { capsule with locked = not capsule.locked };
    capsules.add(caller, updatedCapsule);
  };

  public query ({ caller }) func getCapsuleLockStatus(capsuleOwner : Principal) : async Bool {
    switch (capsules.get(capsuleOwner)) {
      case (null) { true }; // Default to locked if capsule does not exist
      case (?capsule) { capsule.locked };
    };
  };

  // Note Management
  public shared ({ caller }) func createNote(title : Text, body : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create notes");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can create notes");
    };

    let noteId = Time.now().toText();
    let newNote : Note = {
      id = noteId;
      title;
      body;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    capsule.notes.add(noteId, newNote);

    noteId;
  };

  public shared ({ caller }) func updateNote(noteId : Text, title : Text, body : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can update notes");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can update notes");
    };

    switch (capsule.notes.get(noteId)) {
      case (null) { Runtime.trap("Note not found") };
      case (?existingNote) {
        let updatedNote : Note = { existingNote with title; body; updatedAt = Time.now() };
        capsule.notes.add(noteId, updatedNote);
      };
    };
  };

  public shared ({ caller }) func deleteNote(noteId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can delete notes");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can delete notes");
    };

    capsule.notes.remove(noteId);
  };

  public query ({ caller }) func getCapsuleNotes(capsuleOwner : Principal) : async [Note] {
    let capsule = getCapsuleByOwner(capsuleOwner);
    verifyReadAccess(caller, capsule);

    capsule.notes.values().toArray().sort();
  };

  // Media Management
  public shared ({ caller }) func createMedia(title : Text, blobId : Text, mediaType : MediaType) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create media");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can create media");
    };

    let mediaId = Time.now().toText();
    let newMedia : Media = {
      id = mediaId;
      title;
      blobId;
      mediaType;
      createdAt = Time.now();
    };

    capsule.media.add(mediaId, newMedia);

    mediaId;
  };

  public shared ({ caller }) func deleteMedia(mediaId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can delete media");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can delete media");
    };

    capsule.media.remove(mediaId);
  };

  public query ({ caller }) func getCapsuleMedia(capsuleOwner : Principal) : async [Media] {
    let capsule = getCapsuleByOwner(capsuleOwner);
    verifyReadAccess(caller, capsule);

    capsule.media.values().toArray().sort();
  };

  // Document Management
  public shared ({ caller }) func createDoc(title : Text, blobId : Text, documentType : DocumentType) : async Document {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create documents");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can create documents");
    };

    let docId = Time.now().toText();
    let newDoc : Document = {
      id = docId;
      title;
      blobId;
      documentType;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    capsule.docs.add(docId, newDoc);

    newDoc;
  };

  public shared ({ caller }) func updateDoc(docId : Text, title : Text) : async Document {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can update documents");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can update documents");
    };

    switch (capsule.docs.get(docId)) {
      case (null) { Runtime.trap("Document not found") };
      case (?existingDoc) {
        let updatedDoc : Document = { existingDoc with title; updatedAt = Time.now() };
        capsule.docs.add(docId, updatedDoc);
        updatedDoc;
      };
    };
  };

  public shared ({ caller }) func deleteDoc(docId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can delete documents");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can delete documents");
    };

    capsule.docs.remove(docId);
  };

  public query ({ caller }) func getCapsuleDocs() : async [Document] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view documents");
    };

    let capsule = getCapsuleByOwner(caller);

    capsule.docs.values().toArray().sort();
  };

  // Neuron Entry Management
  public shared ({ caller }) func createNeuronEntry(
    neuronId : Text,
    dissolveDate : Text,
    designatedController : Text,
    votingPreferences : Text,
    notes : Text,
  ) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create neuron entries");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can create neuron entries");
    };

    let entryId = Time.now().toText();
    let newEntry : NeuronEntry = {
      neuronId;
      dissolveDate;
      designatedController;
      votingPreferences;
      notes;
    };

    capsule.neuronEntries.add(entryId, newEntry);

    entryId;
  };

  public shared ({ caller }) func updateNeuronEntry(
    entryId : Text,
    neuronId : Text,
    dissolveDate : Text,
    designatedController : Text,
    votingPreferences : Text,
    notes : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can update neuron entries");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can update neuron entries");
    };

    let updatedEntry : NeuronEntry = {
      neuronId;
      dissolveDate;
      designatedController;
      votingPreferences;
      notes;
    };

    capsule.neuronEntries.add(entryId, updatedEntry);
  };

  public shared ({ caller }) func deleteNeuronEntry(entryId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can delete neuron entries");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can delete neuron entries");
    };

    capsule.neuronEntries.remove(entryId);
  };

  public query ({ caller }) func getNeuronEntries(capsuleOwner : Principal) : async [NeuronEntry] {
    let capsule = getCapsuleByOwner(capsuleOwner);
    verifyReadAccess(caller, capsule);

    capsule.neuronEntries.values().toArray();
  };

  public shared ({ caller }) func setGlobalInstructions(instructions : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can set global instructions");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can set global instructions");
    };

    let updatedCapsule : Capsule = { capsule with globalInstructions = instructions };
    capsules.add(caller, updatedCapsule);
  };

  public query ({ caller }) func getGlobalInstructions(capsuleOwner : Principal) : async Text {
    let capsule = getCapsuleByOwner(capsuleOwner);
    verifyReadAccess(caller, capsule);

    capsule.globalInstructions;
  };

  // Beneficiary Management
  public shared ({ caller }) func addBeneficiary(username : Text, hashedPassword : Text, displayName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can add beneficiaries");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can add beneficiaries");
    };

    if (capsule.beneficiaries.containsKey(username)) {
      Runtime.trap("Beneficiary already exists");
    };

    let newBeneficiary : Beneficiary = {
      id = Time.now().toText();
      username;
      hashedPassword;
      displayName;
      createdAt = Time.now();
    };

    capsule.beneficiaries.add(username, newBeneficiary);
  };

  public shared ({ caller }) func removeBeneficiary(username : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can remove beneficiaries");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can remove beneficiaries");
    };

    capsule.beneficiaries.remove(username);
  };

  public query ({ caller }) func getBeneficiaries() : async [Beneficiary] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view beneficiaries");
    };

    let capsule = getCapsuleByOwner(caller);

    if (capsule.owner != caller) {
      Runtime.trap("Unauthorized: Only capsule owner can view beneficiaries");
    };

    capsule.beneficiaries.values().toArray().sort();
  };

  // Beneficiary Session Management
  public shared func beneficiaryLogin(capsuleOwner : Principal, username : Text, password : Text) : async Text {
    let capsule = getCapsuleByOwner(capsuleOwner);

    if (capsule.locked) {
      Runtime.trap("Capsule is locked");
    };

    switch (capsule.beneficiaries.get(username)) {
      case (null) { Runtime.trap("Invalid credentials") };
      case (?beneficiary) {
        if (beneficiary.hashedPassword != password) {
          Runtime.trap("Invalid credentials");
        };

        let token = Time.now().toText();
        let expiresAt = Time.now() + 24 * 60 * 60 * 1_000_000_000; // 24 hours in nanoseconds
        beneficiarySessions.add(token, (capsuleOwner, username, expiresAt));

        token;
      };
    };
  };

  public query func validateBeneficiarySession(token : Text) : async ?Principal {
    let currentTime = Time.now();
    switch (beneficiarySessions.get(token)) {
      case (null) { null };
      case (?(owner, username, expiresAt)) {
        if (currentTime > expiresAt) {
          null;
        } else {
          ?owner;
        };
      };
    };
  };

  public query func isLoggedInToBeneficiarySession(token : Text) : async Bool {
    let currentTime = Time.now();
    switch (beneficiarySessions.get(token)) {
      case (null) { false };
      case (?(owner, username, expiresAt)) {
        if (currentTime > expiresAt) {
          false;
        } else {
          switch (capsules.get(owner)) {
            case (null) { false };
            case (?capsule) {
              not capsule.locked;
            };
          };
        };
      };
    };
  };

  public shared func beneficiaryLogout(token : Text) : async () {
    beneficiarySessions.remove(token);
  };

  // Share Link Management
  public shared ({ caller }) func createShareLink(docId : Text, note : Text) : async Result<ShareLinkTypes.ShareLink, Text> {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only authenticated users can create share links");
    };
    let capsule = getCapsuleByOwner(caller);
    if (capsule.owner != caller) {
      return #err("Unauthorized: Only the document owner can create share links");
    };
    if (not capsule.docs.containsKey(docId)) {
      return #err("Document not found");
    };
    let token = ShareLinkLib.generateToken(Time.now(), shareLinkNonce);
    shareLinkNonce += 1;
    ShareLinkLib.createShareLink(shareLinks, token, docId, note);
  };

  public shared ({ caller }) func revokeShareLink(token : Text) : async Result<(), Text> {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only authenticated users can revoke share links");
    };
    // Verify the share link belongs to a doc owned by caller
    switch (shareLinks.get(token)) {
      case (null) { return #err("not_found") };
      case (?link) {
        let capsule = getCapsuleByOwner(caller);
        if (not capsule.docs.containsKey(link.docId)) {
          return #err("Unauthorized: You do not own this share link");
        };
        ShareLinkLib.revokeShareLink(shareLinks, token);
      };
    };
  };

  public query ({ caller }) func getShareLinksForDoc(docId : Text) : async Result<[ShareLinkTypes.ShareLink], Text> {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only authenticated users can list share links");
    };
    let capsule = getCapsuleByOwner(caller);
    if (not capsule.docs.containsKey(docId)) {
      return #err("Document not found");
    };
    #ok(ShareLinkLib.getShareLinksForDoc(shareLinks, docId));
  };

  public query func validateShareLink(token : Text) : async Result<ShareLinkTypes.ShareLinkAccess, Text> {
    ShareLinkLib.validateShareLink(
      shareLinks,
      token,
      func(docId) {
        // Search all capsules for the doc with this id
        var found : ?(Text, Text, Text) = null;
        label search for ((_, capsule) in capsules.entries()) {
          switch (capsule.docs.get(docId)) {
            case (?doc) {
              let dtText = switch (doc.documentType) {
                case (#pdf) { "pdf" };
                case (#word) { "word" };
                case (#excel) { "excel" };
                case (#powerpoint) { "powerpoint" };
              };
              found := ?(doc.blobId, doc.title, dtText);
              break search;
            };
            case (null) {};
          };
        };
        found;
      },
    );
  };

  // Cycle Balance Queries (admin only)
  public shared ({ caller }) func getCycleBalance() : async Nat {
    Runtime.trap("NotImplemented: cyclesBalance");
  };

  public query ({ caller }) func getCanisterId() : async Principal {
    Runtime.trap("NotImplemented: getCanisterId");
  };

  // Helper Functions
  func getCapsuleByOwner(owner : Principal) : Capsule {
    switch (capsules.get(owner)) {
      case (null) { Runtime.trap("Capsule not found") };
      case (?capsule) { capsule };
    };
  };

  func verifyReadAccess(caller : Principal, capsule : Capsule) {
    // Owner always has access
    if (caller == capsule.owner) {
      return;
    };

    // Check if caller is authenticated user with permission
    if (AccessControl.hasPermission(accessControlState, caller, #user)) {
      // Authenticated user but not owner - check if capsule is unlocked
      if (capsule.locked) {
        Runtime.trap("Unauthorized: Capsule is locked");
      };
      return;
    };

    // For beneficiary sessions, they would need to pass their token
    // and we'd validate it separately in the frontend
    // Since query calls don't have session context, beneficiaries
    // must use their session token through a different mechanism

    Runtime.trap("Unauthorized: Access denied");
  };
};
