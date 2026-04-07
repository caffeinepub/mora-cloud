import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Copy,
  Link2,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

interface AccessTabProps {
  capsuleLocked: boolean;
  onToggle: () => Promise<void>;
  isToggling: boolean;
  capsuleCode?: string | null;
  shareableLink?: string | null;
}

export default function AccessTab({
  capsuleLocked,
  onToggle,
  isToggling,
  capsuleCode,
  shareableLink,
}: AccessTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="p-2.5 rounded-xl"
          style={{
            background: capsuleLocked
              ? "oklch(0.67 0.18 230 / 0.12)"
              : "oklch(0.58 0.22 285 / 0.12)",
          }}
        >
          {capsuleLocked ? (
            <Lock
              className="w-5 h-5"
              style={{ color: "oklch(0.72 0.18 225)" }}
            />
          ) : (
            <Unlock
              className="w-5 h-5"
              style={{ color: "oklch(0.72 0.18 285)" }}
            />
          )}
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Capsule Access
          </h2>
          <p className="text-xs text-muted-foreground">
            Control who can view your capsule
          </p>
        </div>
      </div>

      {/* Main toggle card */}
      <div
        className="rounded-2xl p-6 border"
        style={{
          background: "oklch(0.17 0.045 265 / 0.7)",
          borderColor: capsuleLocked
            ? "oklch(0.67 0.18 230 / 0.25)"
            : "oklch(0.58 0.22 285 / 0.3)",
          boxShadow: capsuleLocked
            ? "0 0 24px oklch(0.67 0.18 230 / 0.06)"
            : "0 0 24px oklch(0.58 0.22 285 / 0.08)",
        }}
      >
        {/* Status badge */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-muted-foreground">
            Current status
          </span>
          <motion.span
            key={capsuleLocked ? "locked" : "unlocked"}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            data-ocid="access.status_badge"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              background: capsuleLocked
                ? "oklch(0.67 0.18 230 / 0.15)"
                : "oklch(0.58 0.22 285 / 0.15)",
              color: capsuleLocked
                ? "oklch(0.78 0.18 225)"
                : "oklch(0.78 0.18 285)",
              border: `1px solid ${capsuleLocked ? "oklch(0.67 0.18 230 / 0.35)" : "oklch(0.58 0.22 285 / 0.35)"}`,
            }}
          >
            {capsuleLocked ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Unlock className="w-3 h-3" />
            )}
            {capsuleLocked ? "Locked" : "Unlocked"}
          </motion.span>
        </div>

        {/* Toggle row */}
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-1 pr-4">
            <Label
              htmlFor="access-toggle"
              className="text-base font-semibold text-foreground cursor-pointer"
            >
              Allow beneficiary access
            </Label>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {capsuleLocked
                ? "Beneficiaries cannot log in or view your capsule contents."
                : "Beneficiaries with valid credentials can log in and view your capsule."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isToggling && (
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: "oklch(0.72 0.18 225)" }}
              />
            )}
            <Switch
              id="access-toggle"
              data-ocid="access.lock_toggle"
              checked={!capsuleLocked}
              onCheckedChange={() => onToggle()}
              disabled={isToggling}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-sky-500 data-[state=checked]:to-violet-500"
              style={
                {
                  "--switch-checked-bg": "oklch(0.67 0.18 230)",
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      </div>

      {/* Info / warning section */}
      <motion.div
        key={capsuleLocked ? "locked-info" : "unlocked-info"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl p-4 border flex gap-3"
        style={
          capsuleLocked
            ? {
                background: "oklch(0.67 0.18 230 / 0.06)",
                borderColor: "oklch(0.67 0.18 230 / 0.2)",
              }
            : {
                background: "oklch(0.72 0.18 45 / 0.07)",
                borderColor: "oklch(0.72 0.18 45 / 0.25)",
              }
        }
      >
        {capsuleLocked ? (
          <ShieldCheck
            className="w-5 h-5 shrink-0 mt-0.5"
            style={{ color: "oklch(0.72 0.18 225)" }}
          />
        ) : (
          <ShieldAlert
            className="w-5 h-5 shrink-0 mt-0.5"
            style={{ color: "oklch(0.78 0.18 50)" }}
          />
        )}
        <div className="space-y-1">
          <p
            className="text-sm font-semibold"
            style={{
              color: capsuleLocked
                ? "oklch(0.78 0.18 225)"
                : "oklch(0.82 0.18 50)",
            }}
          >
            {capsuleLocked ? "Your capsule is protected" : "Capsule is open"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {capsuleLocked
              ? "Only you can see your notes, media, and neuron instructions. Beneficiaries will be denied access until you unlock it."
              : "When unlocked, beneficiaries can log in using their credentials and view all your notes, media, and neuron instructions. Lock the capsule again to restrict access."}
          </p>
        </div>
      </motion.div>

      {/* Share Your Capsule */}
      <div
        className="rounded-2xl p-6 space-y-5 border"
        style={{
          background: "oklch(0.17 0.045 265 / 0.7)",
          borderColor: "oklch(0.67 0.18 230 / 0.2)",
        }}
      >
        <div className="flex items-center gap-2">
          <Link2
            className="w-5 h-5"
            style={{ color: "oklch(0.72 0.18 225)" }}
          />
          <h3 className="font-display text-base font-semibold text-foreground">
            Share Your Capsule
          </h3>
        </div>

        {capsuleCode ? (
          <>
            {/* Short Code */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Capsule Code
              </p>
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
                  data-ocid="access.code_copy_button"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Shareable Link */}
            {shareableLink && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Shareable Access Link
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Send this link — beneficiaries click it and only need to enter
                  their username and password
                </p>
                <div
                  className="flex items-center gap-2 rounded-xl p-3"
                  style={{
                    background: "oklch(0.67 0.18 230 / 0.07)",
                    border: "1px solid oklch(0.67 0.18 230 / 0.3)",
                    boxShadow: "0 0 14px oklch(0.67 0.18 230 / 0.08)",
                  }}
                >
                  <code
                    className="flex-1 text-xs font-mono break-all"
                    style={{ color: "oklch(0.78 0.14 230)" }}
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
                    data-ocid="access.link_copy_button"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your capsule was created before short codes were available. Share
            your full principal ID (found in the Beneficiaries tab) with
            beneficiaries — they can use it on the{" "}
            <a
              href="/access"
              className="underline underline-offset-2"
              style={{ color: "oklch(0.72 0.18 225)" }}
            >
              access page
            </a>
            .
          </p>
        )}
      </div>
    </motion.div>
  );
}
