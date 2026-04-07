import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Principal } from "@dfinity/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Heart, Loader2, Lock } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { isCapsuleCode, lookupPrincipalByCode } from "../utils/capsuleCode";
import { hashPassword } from "../utils/crypto";

export default function BeneficiaryLoginPage() {
  const navigate = useNavigate();
  const { actor } = useActor();

  // Read optional $code param — present on /access/$code route, undefined on /access
  const params = useParams({ strict: false }) as { code?: string };
  const routeCode = params.code;

  const [form, setForm] = useState({
    ownerPrincipal: routeCode ?? "",
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const usernameRef = useRef<HTMLInputElement>(null);

  // Pre-fill owner field from route param and auto-focus username
  useEffect(() => {
    if (routeCode) {
      setForm((f) => ({ ...f, ownerPrincipal: routeCode! }));
      setTimeout(() => usernameRef.current?.focus(), 100);
    }
  }, [routeCode]);

  const resolveOwnerPrincipal = (input: string): string | null => {
    const trimmed = input.trim();
    if (isCapsuleCode(trimmed)) {
      const resolved = lookupPrincipalByCode(trimmed);
      if (!resolved) return null; // code not found
      return resolved;
    }
    return trimmed; // assume raw principal
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.ownerPrincipal.trim())
      e.ownerPrincipal = "Capsule Code or Owner ID is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.password) e.password = "Password is required";

    const trimmed = form.ownerPrincipal.trim();
    if (trimmed) {
      if (isCapsuleCode(trimmed)) {
        // validate code exists locally
        const resolved = lookupPrincipalByCode(trimmed);
        if (!resolved) {
          e.ownerPrincipal =
            "Code not found. Please check with your capsule owner.";
        }
      } else {
        // validate principal format
        try {
          Principal.fromText(trimmed);
        } catch {
          e.ownerPrincipal =
            "Invalid format. Enter a Capsule Code (CLOUD-XXXXX) or a full principal ID.";
        }
      }
    }
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});

    if (!actor) {
      toast.error("Backend not available. Please try again.");
      return;
    }

    const resolvedPrincipalStr = resolveOwnerPrincipal(form.ownerPrincipal);
    if (!resolvedPrincipalStr) {
      setErrors({
        ownerPrincipal: "Code not found. Please check with your capsule owner.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const ownerPrincipal = Principal.fromText(resolvedPrincipalStr);
      const hashedPwd = await hashPassword(form.password);
      const token = await actor.beneficiaryLogin(
        ownerPrincipal,
        form.username.trim(),
        hashedPwd,
      );

      if (!token) {
        setErrors({ password: "Invalid username or password" });
        return;
      }

      // Store session in localStorage
      localStorage.setItem("beneficiary_session_token", token);
      localStorage.setItem("beneficiary_capsule_owner", resolvedPrincipalStr);

      toast.success("Access granted");
      navigate({
        to: "/capsule/$ownerPrincipal",
        params: { ownerPrincipal: resolvedPrincipalStr },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message.toLowerCase().includes("capsule is locked")) {
        setErrors({
          ownerPrincipal:
            "This capsule is not currently available. The owner has not unlocked it for access.",
        });
      } else if (
        message.toLowerCase().includes("invalid") ||
        message.toLowerCase().includes("password") ||
        message.toLowerCase().includes("credentials")
      ) {
        setErrors({ password: "Invalid username or password" });
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-space flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 md:px-12">
        <div className="flex items-center justify-between max-w-lg mx-auto w-full">
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/assets/uploads/4FFBD3E5-2A6D-4DA4-B19E-16EFB7B05C9D-1.png"
              alt="Cloud Capsule"
              className="w-6 h-6 object-contain"
            />
            <span className="font-display font-semibold text-gradient-sky">
              Cloud Capsule
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="capsule-card p-8 space-y-6">
            {/* Icon + heading */}
            <div className="text-center space-y-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: "oklch(0.67 0.18 230 / 0.1)" }}
              >
                <Lock
                  className="w-7 h-7"
                  style={{ color: "oklch(0.67 0.18 230)" }}
                />
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold text-foreground">
                  Access a Capsule
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Enter the credentials shared with you by the capsule owner.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Owner Code / Principal */}
              <div className="space-y-2">
                <Label htmlFor="owner-principal">
                  Capsule Code or Owner ID
                </Label>
                <Input
                  id="owner-principal"
                  value={form.ownerPrincipal}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ownerPrincipal: e.target.value }))
                  }
                  placeholder="e.g. CLOUD-ABC12 or owner's principal ID"
                  className="font-mono text-sm"
                  autoComplete="off"
                  data-ocid="beneficiary_login.input"
                />
                <p className="text-xs text-muted-foreground/70">
                  Your capsule owner shared a short code (CLOUD-XXXXX) or a full
                  principal ID
                </p>
                {errors.ownerPrincipal && (
                  <p
                    className="text-xs text-destructive"
                    data-ocid="beneficiary_login.error_state"
                  >
                    {errors.ownerPrincipal}
                  </p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  ref={usernameRef}
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                  placeholder="Your username"
                  autoComplete="username"
                />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="Your password"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                  <p
                    className="text-xs text-destructive"
                    data-ocid="beneficiary_login.error_state"
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 gap-2 bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
                disabled={isLoading}
                data-ocid="beneficiary_login.submit_button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Accessing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Access Capsule
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground/70">
              The Capsule Code (or Owner ID) and your credentials were shared by
              the capsule owner. Contact them if you need assistance.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-5 px-6 text-center">
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
