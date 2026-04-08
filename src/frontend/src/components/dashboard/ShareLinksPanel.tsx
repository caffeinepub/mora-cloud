import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  Clock,
  Copy,
  Link2,
  Loader2,
  Plus,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateShareLink,
  useGetShareLinksForDoc,
  useRevokeShareLink,
} from "../../hooks/useQueries";
import type { ShareLink } from "../../types/shareLink";

// ── Helpers ───────────────────────────────────────────────────────────────

function formatBigIntDate(ts: bigint): string {
  // backend timestamps in nanoseconds
  return new Date(Number(ts / 1_000_000n)).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isExpired(expiresAt: bigint): boolean {
  return Date.now() > Number(expiresAt / 1_000_000n);
}

function getShareUrl(token: string): string {
  return `${window.location.origin}/share/${token}`;
}

// ── LinkRow ───────────────────────────────────────────────────────────────

function LinkRow({
  link,
  onRevoke,
  revoking,
}: {
  link: ShareLink;
  onRevoke: () => void;
  revoking: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const expired = isExpired(link.expiresAt);
  const inactive = expired || link.revoked;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl(link.token));
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        background: inactive
          ? "oklch(0.16 0.03 265 / 0.5)"
          : "oklch(0.18 0.04 265 / 0.6)",
        border: `1px solid ${inactive ? "oklch(0.26 0.04 265 / 0.3)" : "oklch(0.30 0.07 265 / 0.5)"}`,
        opacity: inactive ? 0.65 : 1,
      }}
      data-ocid="share.link_row"
    >
      {/* Top row: note + status badge */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-sm font-medium text-foreground truncate min-w-0">
          {link.note || (
            <span className="text-muted-foreground italic">No note</span>
          )}
        </p>
        {link.revoked ? (
          <Badge
            variant="outline"
            className="flex-shrink-0 text-xs border-destructive/40 text-destructive"
          >
            Revoked
          </Badge>
        ) : expired ? (
          <Badge
            variant="outline"
            className="flex-shrink-0 text-xs border-muted-foreground/40 text-muted-foreground"
          >
            Expired
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="flex-shrink-0 text-xs border-primary/40 text-primary"
          >
            Active
          </Badge>
        )}
      </div>

      {/* Timestamps */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Created {formatBigIntDate(link.createdAt)}
        </span>
        <span className="flex items-center gap-1">
          {expired ? (
            <>
              <ShieldOff className="w-3 h-3" />
              Expired {formatBigIntDate(link.expiresAt)}
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              Expires {formatBigIntDate(link.expiresAt)}
            </>
          )}
        </span>
      </div>

      {/* Actions row */}
      {!inactive && (
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors truncate"
            aria-label="Copy share link"
            data-ocid="share.copy_link_button"
          >
            {copied ? (
              <Check className="w-3 h-3 text-primary flex-shrink-0" />
            ) : (
              <Copy className="w-3 h-3 flex-shrink-0" />
            )}
            <span className="truncate">
              {getShareUrl(link.token).replace(/^https?:\/\//, "")}
            </span>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRevoke}
            disabled={revoking}
            aria-label="Revoke this share link"
            data-ocid="share.revoke_button"
          >
            {revoking ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── ShareLinksPanel ────────────────────────────────────────────────────────

interface ShareLinksPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docId: string;
  docTitle: string;
}

export function ShareLinksPanel({
  open,
  onOpenChange,
  docId,
  docTitle,
}: ShareLinksPanelProps) {
  const [note, setNote] = useState("");
  const [newLinkToken, setNewLinkToken] = useState<string | null>(null);
  const [newLinkCopied, setNewLinkCopied] = useState(false);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  const { data: links = [], isLoading } = useGetShareLinksForDoc(
    open ? docId : null,
  );
  const createLink = useCreateShareLink();
  const revokeLink = useRevokeShareLink();

  const handleCreate = async () => {
    try {
      const link = await createLink.mutateAsync({ docId, note: note.trim() });
      setNewLinkToken(link.token);
      setNote("");
      toast.success("Share link created");
    } catch {
      toast.error("Failed to create share link");
    }
  };

  const handleCopyNew = async () => {
    if (!newLinkToken) return;
    try {
      await navigator.clipboard.writeText(getShareUrl(newLinkToken));
      setNewLinkCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setNewLinkCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleRevoke = async (token: string) => {
    setRevokingToken(token);
    try {
      await revokeLink.mutateAsync(token);
      if (newLinkToken === token) setNewLinkToken(null);
      toast.success("Share link revoked");
    } catch {
      toast.error("Failed to revoke link");
    } finally {
      setRevokingToken(null);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setNote("");
      setNewLinkToken(null);
      setNewLinkCopied(false);
    }
    onOpenChange(open);
  };

  const activeLinks = links.filter(
    (l) => !l.revoked && !isExpired(l.expiresAt),
  );
  const inactiveLinks = links.filter(
    (l) => l.revoked || isExpired(l.expiresAt),
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        data-ocid="share.panel"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-display flex items-center gap-2">
            <Link2
              className="w-4 h-4"
              style={{ color: "oklch(0.67 0.18 230)" }}
            />
            Share — {docTitle}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Links expire after 1 hour. Only you can create share links.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1 -mr-1">
          {/* Create new link section */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "oklch(0.18 0.05 265 / 0.5)",
              border: "1px solid oklch(0.30 0.07 265 / 0.4)",
            }}
          >
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Create new share link
            </p>

            <div className="space-y-1.5">
              <Label
                htmlFor="share-note"
                className="text-xs text-muted-foreground"
              >
                Note (optional — e.g. "Shared with John")
              </Label>
              <Input
                id="share-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Who is this for?"
                className="h-8 text-sm"
                data-ocid="share.note_input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={createLink.isPending}
              className="w-full h-8 text-sm bg-gradient-to-r from-[oklch(0.6_0.2_255)] to-[oklch(0.55_0.22_290)] border-0 text-white hover:opacity-90 transition-opacity"
              data-ocid="share.create_button"
            >
              {createLink.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  Create Link
                </>
              )}
            </Button>

            {/* Newly created link */}
            {newLinkToken && (
              <div
                className="rounded-lg p-3 space-y-2"
                style={{
                  background: "oklch(0.55 0.18 145 / 0.1)",
                  border: "1px solid oklch(0.55 0.18 145 / 0.3)",
                }}
                data-ocid="share.new_link_box"
              >
                <p className="text-xs font-medium text-primary">
                  ✓ Link created — copy it now
                </p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs text-muted-foreground truncate min-w-0">
                    {getShareUrl(newLinkToken)}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-shrink-0"
                    onClick={handleCopyNew}
                    data-ocid="share.copy_new_link_button"
                  >
                    {newLinkCopied ? (
                      <Check className="w-3 h-3 text-primary" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {newLinkCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Active links */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Active Links ({activeLinks.length})
            </p>

            {isLoading && (
              <div className="space-y-2" data-ocid="share.loading_state">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            )}

            {!isLoading && activeLinks.length === 0 && (
              <div
                className="flex flex-col items-center justify-center py-8 text-center rounded-xl"
                style={{ border: "1px dashed oklch(0.26 0.05 265 / 0.5)" }}
                data-ocid="share.empty_state"
              >
                <Link2 className="w-6 h-6 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No active share links yet
                </p>
              </div>
            )}

            {!isLoading &&
              activeLinks.map((link) => (
                <LinkRow
                  key={link.token}
                  link={link}
                  onRevoke={() => handleRevoke(link.token)}
                  revoking={revokingToken === link.token}
                />
              ))}
          </div>

          {/* Inactive / history */}
          {inactiveLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Expired / Revoked
              </p>
              {inactiveLinks.map((link) => (
                <LinkRow
                  key={link.token}
                  link={link}
                  onRevoke={() => handleRevoke(link.token)}
                  revoking={revokingToken === link.token}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
