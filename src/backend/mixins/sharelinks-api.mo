import Map "mo:core/Map";
import Result "mo:core/Result";
import Runtime "mo:core/Runtime";
import Types "../types/sharelinks";
import ShareLinkLib "../lib/sharelinks";

mixin (shareLinks : Map.Map<Text, Types.ShareLink>) {
  /// Create a share link for a document. Owner-only.
  public shared func createShareLink(docId : Text, note : Text) : async Result.Result<Types.ShareLink, Text> {
    Runtime.trap("not implemented");
  };

  /// Revoke a share link by token. Owner-only.
  public shared func revokeShareLink(token : Text) : async Result.Result<(), Text> {
    Runtime.trap("not implemented");
  };

  /// List all share links for a document. Owner-only.
  public shared func getShareLinksForDoc(docId : Text) : async Result.Result<[Types.ShareLink], Text> {
    Runtime.trap("not implemented");
  };

  /// Validate a share link token. Public — no authentication required.
  public shared func validateShareLink(token : Text) : async Result.Result<Types.ShareLinkAccess, Text> {
    Runtime.trap("not implemented");
  };
};
