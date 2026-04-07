import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Principal } from "@dfinity/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Brain,
  Download,
  FileText,
  Heart,
  ImageIcon,
  Loader2,
  Lock,
  LogOut,
  Play,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Media, Note } from "../backend.d";
import { MediaType } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useBlobUpload } from "../hooks/useBlobUpload";
import {
  type NeuronEntryWithId,
  useGetCapsuleLockStatus,
  useGetCapsuleMedia,
  useGetCapsuleNotes,
  useGetGlobalInstructions,
  useGetNeuronEntries,
} from "../hooks/useQueries";
import { formatTime } from "../utils/crypto";

function MemorialHeader({
  ownerName,
  ownerPrincipal,
  onLogout,
}: {
  ownerName: string | null;
  ownerPrincipal: string;
  onLogout: () => void;
}) {
  return (
    <motion.header
      className="sticky top-0 z-20 border-b border-border/60 backdrop-blur-sm"
      style={{ background: "oklch(0.13 0.04 265 / 0.92)" }}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/assets/uploads/4FFBD3E5-2A6D-4DA4-B19E-16EFB7B05C9D-1.png"
            alt="Cloud Capsule"
            className="w-8 h-8 object-contain"
          />
          <div>
            <h1 className="font-display text-base font-semibold text-gradient-sky">
              {ownerName ? `${ownerName}'s Capsule` : "Cloud Capsule"}
            </h1>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
              {ownerPrincipal}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="gap-1.5 text-xs text-muted-foreground"
          data-ocid="capsule.button"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </Button>
      </div>
    </motion.header>
  );
}

