import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Text "mo:core/Text";

module {
  // Old types (inline copy from .old/src/backend/main.mo)
  type OldNote = {
    id : Text;
    title : Text;
    body : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type OldMediaType = { #photo; #video };

  type OldMedia = {
    id : Text;
    title : Text;
    blobId : Text;
    mediaType : OldMediaType;
    createdAt : Time.Time;
  };

  type OldBeneficiary = {
    id : Text;
    username : Text;
    hashedPassword : Text;
    displayName : Text;
    createdAt : Time.Time;
  };

  type OldNeuronEntry = {
    neuronId : Text;
    dissolveDate : Text;
    designatedController : Text;
    votingPreferences : Text;
    notes : Text;
  };

  type OldCapsule = {
    owner : Principal;
    locked : Bool;
    notes : Map.Map<Text, OldNote>;
    media : Map.Map<Text, OldMedia>;
    beneficiaries : Map.Map<Text, OldBeneficiary>;
    neuronEntries : Map.Map<Text, OldNeuronEntry>;
    globalInstructions : Text;
  };

  // New types
  type DocumentType = { #pdf; #word; #excel; #powerpoint };

  type Document = {
    id : Text;
    title : Text;
    blobId : Text;
    documentType : DocumentType;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type NewCapsule = {
    owner : Principal;
    locked : Bool;
    notes : Map.Map<Text, OldNote>;
    media : Map.Map<Text, OldMedia>;
    docs : Map.Map<Text, Document>;
    beneficiaries : Map.Map<Text, OldBeneficiary>;
    neuronEntries : Map.Map<Text, OldNeuronEntry>;
    globalInstructions : Text;
  };

  type UserProfile = {
    name : Text;
    email : ?Text;
  };

  type OldActor = {
    capsules : Map.Map<Principal, OldCapsule>;
    beneficiarySessions : Map.Map<Text, (Principal, Text, Time.Time)>;
    userProfiles : Map.Map<Principal, UserProfile>;
    var visitCount : Nat;
  };

  type NewActor = {
    capsules : Map.Map<Principal, NewCapsule>;
    beneficiarySessions : Map.Map<Text, (Principal, Text, Time.Time)>;
    userProfiles : Map.Map<Principal, UserProfile>;
    var visitCount : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let newCapsules = old.capsules.map<Principal, OldCapsule, NewCapsule>(
      func(_owner, oldCapsule) {
        { oldCapsule with docs = Map.empty<Text, Document>() }
      }
    );
    {
      capsules = newCapsules;
      beneficiarySessions = old.beneficiarySessions;
      userProfiles = old.userProfiles;
      var visitCount = old.visitCount;
    };
  };
};
