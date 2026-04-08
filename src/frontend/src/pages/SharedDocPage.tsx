import { Button } from "@/components/ui/button";
import { useParams } from "@tanstack/react-router";
import { AlertTriangle, Download, FileText, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useActor } from "../hooks/useActor";

interface ValidateResult {
  docId: string;
  blobId: string;
  title: string;
  documentType: string;
}

type PageState =
  | { status: "loading" }
  | { status: "valid"; data: ValidateResult }
  | { status: "expired" }
  | { status: "not_found" };

// ── Helpers ───────────────────────────────────────────────────────────────

function getViewerUrl(cdnUrl: string, docType: string): string | null {
  if (docType === "pdf") return cdnUrl;
  // Google Docs Viewer for Office files
  return `https://docs.google.com/gviewer?url=${encodeURIComponent(cdnUrl)}&embedded=true`;
}

// ── SharedDocPage ─────────────────────────────────────────────────────────

export default function SharedDocPage() {
  const { token } = useParams({ from: "/share/$token" });
  const { actor, isFetching: actorFetching } = useActor();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [cdnUrl, setCdnUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (actorFetching || !actor) return;

    let cancelled = false;

    async function validate() {
      try {
        const actorWithShare = actor as unknown as {
          validateShareLink(token: string): Promise<
            | {
                ok: {
                  docId: string;
                  blobId: string;
                  title: string;
                  documentType: string;
                };
              }
            | { err: string }
          >;
          _downloadFile(bytes: Uint8Array): Promise<{ getDirectURL(): string }>;
        };

        const result = await actorWithShare.validateShareLink(token);

        if (cancelled) return;

        if ("err" in result && result.err) {
          const errMsg = result.err.toLowerCase();
          if (errMsg.includes("expired") || errMsg.includes("revoked")) {
            setState({ status: "expired" });
          } else {
            setState({ status: "not_found" });
          }
          return;
        }

        if ("ok" in result && result.ok) {
          const docData = result.ok;
          setState({ status: "valid", data: docData });

          // Resolve CDN URL for viewing
          const sentinel = `!caf!${docData.blobId}`;
          const bytes = new TextEncoder().encode(sentinel);
          const blob = await actorWithShare._downloadFile(bytes);
          if (!cancelled) {
            setCdnUrl(blob.getDirectURL());
          }
        } else {
          setState({ status: "not_found" });
        }
      } catch {
        if (!cancelled) setState({ status: "not_found" });
      }
    }

    validate();
    return () => {
      cancelled = true;
    };
  }, [actor, actorFetching, token]);

  const handleDownload = async () => {
    if (!cdnUrl || state.status !== "valid") return;
    setDownloading(true);
    try {
      const response = await fetch(cdnUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();

      const extMap: Record<string, string> = {
        pdf: "application/pdf",
        word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        excel:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        powerpoint:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      };
      const fileExtMap: Record<string, string> = {
        pdf: ".pdf",
        word: ".docx",
        excel: ".xlsx",
        powerpoint: ".pptx",
      };

      const mime =
        extMap[state.data.documentType] ?? "application/octet-stream";
      const ext = fileExtMap[state.data.documentType] ?? "";
      const blob = new Blob([arrayBuffer], { type: mime });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${state.data.title}${ext}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // silent fail — user can try again
    } finally {
      setDownloading(false);
    }
  };

  // ── Render states ──────────────────────────────────────────────────────

  if (state.status === "loading") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background"
        data-ocid="share.loading_state"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying share link…</p>
      </div>
    );
  }

  if (state.status === "expired") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 bg-background"
        data-ocid="share.expired_state"
      >
        <div className="max-w-sm w-full rounded-2xl p-8 text-center space-y-4 bg-card border border-border">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-destructive/10">
            <Lock className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            Link expired or revoked
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This share link has expired or been revoked. The document owner must
            generate a new share link for you to access this file.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Share links are valid for 1 hour from the time they are created.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "not_found") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 bg-background"
        data-ocid="share.not_found_state"
      >
        <div className="max-w-sm w-full rounded-2xl p-8 text-center space-y-4 bg-card border border-border">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-destructive/10">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            Link not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This share link does not exist or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  // ── Valid state ────────────────────────────────────────────────────────

  const viewerUrl = cdnUrl
    ? getViewerUrl(cdnUrl, state.data.documentType)
    : null;

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
      data-ocid="share.doc_viewer"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-card border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {state.data.title}
            </p>
            <p className="text-xs text-muted-foreground">
              Shared document • View only
            </p>
          </div>
        </div>

        <Button
          onClick={handleDownload}
          disabled={downloading || !cdnUrl}
          size="sm"
          className="gap-1.5 flex-shrink-0"
          data-ocid="share.download_button"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Download
        </Button>
      </div>

      {/* Document viewer */}
      <div className="flex-1 relative">
        {!viewerUrl ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <iframe
            src={viewerUrl}
            title={state.data.title}
            className="w-full h-full"
            style={{ border: "none", minHeight: "calc(100vh - 57px)" }}
            data-ocid="share.doc_iframe"
          />
        )}
      </div>
    </div>
  );
}