function NoteCard({ note, idx }: { note: Note; idx: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="capsule-card p-5 cursor-pointer"
      onClick={() => setExpanded((e) => !e)}
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      data-ocid={`capsule.notes.item.${idx + 1}`}
    >
      <div className="flex items-start gap-3">
        <FileText
          className="w-4 h-4 mt-0.5 flex-shrink-0"
          style={{ color: "oklch(0.67 0.18 230)" }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-foreground text-sm">
            {note.title}
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            {formatTime(note.updatedAt)}
          </p>
          {expanded ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {note.body}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {note.body}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MediaLightbox({
  media,
  url,
  onClose,
}: {
  media: Media;
  url: string;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while lightbox is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <motion.div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleOverlayClick}
      data-ocid="capsule.media.lightbox"
      aria-label={`Viewing: ${media.title}`}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label="Close"
        data-ocid="capsule.media.lightbox.close_button"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Download button (lightbox) — url is already a typed object URL */}
      <button
        type="button"
        className="absolute top-4 right-16 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label="Download"
        onClick={(e) => {
          e.stopPropagation();
          try {
            // Derive a sensible filename from the title; the object URL already has the right MIME
            const ext = media.mediaType === MediaType.video ? ".mp4" : ".jpg";
            const filename = `${media.title.replace(/[^a-z0-9_\-. ]/gi, "_")}${ext}`;
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch {
            // silent — download errors are non-critical in lightbox
          }
        }}
        data-ocid="capsule.media.lightbox.download_button"
      >
        <Download className="w-5 h-5" />
      </button>

      {/* Media content */}
      <motion.div
        className="relative flex items-center justify-center max-w-[90vw] max-h-[85vh]"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {media.mediaType === MediaType.photo ? (
          <img
            src={url}
            alt={media.title}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            draggable={false}
          />
        ) : (
          // biome-ignore lint/a11y/useMediaCaption: personal memory video, captions not applicable
          <video
            src={url}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
          />
        )}
      </motion.div>

      {/* Title bar at bottom */}
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="text-white/70 text-sm font-medium px-4 truncate">
          {media.title}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Captures the first frame of a video from an object URL as a JPEG data URL.
 * Returns an empty string on failure (falls back to <video> element).
 */
async function captureVideoFirstFrameFromUrl(
  objectUrl: string,
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.src = objectUrl;

      const onSeeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve("");
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch {
          resolve("");
        }
      };

      const onLoadedData = () => {
        video.currentTime = 0.001;
      };

      video.addEventListener("loadeddata", onLoadedData, { once: true });
      video.addEventListener("seeked", onSeeked, { once: true });
      video.addEventListener("error", () => resolve(""), { once: true });

      video.load();
    } catch {
      resolve("");
    }
  });
}

function MediaItem({ media, idx }: { media: Media; idx: number }) {
  const { getBlobObjectUrl } = useBlobUpload();
  // objectUrl is a typed blob URL (correct MIME) safe for <img>/<video> AND download
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [ext, setExt] = useState<string>("");
  const [urlLoading, setUrlLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // First-frame thumbnail captured from video blob after it loads
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string>("");

  // Fetch bytes once, detect MIME, create a typed object URL for both preview and download
  useEffect(() => {
    if (!media.blobId) {
      setUrlLoading(false);
      return;
    }
    let cancelled = false;
    let createdUrl = "";
    setUrlLoading(true);
    const isVideo = media.mediaType === MediaType.video;
    getBlobObjectUrl(media.blobId, isVideo)
      .then(({ objectUrl: url, ext: detectedExt }) => {
        if (!cancelled) {
          createdUrl = url;
          setObjectUrl(url);
          setExt(detectedExt);
          setUrlLoading(false);
          // For videos, capture first frame as thumbnail
          if (isVideo) {
            captureVideoFirstFrameFromUrl(url).then((dataUrl) => {
              if (!cancelled && dataUrl) {
                setThumbnailDataUrl(dataUrl);
              }
            });
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setObjectUrl(null);
          setUrlLoading(false);
        }
      });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [media.blobId, media.mediaType, getBlobObjectUrl]);

  const handleDownload = useCallback(async () => {
    if (!objectUrl) return;
    try {
      const filename = `${media.title.replace(/[^a-z0-9_\-. ]/gi, "_")}${ext || (media.mediaType === MediaType.video ? ".mp4" : ".jpg")}`;
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Download failed. Please try again.");
    }
  }, [objectUrl, ext, media.title, media.mediaType]);

  return (
    <>
      <motion.div
        className="capsule-card overflow-hidden group flex flex-col"
        variants={{
          hidden: { opacity: 0, y: 12 },
          visible: { opacity: 1, y: 0 },
        }}
        data-ocid={`capsule.media.item.${idx + 1}`}
      >
        {/* Thumbnail area — clickable to open lightbox */}
        <button
          type="button"
          className="relative w-full bg-muted overflow-hidden cursor-pointer block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          style={{ aspectRatio: "16/9" }}
          onClick={() => objectUrl && setLightboxOpen(true)}
          disabled={urlLoading || !objectUrl}
          aria-label={`View ${media.title} full size`}
          data-ocid={`capsule.media.open_modal_button.${idx + 1}`}
        >
          {urlLoading && <Skeleton className="absolute inset-0 rounded-none" />}

          {!urlLoading && objectUrl && media.mediaType === MediaType.photo && (
            <>
              <img
                src={objectUrl}
                alt={media.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={() => setObjectUrl(null)}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
              </div>
            </>
          )}

          {!urlLoading && objectUrl && media.mediaType === MediaType.video && (
            <>
              {/* Video thumbnail: use captured first-frame image if available, else <video> fallback */}
              {thumbnailDataUrl ? (
                <img
                  src={thumbnailDataUrl}
                  alt={media.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                // biome-ignore lint/a11y/useMediaCaption: personal memory video, captions not applicable
                <video
                  src={objectUrl}
                  preload="metadata"
                  className="w-full h-full object-cover"
                  muted
                  onLoadedData={(e) => {
                    e.currentTarget.currentTime = 0.001;
                  }}
                />
              )}
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors duration-200">
                <div className="bg-white/25 backdrop-blur-sm rounded-full p-3 group-hover:scale-110 transition-transform duration-200">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
              </div>
            </>
          )}

          {!urlLoading && !objectUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              {media.mediaType === MediaType.video ? (
                <Video className="w-8 h-8 text-muted-foreground/40" />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              )}
            </div>
          )}

          {/* Type badge */}
          <div className="absolute top-2 left-2 pointer-events-none">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: "oklch(0.13 0.04 265 / 0.75)",
                color: "oklch(0.82 0.1 225)",
                backdropFilter: "blur(4px)",
              }}
            >
              {media.mediaType === MediaType.video ? (
                <>
                  <Play className="w-2.5 h-2.5" />
                  Video
                </>
              ) : (
                <>
                  <ImageIcon className="w-2.5 h-2.5" />
                  Photo
                </>
              )}
            </span>
          </div>
        </button>

        {/* Card footer with title and download button */}
        <div className="p-4 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-foreground truncate">
              {media.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatTime(media.createdAt)}
            </p>
          </div>

          {objectUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={handleDownload}
              title="Download"
              data-ocid={`capsule.media.download_button.${idx + 1}`}
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && objectUrl && (
          <MediaLightbox
            media={media}
            url={objectUrl}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function NeuronEntryItem({
  entry,
  idx,
}: { entry: NeuronEntryWithId; idx: number }) {
  return (
    <motion.div
      className="capsule-card p-5 space-y-3"
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      data-ocid={`capsule.neurons.item.${idx + 1}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "oklch(0.67 0.18 230 / 0.1)" }}
        >
          <Brain
            className="w-4 h-4"
            style={{ color: "oklch(0.67 0.18 230)" }}
          />
        </div>
        <div>
          <p className="font-display font-semibold text-sm text-foreground">
            Neuron #{entry.neuronId}
          </p>
          {entry.dissolveDate && (
            <p className="text-xs text-muted-foreground">
              Dissolves: {entry.dissolveDate}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-border/50 text-sm">
        {entry.designatedController && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Designated Controller
            </p>
            <p className="font-mono text-xs text-foreground break-all">
              {entry.designatedController}
            </p>
          </div>
        )}
        {entry.votingPreferences && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Voting Preferences
            </p>
            <p className="text-foreground text-sm">{entry.votingPreferences}</p>
          </div>
        )}
        {entry.notes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Notes
            </p>
            <p className="text-foreground text-sm whitespace-pre-wrap">
              {entry.notes}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function BeneficiaryCapsulePage() {
  const { ownerPrincipal: ownerPrincipalStr } = useParams({
    strict: false,
  }) as { ownerPrincipal: string };
  const navigate = useNavigate();
  const { actor } = useActor();

  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [ownerPrincipal, setOwnerPrincipal] = useState<Principal | null>(null);

  const token = localStorage.getItem("beneficiary_session_token") ?? "";

  const validateSession = useCallback(async () => {
    if (!actor || !token) {
      setValidating(false);
      setIsValid(false);
      return;
    }

    try {
      // isLoggedInToBeneficiarySession now also checks capsule.locked on the backend
      const valid = await actor.isLoggedInToBeneficiarySession(token);
      if (valid) {
        const principal = Principal.fromText(ownerPrincipalStr);
        setOwnerPrincipal(principal);
        setIsValid(true);
      } else {
        setIsValid(false);
      }
    } catch {
      setIsValid(false);
    } finally {
      setValidating(false);
    }
  }, [actor, token, ownerPrincipalStr]);

  useEffect(() => {
    if (actor) validateSession();
  }, [actor, validateSession]);

  // Redirect if session is fully invalid (expired / bad token)
  // We only redirect on !isValid after validation; a locked capsule shows
  // a "locked" screen instead of redirecting.
  const ownerPrincipalForLock: Principal | null = (() => {
    try {
      return ownerPrincipalStr ? Principal.fromText(ownerPrincipalStr) : null;
    } catch {
      return null;
    }
  })();

  // Poll lock status every 30s -- if owner locks while beneficiary is viewing,
  // the content hides automatically without requiring a page refresh.
  const { data: capsuleLocked = false } = useGetCapsuleLockStatus(
    ownerPrincipalForLock,
  );

  useEffect(() => {
    if (!validating && !isValid) {
      // Only redirect for truly invalid sessions (bad token / expired)
      // Lock-induced failures are handled by the capsuleLocked screen below
      if (!capsuleLocked) {
        toast.error("Session expired. Please sign in again.");
        navigate({ to: "/access" });
      }
    }
  }, [validating, isValid, capsuleLocked, navigate]);

  const { data: notes = [], isLoading: notesLoading } =
    useGetCapsuleNotes(ownerPrincipal);
  const { data: mediaList = [], isLoading: mediaLoading } =
    useGetCapsuleMedia(ownerPrincipal);
  const { data: neuronEntries = [], isLoading: neuronsLoading } =
    useGetNeuronEntries(ownerPrincipal);
  const { data: globalInstructions = "", isLoading: globalLoading } =
    useGetGlobalInstructions(ownerPrincipal);

  const handleLogout = async () => {
    try {
      if (actor && token) {
        await actor.beneficiaryLogout(token);
      }
    } catch {
      // ignore
    }
    localStorage.removeItem("beneficiary_session_token");
    localStorage.removeItem("beneficiary_capsule_owner");
    navigate({ to: "/" });
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show locked screen if the capsule is locked (either during initial load
  // or because the owner locked it while the beneficiary was already viewing)
  if (capsuleLocked) {
    return (
      <div className="min-h-screen bg-space flex flex-col">
        <header className="px-6 py-5 md:px-12">
          <div className="flex items-center gap-3 max-w-lg mx-auto w-full">
            <img
              src="/assets/uploads/4FFBD3E5-2A6D-4DA4-B19E-16EFB7B05C9D-1.png"
              alt="Cloud Capsule"
              className="w-6 h-6 object-contain"
            />
            <span className="font-display font-semibold text-gradient-sky">
              Cloud Capsule
            </span>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <motion.div
            className="w-full max-w-md text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            data-ocid="capsule.locked_state"
          >
            <div className="capsule-card p-10 space-y-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: "oklch(0.67 0.18 230 / 0.12)" }}
              >
                <Lock
                  className="w-8 h-8"
                  style={{ color: "oklch(0.72 0.18 225)" }}
                />
              </div>
              <div className="space-y-2">
                <h1 className="font-display text-xl font-semibold text-foreground">
                  Capsule is Locked
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This capsule is not currently available. The owner has not
                  unlocked it for access. Please check back later.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-muted-foreground"
                data-ocid="capsule.locked.button"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // If session is not valid and capsule isn't locked, we're mid-redirect
  if (!isValid) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space flex flex-col">
      <MemorialHeader
        ownerName={null}
        ownerPrincipal={ownerPrincipalStr}
        onLogout={handleLogout}
      />

      {/* In memoriam banner */}
      <motion.div
        className="relative overflow-hidden py-10 px-6 text-center"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.67 0.18 230 / 0.08) 0%, oklch(0.58 0.22 285 / 0.06) 100%)",
          borderBottom: "1px solid oklch(0.26 0.05 265)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, oklch(0.67 0.18 230 / 0.1), transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(to right, transparent, oklch(0.67 0.18 230 / 0.4))",
              }}
            />
            <Heart
              className="w-4 h-4"
              style={{ color: "oklch(0.67 0.18 230)" }}
            />
            <div
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(to left, transparent, oklch(0.67 0.18 230 / 0.4))",
              }}
            />
          </div>
          <p className="font-display text-lg italic text-foreground/80">
            "In loving memory — these words and memories were preserved for
            you."
          </p>
          <p className="text-xs text-muted-foreground">
            This is a private capsule. The contents are shared with you out of
            love and trust.
          </p>
        </div>
      </motion.div>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8">
        <Tabs defaultValue="notes">
          <div className="overflow-x-auto pb-1">
            <TabsList
              className="mb-8 gap-1 h-auto p-1 rounded-xl"
              style={{
                background: "oklch(0.17 0.045 265 / 0.7)",
                border: "1px solid oklch(0.26 0.05 265)",
              }}
            >
              {[
                { value: "notes", icon: FileText, label: "Notes" },
                { value: "media", icon: ImageIcon, label: "Photos & Videos" },
                { value: "neurons", icon: Brain, label: "ICP Guidance" },
              ].map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all data-[state=active]:bg-gradient-sky data-[state=active]:text-white data-[state=active]:shadow-cloud-sm"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Notes */}
          <TabsContent value="notes" className="mt-0">
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Notes & Letters
              </h2>
              {notesLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              )}
              {!notesLoading && notes.length === 0 && (
                <div
                  className="text-center py-14"
                  data-ocid="capsule.notes.empty_state"
                >
                  <FileText className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">
                    No notes have been left yet.
                  </p>
                </div>
              )}
              {!notesLoading && notes.length > 0 && (
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.06 } },
                  }}
                >
                  {notes.map((note, idx) => (
                    <NoteCard key={note.id} note={note} idx={idx} />
                  ))}
                </motion.div>
              )}
            </div>
          </TabsContent>

          {/* Media */}
          <TabsContent value="media" className="mt-0">
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Photos & Videos
              </h2>
              {mediaLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="aspect-video rounded-xl" />
                  ))}
                </div>
              )}
              {!mediaLoading && mediaList.length === 0 && (
                <div
                  className="text-center py-14"
                  data-ocid="capsule.media.empty_state"
                >
                  <ImageIcon className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">
                    No photos or videos shared yet.
                  </p>
                </div>
              )}
              {!mediaLoading && mediaList.length > 0 && (
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.06 } },
                  }}
                >
                  {mediaList.map((media, idx) => (
                    <MediaItem key={media.id} media={media} idx={idx} />
                  ))}
                </motion.div>
              )}
            </div>
          </TabsContent>

          {/* Neurons */}
          <TabsContent value="neurons" className="mt-0">
            <div className="space-y-6">
              <h2 className="font-display text-xl font-semibold text-foreground">
                ICP & Neuron Guidance
              </h2>

              {/* Global instructions */}
              {(globalLoading || globalInstructions) && (
                <div className="capsule-card p-6 space-y-3">
                  <h3 className="font-display font-semibold text-foreground text-sm">
                    General Instructions
                  </h3>
                  {globalLoading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {globalInstructions}
                    </p>
                  )}
                </div>
              )}

              {/* Neuron entries */}
              {neuronsLoading && (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              )}
              {!neuronsLoading &&
                neuronEntries.length === 0 &&
                !globalInstructions && (
                  <div
                    className="text-center py-14"
                    data-ocid="capsule.neurons.empty_state"
                  >
                    <Brain className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">
                      No ICP instructions have been added.
                    </p>
                  </div>
                )}
              {!neuronsLoading && neuronEntries.length > 0 && (
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.06 } },
                  }}
                >
                  {neuronEntries.map((entry, idx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: entries may share neuronId
                    <NeuronEntryItem
                      key={`${entry.neuronId}-${idx}`}
                      entry={entry}
                      idx={idx}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-5 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with{" "}
          <Heart className="w-3 h-3 inline text-red-400" /> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
