import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Loader2,
  Lock,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../../backend.d";

interface SettingsTabProps {
  userProfile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => Promise<void>;
  onDeleteCapsule: () => Promise<void>;
}

export default function SettingsTab({
  userProfile,
  onSaveProfile,
  onDeleteCapsule,
}: SettingsTabProps) {
  const [profileName, setProfileName] = useState(userProfile?.name ?? "");
  const [profileDirty, setProfileDirty] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (userProfile?.name) setProfileName(userProfile.name);
  }, [userProfile?.name]);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    setSavingProfile(true);
    try {
      await onSaveProfile({ name: profileName.trim() });
      setProfileDirty(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteCapsule = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      await onDeleteCapsule();
      // Navigation and toast are handled in DashboardPage
    } catch {
      toast.error("Failed to delete capsule. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your capsule's resources and profile.
        </p>
      </div>

      {/* Profile section */}
      <div className="capsule-card p-6 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <User className="w-4 h-4" style={{ color: "oklch(0.67 0.18 230)" }} />
          <h3 className="font-display font-semibold text-foreground">
            Profile
          </h3>
        </div>
        <div className="space-y-2">
          <Label>Your Name</Label>
          <Input
            value={profileName}
            onChange={(e) => {
              setProfileName(e.target.value);
              setProfileDirty(true);
            }}
            placeholder="Your name"
            data-ocid="settings.input"
          />
        </div>
        {profileDirty && (
          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile || !profileName.trim()}
            size="sm"
            className="gap-2 bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
            data-ocid="settings.save_button"
          >
            {savingProfile ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        )}
      </div>

      {/* Infrastructure & Privacy */}
      <div className="capsule-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Shield
            className="w-4 h-4"
            style={{ color: "oklch(0.67 0.18 230)" }}
          />
          <h3 className="font-display font-semibold text-foreground">
            Your Data &amp; Privacy
          </h3>
        </div>

        <div
          className="rounded-xl px-4 py-4 flex items-start gap-3"
          style={{
            background: "oklch(0.67 0.18 230 / 0.07)",
            border: "1px solid oklch(0.67 0.18 230 / 0.18)",
          }}
        >
          <Lock
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            style={{ color: "oklch(0.67 0.18 230)" }}
          />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">
              Powered by the Internet Computer.
            </span>{" "}
            Cloud Capsule runs on the Internet Computer blockchain. Your notes,
            media, and neuron instructions are stored on-chain and accessible
            only to you and the beneficiaries you designate. Infrastructure and
            cycle costs are managed automatically — you don't need to do
            anything to keep your capsule running.
          </p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          No one — including the app developers — can read, modify, or delete
          your capsule content. Access is controlled entirely by your Internet
          Identity and the beneficiary credentials you set up.
        </p>
      </div>

      {/* Danger Zone */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{
          background: "oklch(0.15 0.035 25 / 0.35)",
          border: "1px solid oklch(0.62 0.22 25 / 0.35)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle
            className="w-4 h-4 flex-shrink-0"
            style={{ color: "oklch(0.72 0.20 25)" }}
          />
          <h3
            className="font-display font-semibold"
            style={{ color: "oklch(0.82 0.14 25)" }}
          >
            Danger Zone
          </h3>
        </div>

        <p
          className="text-sm leading-relaxed"
          style={{ color: "oklch(0.72 0.08 25)" }}
        >
          Permanently delete your capsule and all of its contents — notes,
          media, neuron instructions, and beneficiary accounts. This action
          cannot be undone.
        </p>

        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setDeleteConfirmText("");
          }}
        >
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              data-ocid="settings.delete_button"
              className="gap-2 font-semibold"
              style={{
                background: "oklch(0.18 0.04 25 / 0.5)",
                border: "1px solid oklch(0.62 0.22 25 / 0.5)",
                color: "oklch(0.82 0.14 25)",
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Capsule
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent
            data-ocid="settings.delete_capsule.dialog"
            style={{
              background: "oklch(0.14 0.04 265)",
              border: "1px solid oklch(0.62 0.22 25 / 0.4)",
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle
                className="font-display text-xl flex items-center gap-2"
                style={{ color: "oklch(0.92 0.02 265)" }}
              >
                <AlertTriangle
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: "oklch(0.72 0.20 25)" }}
                />
                Delete Your Capsule?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div
                  className="space-y-3 text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.05 265)" }}
                >
                  <p>
                    This will permanently delete{" "}
                    <strong className="text-foreground">everything</strong>{" "}
                    inside your capsule:
                  </p>
                  <ul
                    className="space-y-1 pl-4 list-disc"
                    style={{ color: "oklch(0.72 0.20 25)" }}
                  >
                    <li>All notes and messages</li>
                    <li>All photos and videos</li>
                    <li>All neuron instructions</li>
                    <li>All beneficiary accounts</li>
                  </ul>
                  <p>
                    <strong className="text-foreground">
                      This action cannot be undone.
                    </strong>{" "}
                    Your loved ones will lose access permanently.
                  </p>
                  <div className="pt-2 space-y-2">
                    <Label
                      htmlFor="delete-confirm-input"
                      className="text-sm font-medium"
                      style={{ color: "oklch(0.82 0.14 25)" }}
                    >
                      Type <span className="font-bold font-mono">DELETE</span>{" "}
                      to confirm
                    </Label>
                    <Input
                      id="delete-confirm-input"
                      data-ocid="settings.delete_capsule.input"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      autoComplete="off"
                      spellCheck={false}
                      style={{
                        background: "oklch(0.10 0.03 265)",
                        border: "1px solid oklch(0.62 0.22 25 / 0.4)",
                        color: "oklch(0.92 0.02 265)",
                      }}
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="gap-2 mt-2">
              <AlertDialogCancel
                data-ocid="settings.delete_capsule.cancel_button"
                disabled={isDeleting}
                style={{
                  background: "oklch(0.18 0.04 265)",
                  border: "1px solid oklch(0.30 0.05 265)",
                  color: "oklch(0.80 0.03 265)",
                }}
              >
                Cancel
              </AlertDialogCancel>
              <Button
                data-ocid="settings.delete_capsule.confirm_button"
                onClick={handleDeleteCapsule}
                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                className="gap-2 font-semibold"
                style={{
                  background:
                    deleteConfirmText === "DELETE" && !isDeleting
                      ? "oklch(0.52 0.22 25)"
                      : "oklch(0.30 0.06 25)",
                  border: "none",
                  color: "white",
                  opacity:
                    deleteConfirmText === "DELETE" && !isDeleting ? 1 : 0.5,
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete My Capsule
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
