import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cloud, Heart, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface OnboardingModalProps {
  onComplete: (name: string) => Promise<void>;
  isLoading: boolean;
}

export default function OnboardingModal({
  onComplete,
  isLoading,
}: OnboardingModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    setError("");
    await onComplete(name.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "oklch(0.08 0.03 265 / 0.75)",
        backdropFilter: "blur(8px)",
      }}
    >
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.4,
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
      >
        <div className="capsule-card p-8 space-y-6">
          {/* Icon */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-cloud"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.67 0.18 230), oklch(0.58 0.22 285))",
              }}
            >
              <Cloud className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-gradient-sky">
                Create Your Capsule
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Welcome to Cloud Capsule. Let's set up your personal legacy
                vault on the Internet Computer.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Your Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How should your loved ones know you?"
                disabled={isLoading}
                autoFocus
                className="h-11"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div
              className="rounded-lg p-4 text-sm space-y-1.5"
              style={{
                background: "oklch(0.67 0.18 230 / 0.08)",
                border: "1px solid oklch(0.67 0.18 230 / 0.25)",
              }}
            >
              <p
                className="font-medium"
                style={{ color: "oklch(0.72 0.18 225)" }}
              >
                What happens next:
              </p>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>✦ Your private capsule canister is created</li>
                <li>✦ Only you control what gets stored</li>
                <li>✦ You decide when beneficiaries can access it</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full h-11 gap-2 text-white font-semibold glow-sky"
              disabled={isLoading || !name.trim()}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.67 0.18 230), oklch(0.58 0.22 285))",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Capsule...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4" />
                  Create My Capsule
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
