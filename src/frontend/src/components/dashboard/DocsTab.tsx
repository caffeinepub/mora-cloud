import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Files,
  Link2,
  Loader2,
  Pencil,
  Presentation,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { Document } from "../../backend.d";
import { DocumentType } from "../../backend.d";
import { useBlobUpload } from "../../hooks/useBlobUpload";
import {
  useCreateDoc,
  useDeleteDoc,
  useGetCapsuleDocs,
  useUpdateDoc,
} from "../../hooks/useQueries";
import { formatTime } from "../../utils/crypto";
import { ShareLinksPanel } from "./ShareLinksPanel";

// ── Helpers ───────────────────────────────────────────────────────────────

const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

const EXT_TO_TYPE: Record<string, DocumentType> = {
  pdf: DocumentType.pdf,
  doc: DocumentType.word,
  docx: DocumentType.word,
  xls: DocumentType.excel,
  xlsx: DocumentType.excel,
  ppt: DocumentType.powerpoint,
  pptx: DocumentType.powerpoint,
};

function getDocTypeFromFile(file: File): DocumentType {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_TYPE[ext] ?? DocumentType.pdf;
}

export function getExtFromDocType(type: DocumentType): string {
  switch (type) {
    case DocumentType.pdf:
      return ".pdf";
    case DocumentType.word:
      return ".docx";
    case DocumentType.excel:
      return ".xlsx";
    case DocumentType.powerpoint:
      return ".pptx";
  }
}

const DOC_MIME: Record<DocumentType, string> = {
  [DocumentType.pdf]: "application/pdf",
  [DocumentType.word]:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  [DocumentType.excel]:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  [DocumentType.powerpoint]:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

interface DocTypeConfig {
  label: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  color: string;
  bg: string;
}

const DOC_TYPE_CONFIG: Record<DocumentType, DocTypeConfig> = {
  [DocumentType.pdf]: {
    label: "PDF",
    icon: FileText,
    color: "oklch(0.65 0.2 25)",
    bg: "oklch(0.65 0.2 25 / 0.12)",
  },
  [DocumentType.word]: {
    label: "Word",
    icon: FileText,
    color: "oklch(0.55 0.18 230)",
    bg: "oklch(0.55 0.18 230 / 0.12)",
  },
  [DocumentType.excel]: {
    label: "Excel",
    icon: FileSpreadsheet,
    color: "oklch(0.58 0.18 145)",
    bg: "oklch(0.58 0.18 145 / 0.12)",
  },
  [DocumentType.powerpoint]: {
    label: "PowerPoint",
    icon: Presentation,
    color: "oklch(0.65 0.22 40)",
    bg: "oklch(0.65 0.22 40 / 0.12)",
  },
};

// ── PDF Viewer Modal ──────────────────────────────────────────────────────

function PdfViewerModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 0.75)" }}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      aria-modal="true"
      aria-label={`Viewing ${title}`}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "oklch(0.14 0.03 265)",
          border: "1px solid oklch(0.26 0.05 265 / 0.6)",
          height: "min(90vh, 900px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid oklch(0.26 0.05 265 / 0.5)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText
              className="w-4 h-4 flex-shrink-0"
              style={{ color: "oklch(0.65 0.2 25)" }}
            />
            <span className="font-medium text-sm text-foreground truncate">
              {title}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={onClose}
            aria-label="Close viewer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {/* PDF iframe */}
        <iframe
          src={url}
          title={title}
          className="flex-1 w-full"
          style={{ border: "none", background: "#fff" }}
        />
      </div>
    </div>
  );
}

// ── DocRow ────────────────────────────────────────────────────────────────

