import Time "mo:core/Time";

module {
  /// A share link granting time-limited access to a document.
  public type ShareLink = {
    token : Text;
    docId : Text;
    createdAt : Time.Time;
    expiresAt : Time.Time;
    note : Text;
    revoked : Bool;
  };

  /// Payload returned to a valid share-link visitor.
  public type ShareLinkAccess = {
    docId : Text;
    blobId : Text;
    title : Text;
    documentType : Text;
  };
};
