import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Copy,
  Eye,
  EyeOff,
  Info,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import {
  useAddBeneficiary,
  useGetBeneficiaries,
  useRemoveBeneficiary,
} from "../../hooks/useQueries";
import { getOrCreateCapsuleCode } from "../../utils/capsuleCode";
import { hashPassword } from "../../utils/crypto";
import { formatTime } from "../../utils/crypto";

export default function BeneficiariesTab() {
  const { data: beneficiaries = [], isLoading } = useGetBeneficiaries();
  const addBeneficiary = useAddBeneficiary();
  const removeBeneficiary = useRemoveBeneficiary();
  const { identity } = useInternetIdentity();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const ownerPrincipal = identity?.getPrincipal().toString() ?? "";
  const appUrl = window.location.origin;

  // Generate / retrieve the short capsule code for this owner
  const capsuleCode = ownerPrincipal
    ? getOrCreateCapsuleCode(ownerPrincipal)
    : null;
  const shareableLink = capsuleCode ? `${appUrl}/access/${capsuleCode}` : null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.displayName.trim()) e.displayName = "Display name is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (form.username.includes(" "))
      e.username = "Username cannot contain spaces";
    if (form.password.length < 8)
      e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    return e;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) {
      setErrors(e2);
      return;
    }
    setErrors({});

    try {
      const hashedPwd = await hashPassword(form.password);
      await addBeneficiary.mutateAsync({
        username: form.username.trim(),
        hashedPassword: hashedPwd,
        displayName: form.displayName.trim(),
      });
      toast.success(`${form.displayName} added as beneficiary`);
      setAddOpen(false);
      setForm({
        displayName: "",
        username: "",
        password: "",
        confirmPassword: "",
      });
    } catch {
      toast.error("Failed to add beneficiary");
    }
  };

  const handleRemove = async (username: string) => {
    try {
      await removeBeneficiary.mutateAsync(username);
      toast.success("Beneficiary removed");
    } catch {
      toast.error("Failed to remove beneficiary");
    }
  };

  const handleCopyAccess = (username: string) => {
    const info = shareableLink
      ? `Cloud Capsule Access:\nLink: ${shareableLink}\nCapsule Code: ${capsuleCode}\nUsername: ${username}\nPassword: (set by owner)`
      : `Cloud Capsule Access:\nURL: ${appUrl}/access\nCapsule Owner ID: ${ownerPrincipal}\nUsername: ${username}\nPassword: (set by owner)`;
    navigator.clipboard.writeText(info);
    toast.success("Access info copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Beneficiaries
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            People who can access your capsule when you grant them permission.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          data-ocid="beneficiaries.add_button"
          className="gap-2 bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Beneficiary
        </Button>
      </div>

      {/* Info box */}
      <Alert
        className="border-none"
        style={{
          background: "oklch(0.67 0.18 230 / 0.07)",
          borderLeft: "3px solid oklch(0.67 0.18 230 / 0.5)",
        }}
      >
        <Info className="w-4 h-4" style={{ color: "oklch(0.67 0.18 230)" }} />
        <AlertDescription className="text-sm">
          Share the <strong>short Capsule Code</strong> OR the{" "}
          <strong>shareable link</strong>, plus their username and password,
          with each beneficiary.
        </AlertDescription>
      </Alert>

      {/* Capsule Code */}
      {capsuleCode && (
        <div
          className="capsule-card p-5 space-y-3"
          data-ocid="beneficiaries.code_card"
        >
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              Your Capsule Code
            </p>
            <p className="text-xs text-muted-foreground/70">
              Share this short code with beneficiaries instead of the long
              principal ID
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-sm font-mono font-semibold px-3 py-2 rounded-lg tracking-widest"
              style={{
                background: "oklch(0.67 0.18 230 / 0.1)",
                color: "oklch(0.78 0.16 230)",
                border: "1px solid oklch(0.67 0.18 230 / 0.25)",
              }}
            >
              {capsuleCode}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(capsuleCode);
                toast.success("Capsule code copied");
              }}
              data-ocid="beneficiaries.code_copy_button"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Shareable Link */}
      {shareableLink && (
        <div
          className="capsule-card p-5 space-y-3"
          style={{
            border: "1px solid oklch(0.67 0.18 230 / 0.4)",
            boxShadow:
              "0 0 18px oklch(0.67 0.18 230 / 0.1), inset 0 0 0 1px oklch(0.67 0.18 230 / 0.05)",
          }}
          data-ocid="beneficiaries.link_card"
        >
          <div className="flex items-center gap-2">
            <Link2
              className="w-4 h-4 flex-shrink-0"
              style={{ color: "oklch(0.72 0.18 225)" }}
            />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Shareable Access Link
              </p>
              <p className="text-xs text-muted-foreground/70">
                Send this link — beneficiaries just click and enter their
                credentials
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-xs font-mono px-3 py-2 rounded-lg break-all"
              style={{
                background: "oklch(0.17 0.045 265 / 0.6)",
                color: "oklch(0.78 0.14 230)",
                border: "1px solid oklch(0.67 0.18 230 / 0.2)",
              }}
            >
              {shareableLink}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(shareableLink);
                toast.success("Link copied to clipboard");
              }}
              data-ocid="beneficiaries.link_copy_button"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Advanced: Full Principal ID */}
      <div className="capsule-card p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Advanced: Full Principal ID
        </p>
        <p className="text-xs text-muted-foreground/60">
          Legacy identifier for beneficiaries who received your full principal
          ID before short codes were introduced
        </p>
        <div className="flex items-center gap-2">
          <code
            className="flex-1 text-xs font-mono text-foreground break-all p-2 rounded-md"
            style={{ background: "oklch(0.17 0.045 265 / 0.6)" }}
          >
            {ownerPrincipal || "Not available"}
          </code>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(ownerPrincipal);
              toast.success("Principal copied");
            }}
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton
              key={i}
              className="h-20 rounded-xl"
              data-ocid="beneficiaries.loading_state"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && beneficiaries.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          data-ocid="beneficiaries.empty_state"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "oklch(0.67 0.18 230 / 0.1)" }}
          >
            <Users
              className="w-6 h-6"
              style={{ color: "oklch(0.67 0.18 230)" }}
            />
          </div>
          <p className="font-display font-semibold text-foreground mb-1">
            No beneficiaries yet
          </p>
          <p className="text-muted-foreground text-sm max-w-xs">
            Add your loved ones so they can access your capsule when the time
            comes.
          </p>
        </div>
      )}

      {/* Beneficiary list */}
      {!isLoading && beneficiaries.length > 0 && (
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {beneficiaries.map((b, idx) => (
            <motion.div
              key={b.id}
              className="capsule-card p-5 flex items-center justify-between gap-4"
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0 },
              }}
              data-ocid={`beneficiaries.item.${idx + 1}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-display font-semibold text-sm"
                  style={{
                    background: "oklch(0.67 0.18 230 / 0.12)",
                    color: "oklch(0.72 0.18 225)",
                  }}
                >
                  {b.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {b.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">@{b.username}</p>
                  {b.createdAt && (
                    <p className="text-xs text-muted-foreground/60">
                      Added {formatTime(b.createdAt)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs hidden sm:flex"
                  onClick={() => handleCopyAccess(b.username)}
                >
                  <Copy className="w-3 h-3" />
                  Copy Access
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      data-ocid={`beneficiaries.remove_button.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Remove {b.displayName}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        They will no longer be able to access your capsule.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-ocid="beneficiaries.cancel_button">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemove(b.username)}
                        data-ocid="beneficiaries.confirm_button"
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add Beneficiary Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setForm({
              displayName: "",
              username: "",
              password: "",
              confirmPassword: "",
            });
            setErrors({});
          }
        }}
      >
        <DialogContent className="max-w-md" data-ocid="beneficiaries.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Add Beneficiary</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={form.displayName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayName: e.target.value }))
                }
                placeholder="e.g. Sarah (daughter)"
                autoFocus
                data-ocid="beneficiaries.input"
              />
              {errors.displayName && (
                <p className="text-xs text-destructive">{errors.displayName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
                placeholder="e.g. sarah_smith"
              />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Minimum 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                placeholder="Repeat password"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
            <div
              className="rounded-lg p-3 text-xs space-y-1"
              style={{ background: "oklch(0.67 0.18 230 / 0.07)" }}
            >
              <p className="font-medium text-foreground">Remember to share:</p>
              {shareableLink ? (
                <>
                  <p className="text-muted-foreground">
                    • Shareable link:{" "}
                    <strong className="break-all">{shareableLink}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    • Or Capsule Code: <strong>{capsuleCode}</strong>
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  • The app URL: <strong>{appUrl}/access</strong>
                </p>
              )}
              <p className="text-muted-foreground">
                • Their username and password
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                data-ocid="beneficiaries.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addBeneficiary.isPending}
                data-ocid="beneficiaries.save_button"
                className="bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
              >
                {addBeneficiary.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Beneficiary"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