function DocRow({
  doc,
  idx,
  onDelete,
  onRename,
  onShare,
}: {
  doc: Document;
  idx: number;
  onDelete: () => void;
  onRename: (title: string) => Promise<void>;
  onShare: () => void;
}) {
  const { getBlobUrl } = useBlobUpload();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(doc.title);
  const [renaming, setRenaming] = useState(false);

  // View state (PDF inline modal only)
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);

  // Download state
  const [downloading, setDownloading] = useState(false);

  const config = DOC_TYPE_CONFIG[doc.documentType];
  const DocIcon = config.icon;
  const isPdf = doc.documentType === DocumentType.pdf;

  // VIEW: PDFs open in inline modal; Office docs open in Google Docs Viewer
  const handleView = useCallback(async () => {
    setViewing(true);
    try {
      const url = await getBlobUrl(doc.blobId);
      if (isPdf) {
        setViewUrl(url);
      } else {
        // Google Docs Viewer for Word/Excel/PowerPoint
        const viewerUrl = `https://docs.google.com/gviewer?url=${encodeURIComponent(url)}&embedded=true`;
        window.open(viewerUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Could not open document. Please try again.");
    } finally {
      setViewing(false);
    }
  }, [getBlobUrl, doc.blobId, isPdf]);

  // DOWNLOAD: fetch bytes → Blob with correct MIME → anchor click
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const cdnUrl = await getBlobUrl(doc.blobId);
      const response = await fetch(cdnUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const mime = DOC_MIME[doc.documentType];
      const blob = new Blob([arrayBuffer], { type: mime });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${doc.title}${getExtFromDocType(doc.documentType)}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      toast.success("Download started");
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [getBlobUrl, doc.blobId, doc.documentType, doc.title]);

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim() || renameValue.trim() === doc.title) {
      setRenameOpen(false);
      return;
    }
    setRenaming(true);
    try {
      await onRename(renameValue.trim());
      setRenameOpen(false);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <>
      <motion.div
        className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors hover:bg-muted/20"
        style={{ border: "1px solid oklch(0.26 0.05 265 / 0.5)" }}
        variants={{
          hidden: { opacity: 0, y: 8 },
          visible: { opacity: 1, y: 0 },
        }}
        data-ocid={`docs.item.${idx + 1}`}
      >
        {/* Doc type icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: config.bg }}
        >
          <DocIcon className="w-5 h-5" style={{ color: config.color }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {doc.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ background: config.bg, color: config.color }}
            >
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(doc.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <TooltipProvider delayDuration={400}>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* VIEW */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleView}
                  disabled={viewing}
                  aria-label={`View ${doc.title}`}
                  data-ocid={`docs.view_button.${idx + 1}`}
                >
                  {viewing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isPdf ? "View" : "View in Google Docs"}
              </TooltipContent>
            </Tooltip>

            {/* DOWNLOAD */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDownload}
                  disabled={downloading}
                  aria-label={`Download ${doc.title}`}
                  data-ocid={`docs.download_button.${idx + 1}`}
                >
                  {downloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Download
              </TooltipContent>
            </Tooltip>

            {/* SHARE */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onShare}
                  aria-label={`Manage share links for ${doc.title}`}
                  data-ocid={`docs.share_button.${idx + 1}`}
                >
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Share
              </TooltipContent>
            </Tooltip>

            {/* RENAME */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setRenameValue(doc.title);
                    setRenameOpen(true);
                  }}
                  aria-label={`Rename ${doc.title}`}
                  data-ocid={`docs.rename_button.${idx + 1}`}
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Rename
              </TooltipContent>
            </Tooltip>

            {/* DELETE */}
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Delete ${doc.title}`}
                      data-ocid={`docs.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Delete
                </TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{doc.title}" will be permanently removed from your capsule.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-ocid="docs.cancel_button">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    data-ocid="docs.confirm_delete_button"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TooltipProvider>
      </motion.div>

      {/* PDF inline viewer */}
      {viewUrl && (
        <PdfViewerModal
          url={viewUrl}
          title={doc.title}
          onClose={() => setViewUrl(null)}
        />
      )}

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm" data-ocid="docs.rename_dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Rename Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-rename">New name</Label>
              <Input
                id="doc-rename"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder={doc.title}
                autoFocus
                data-ocid="docs.rename_input"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
                data-ocid="docs.rename_cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={renaming || !renameValue.trim()}
                data-ocid="docs.rename_submit_button"
                className="bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
              >
                {renaming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── DocsTab ───────────────────────────────────────────────────────────────

export default function DocsTab() {
  const { data: docsList = [], isLoading } = useGetCapsuleDocs();
  const createDoc = useCreateDoc();
  const updateDoc = useUpdateDoc();
  const deleteDoc = useDeleteDoc();
  const { isUploading, progress, uploadFile } = useBlobUpload();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [shareDoc, setShareDoc] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !title.trim()) return;

    try {
      const docType = getDocTypeFromFile(selectedFile);
      const blobId = await uploadFile(selectedFile);

      await createDoc.mutateAsync({
        title: title.trim(),
        blobId,
        documentType: docType,
      });

      toast.success("Document added to your capsule");
      setUploadOpen(false);
      setSelectedFile(null);
      setTitle("");
    } catch {
      toast.error("Upload failed. Please try again.");
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteDoc.mutateAsync(docId);
      toast.success("Document removed from capsule");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleRename = async (docId: string, newTitle: string) => {
    try {
      await updateDoc.mutateAsync({ docId, title: newTitle });
      toast.success("Document renamed");
    } catch {
      toast.error("Failed to rename document");
      throw new Error("rename failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Documents
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Store important PDFs, spreadsheets, and presentations for your loved
            ones.
          </p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          data-ocid="docs.upload_button"
          className="gap-2 bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
        >
          <Upload className="w-4 h-4" />
          Upload
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3" data-ocid="docs.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && docsList.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          data-ocid="docs.empty_state"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "oklch(0.67 0.18 230 / 0.1)" }}
          >
            <Files
              className="w-7 h-7"
              style={{ color: "oklch(0.67 0.18 230)" }}
            />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">
            No documents yet
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs mb-5">
            Upload wills, legal papers, financial statements, and other
            important documents for your beneficiaries.
          </p>
          <Button
            onClick={() => setUploadOpen(true)}
            data-ocid="docs.empty_upload_button"
            className="gap-2 bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
          >
            <Upload className="w-4 h-4" />
            Upload your first document
          </Button>
        </div>
      )}

      {/* Documents list */}
      {!isLoading && docsList.length > 0 && (
        <motion.div
          className="space-y-2"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {docsList.map((doc, idx) => (
            <DocRow
              key={doc.id}
              doc={doc}
              idx={idx}
              onDelete={() => handleDelete(doc.id)}
              onRename={(newTitle) => handleRename(doc.id, newTitle)}
              onShare={() => setShareDoc(doc)}
            />
          ))}
        </motion.div>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) {
            setSelectedFile(null);
            setTitle("");
          }
        }}
      >
        <DialogContent className="max-w-md" data-ocid="docs.upload_dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Upload Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Dropzone */}
            <button
              type="button"
              className="w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary/40"
              style={{
                borderColor: selectedFile
                  ? "oklch(0.67 0.18 230 / 0.5)"
                  : "oklch(0.26 0.05 265)",
                background: selectedFile
                  ? "oklch(0.67 0.18 230 / 0.06)"
                  : "transparent",
              }}
              onClick={() => fileInputRef.current?.click()}
              data-ocid="docs.dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={DOC_ACCEPT}
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="space-y-1">
                  {(() => {
                    const cfg =
                      DOC_TYPE_CONFIG[getDocTypeFromFile(selectedFile)];
                    const Icon = cfg.icon;
                    return (
                      <>
                        <Icon
                          className="w-8 h-8 mx-auto mb-2"
                          style={{ color: cfg.color }}
                        />
                        <p className="font-medium text-sm text-foreground truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                          {cfg.label}
                        </p>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    Click to select a document
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    PDF · Word (.doc/.docx) · Excel (.xls/.xlsx) · PowerPoint
                    (.ppt/.pptx)
                  </p>
                </>
              )}
            </button>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="doc-title">Document name</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Last Will and Testament"
                data-ocid="docs.title_input"
              />
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-2" data-ocid="docs.progress">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Uploading…</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadOpen(false)}
                data-ocid="docs.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isUploading ||
                  createDoc.isPending ||
                  !selectedFile ||
                  !title.trim()
                }
                data-ocid="docs.submit_button"
                className="bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
              >
                {isUploading || createDoc.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Links Panel */}
      {shareDoc && (
        <ShareLinksPanel
          open={!!shareDoc}
          onOpenChange={(open) => {
            if (!open) setShareDoc(null);
          }}
          docId={shareDoc.id}
          docTitle={shareDoc.title}
        />
      )}
    </div>
  );
}
