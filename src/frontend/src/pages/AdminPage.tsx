import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Battery,
  BatteryFull,
  BatteryLow,
  Brain,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Image,
  Loader2,
  LogOut,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { AdminMetrics } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { formatCycleBalance } from "../utils/crypto";

// ── Constants ───────────────────────────────────────────────────────────
const DEFAULT_THRESHOLD = 1_000_000_000_000n; // 1T cycles
const THRESHOLD_STORAGE_KEY = "adminCycleThreshold";

function loadThreshold(): bigint {
  try {
    const stored = localStorage.getItem(THRESHOLD_STORAGE_KEY);
    if (stored) return BigInt(stored);
  } catch {
    // ignore
  }
  return DEFAULT_THRESHOLD;
}

function saveThreshold(t: bigint) {
  localStorage.setItem(THRESHOLD_STORAGE_KEY, t.toString());
}

// ── Metric Card ────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: bigint | undefined;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  hue: number;
  ocid: string;
  isLoading?: boolean;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  hue,
  ocid,
  isLoading,
}: MetricCardProps) {
  return (
    <motion.div
      data-ocid={ocid}
      className="relative rounded-2xl p-6 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, oklch(0.18 0.06 ${hue} / 0.7), oklch(0.15 0.04 ${hue} / 0.5))`,
        border: `1px solid oklch(0.55 0.18 ${hue} / 0.25)`,
        boxShadow: `0 4px 24px oklch(0.5 0.18 ${hue} / 0.15), inset 0 0 0 1px oklch(0.55 0.18 ${hue} / 0.06)`,
        backdropFilter: "blur(12px)",
      }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-6 right-6 h-px rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, oklch(0.67 0.18 ${hue} / 0.5), transparent)`,
        }}
      />

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: `oklch(0.55 0.2 ${hue} / 0.18)`,
          border: `1px solid oklch(0.55 0.2 ${hue} / 0.3)`,
        }}
      >
        <Icon
          className="w-5 h-5"
          style={{ color: `oklch(0.75 0.16 ${hue})` }}
        />
      </div>

      {/* Value */}
      {isLoading ? (
        <div
          className="h-10 w-16 rounded-lg mb-1"
          style={{ background: "oklch(0.25 0.04 265 / 0.6)" }}
        >
          <div
            className="h-full rounded-lg animate-pulse"
            style={{ background: `oklch(0.35 0.08 ${hue} / 0.3)` }}
          />
        </div>
      ) : (
        <p
          className="font-display text-4xl font-bold mb-1"
          style={{
            background: `linear-gradient(135deg, oklch(0.82 0.14 ${hue}), oklch(0.68 0.18 ${hue + 30}))`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {value?.toLocaleString() ?? "—"}
        </p>
      )}

      <p
        className="text-sm font-medium"
        style={{ color: "oklch(0.68 0.04 255)" }}
      >
        {label}
      </p>
    </motion.div>
  );
}

// ── Cycle Management Section ─────────────────────────────────────────────
interface CycleManagementProps {
  actor: ReturnType<typeof useActor>["actor"];
  actorFetching: boolean;
}

function CycleManagement({ actor, actorFetching }: CycleManagementProps) {
  const [threshold, setThreshold] = useState<bigint>(loadThreshold);
  const [thresholdInput, setThresholdInput] = useState<string>(() =>
    (Number(loadThreshold()) / 1_000_000_000_000).toString(),
  );
  const [thresholdSaved, setThresholdSaved] = useState(false);

  const [canisterPrincipal, setCanisterPrincipal] = useState<string>("");

  // ── Cycle balance query ──
  const {
    data: cycleBalance,
    isLoading: cycleLoading,
    isError: cycleError,
    refetch: refetchCycles,
    isFetching: cycleRefetching,
  } = useQuery<bigint>({
    queryKey: ["cycleBalance"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCycleBalance();
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
    staleTime: 30_000,
  });

  // ── Fetch canister ID ──
  const fetchDepositAddress = useCallback(async () => {
    try {
      let principalText = "";
      try {
        const resp = await fetch("/env.json");
        if (resp.ok) {
          const config = await resp.json();
          const id: string | undefined = config?.backend_canister_id;
          if (id && id !== "undefined" && id.trim().length > 0) {
            principalText = id.trim();
          }
        }
      } catch {
        // ignore and try build-time env
      }
      if (!principalText) {
        const envId =
          (process.env.CANISTER_ID_BACKEND as string | undefined) ?? "";
        if (envId && envId !== "undefined") principalText = envId;
      }
      if (!principalText) return;
      const principalObj = Principal.fromText(principalText);
      setCanisterPrincipal(principalObj.toText());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchDepositAddress();
  }, [fetchDepositAddress]);

  // ── Warning: cycles below threshold ──
  const isLowCycles =
    cycleBalance !== undefined && !cycleError && cycleBalance < threshold;

  // ── Threshold save ──
  const handleSaveThreshold = () => {
    const t = Number.parseFloat(thresholdInput);
    if (!Number.isNaN(t) && t > 0) {
      const newThreshold = BigInt(Math.round(t * 1_000_000_000_000));
      setThreshold(newThreshold);
      saveThreshold(newThreshold);
      setThresholdSaved(true);
      setTimeout(() => setThresholdSaved(false), 2000);
    }
  };

  // ── Cycle balance display helpers ──
  const cyclePercent =
    cycleBalance !== undefined
      ? Math.min(
          100,
          Math.round((Number(cycleBalance) / Number(threshold)) * 100),
        )
      : null;

  const getBatteryIcon = () => {
    if (cyclePercent === null) return Battery;
    if (cyclePercent < 30) return BatteryLow;
    if (cyclePercent >= 80) return BatteryFull;
    return Battery;
  };

  const BatteryIcon = getBatteryIcon();

  return (
    <motion.div
      data-ocid="admin.cycle_management_section"
      className="mt-10 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "oklch(0.55 0.22 150 / 0.18)",
            border: "1px solid oklch(0.67 0.18 150 / 0.35)",
          }}
        >
          <Zap className="w-5 h-5" style={{ color: "oklch(0.75 0.16 150)" }} />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-gradient-sky">
            Cycle Management
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.65 0.04 255)" }}>
            Monitor and top up your main canister cycle balance
          </p>
        </div>
      </div>

      {/* Low-cycle warning banner — conditional */}
      <AnimatePresence>
        {isLowCycles && (
          <motion.div
            data-ocid="admin.cycle_warning"
            className="rounded-xl p-4 mb-6 flex items-start gap-3"
            style={{
              background: "oklch(0.55 0.22 27 / 0.1)",
              border: "1px solid oklch(0.65 0.2 27 / 0.4)",
            }}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AlertTriangle
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              style={{ color: "oklch(0.75 0.18 40)" }}
            />
            <div>
              <p
                className="text-sm font-semibold mb-0.5"
                style={{ color: "oklch(0.82 0.16 40)" }}
              >
                ⚠ Low Cycle Balance
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "oklch(0.72 0.1 40)" }}
              >
                Your main canister cycle balance is below your threshold of{" "}
                {formatCycleBalance(threshold)}. Top up soon to keep the app
                running. Use the deposit address below or visit the{" "}
                <a
                  href="https://nns.ic0.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                  style={{ color: "oklch(0.82 0.16 40)" }}
                >
                  NNS app
                </a>
                .
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Cycle Balance Card ── */}
        <motion.div
          data-ocid="admin.cycle_balance_card"
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.18 0.06 150 / 0.55), oklch(0.15 0.04 180 / 0.4))",
            border: "1px solid oklch(0.55 0.18 150 / 0.25)",
            boxShadow:
              "0 4px 24px oklch(0.5 0.18 150 / 0.12), inset 0 0 0 1px oklch(0.55 0.18 150 / 0.05)",
          }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          {/* Top accent */}
          <div
            className="absolute top-0 left-6 right-6 h-px rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.67 0.18 150 / 0.5), transparent)",
            }}
          />

          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "oklch(0.55 0.2 150 / 0.18)",
                  border: "1px solid oklch(0.55 0.2 150 / 0.3)",
                }}
              >
                <BatteryIcon
                  className="w-4 h-4"
                  style={{
                    color: isLowCycles
                      ? "oklch(0.72 0.18 40)"
                      : "oklch(0.75 0.16 150)",
                  }}
                />
              </div>
              <span
                className="font-display text-sm font-semibold"
                style={{ color: "oklch(0.75 0.14 150)" }}
              >
                Cycle Balance
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              data-ocid="admin.cycle_balance_refresh_button"
              onClick={() => refetchCycles()}
              disabled={cycleLoading || cycleRefetching}
              className="h-8 w-8 p-0 hover:opacity-80"
              style={{ color: "oklch(0.65 0.08 230)" }}
              title="Refresh cycle balance"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${cycleRefetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {cycleLoading ? (
            <div data-ocid="admin.cycle_loading_state">
              <div
                className="h-10 w-40 rounded-lg mb-2 animate-pulse"
                style={{ background: "oklch(0.25 0.05 150 / 0.5)" }}
              />
              <div
                className="h-3 w-24 rounded-full animate-pulse"
                style={{ background: "oklch(0.22 0.04 150 / 0.4)" }}
              />
            </div>
          ) : cycleError ? (
            <div data-ocid="admin.cycle_error_state">
              <p
                className="font-display text-2xl font-bold mb-2"
                style={{ color: "oklch(0.68 0.04 255)" }}
              >
                Check IC Dashboard
              </p>
              <p
                className="text-xs leading-relaxed mb-3"
                style={{ color: "oklch(0.55 0.04 255)" }}
              >
                Your live cycle balance is always visible on the IC Dashboard.
                Copy your canister ID from below and paste it in the search bar.
              </p>
              <a
                href={
                  canisterPrincipal
                    ? `https://dashboard.internetcomputer.org/canister/${canisterPrincipal}`
                    : "https://dashboard.internetcomputer.org"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{
                  background: "oklch(0.55 0.18 230 / 0.15)",
                  border: "1px solid oklch(0.55 0.18 230 / 0.3)",
                  color: "oklch(0.72 0.14 225)",
                }}
              >
                <ExternalLink className="w-3 h-3" />
                Open IC Dashboard
              </a>
            </div>
          ) : (
            <div>
              <p
                className="font-display text-4xl font-bold mb-1"
                style={{
                  background: isLowCycles
                    ? "linear-gradient(135deg, oklch(0.82 0.16 40), oklch(0.72 0.18 60))"
                    : "linear-gradient(135deg, oklch(0.82 0.14 150), oklch(0.68 0.18 180))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {formatCycleBalance(cycleBalance!)}
              </p>

              {/* Progress bar */}
              {cyclePercent !== null && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs"
                      style={{ color: "oklch(0.60 0.04 255)" }}
                    >
                      vs. alert threshold
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: isLowCycles
                          ? "oklch(0.72 0.18 40)"
                          : "oklch(0.72 0.14 150)",
                      }}
                    >
                      {cyclePercent}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full overflow-hidden"
                    style={{ background: "oklch(0.22 0.04 265)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${cyclePercent}%`,
                        background: isLowCycles
                          ? "linear-gradient(90deg, oklch(0.65 0.22 27), oklch(0.72 0.18 50))"
                          : "linear-gradient(90deg, oklch(0.67 0.18 150), oklch(0.72 0.16 170))",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            className="mt-4 pt-4 text-xs"
            style={{
              borderTop: "1px solid oklch(0.28 0.05 265 / 0.5)",
              color: "oklch(0.55 0.04 255)",
            }}
          >
            ≈ 1 ICP converts to ~13T cycles at current rates
          </div>
        </motion.div>

        {/* ── Threshold Configuration Card ── */}
        <motion.div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.18 0.06 265 / 0.55), oklch(0.15 0.04 285 / 0.4))",
            border: "1px solid oklch(0.45 0.12 265 / 0.3)",
          }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <div
            className="absolute top-0 left-6 right-6 h-px rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.67 0.18 265 / 0.4), transparent)",
            }}
          />

          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "oklch(0.55 0.2 265 / 0.18)",
                border: "1px solid oklch(0.55 0.2 265 / 0.3)",
              }}
            >
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: "oklch(0.75 0.16 265)" }}
              />
            </div>
            <span
              className="font-display text-sm font-semibold"
              style={{ color: "oklch(0.75 0.14 265)" }}
            >
              Alert Threshold
            </span>
          </div>

          <p className="text-xs mb-4" style={{ color: "oklch(0.60 0.04 255)" }}>
            Show the low-cycle warning when the balance drops below this level.
            Enter in T-cycles (e.g. "1" = 1T, "0.5" = 500B).
          </p>

          <div className="space-y-3">
            <Label
              htmlFor="threshold-input"
              className="text-xs font-medium"
              style={{ color: "oklch(0.68 0.04 255)" }}
            >
              Warning threshold (T cycles)
            </Label>
            <div className="flex gap-2">
              <Input
                id="threshold-input"
                data-ocid="admin.threshold_input"
                type="number"
                min="0.1"
                step="0.1"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="flex-1 h-9 text-sm bg-transparent border-border/60 focus:border-primary/60 rounded-xl"
                placeholder="1"
              />
              <Button
                data-ocid="admin.threshold_save_button"
                size="sm"
                onClick={handleSaveThreshold}
                className="h-9 gap-1.5 font-semibold rounded-xl border-0 bg-gradient-sky text-white hover:opacity-90 transition-opacity px-3"
              >
                {thresholdSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-xs">Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span className="text-xs">Save</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div
            className="mt-4 pt-4 text-xs"
            style={{
              borderTop: "1px solid oklch(0.28 0.05 265 / 0.5)",
              color: "oklch(0.55 0.04 255)",
            }}
          >
            Current threshold:{" "}
            <span style={{ color: "oklch(0.72 0.14 265)" }}>
              {formatCycleBalance(threshold)}
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── How to Top Up Card ── */}
      <motion.div
        data-ocid="admin.topup_info_card"
        className="mt-4 rounded-2xl p-6 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.18 0.06 230 / 0.6), oklch(0.15 0.04 250 / 0.5))",
          border: "1px solid oklch(0.55 0.18 230 / 0.25)",
          boxShadow: "0 4px 24px oklch(0.5 0.18 230 / 0.12)",
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {/* Top accent */}
        <div
          className="absolute top-0 left-8 right-8 h-px rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.67 0.18 230 / 0.6), oklch(0.62 0.22 285 / 0.4), transparent)",
          }}
        />

        <div className="flex items-center gap-2 mb-3">
          <Shield
            className="w-4 h-4"
            style={{ color: "oklch(0.72 0.16 230)" }}
          />
          <h3
            className="font-display text-sm font-semibold"
            style={{ color: "oklch(0.75 0.14 225)" }}
          >
            How to Top Up Cycles
          </h3>
        </div>

        <div
          className="rounded-xl p-4 mb-4 flex items-start gap-3"
          style={{
            background: "oklch(0.75 0.18 85 / 0.07)",
            border: "1px solid oklch(0.75 0.18 85 / 0.25)",
          }}
        >
          <AlertTriangle
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color: "oklch(0.75 0.18 85)" }}
          />
          <p
            className="text-xs leading-relaxed"
            style={{ color: "oklch(0.82 0.10 85)" }}
          >
            <span className="font-semibold">Note:</span> Caffeine manages
            canister controllers on your behalf. This means you cannot top up
            cycles directly via the NNS app as the canister controller. Use one
            of the options below instead.
          </p>
        </div>

        <div
          className="space-y-3 text-sm"
          style={{ color: "oklch(0.68 0.04 255)" }}
        >
          <div className="flex gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
              style={{
                background: "oklch(0.55 0.22 230 / 0.2)",
                border: "1px solid oklch(0.67 0.18 230 / 0.4)",
                color: "oklch(0.75 0.16 225)",
              }}
            >
              1
            </div>
            <div>
              <p
                className="font-semibold mb-0.5"
                style={{ color: "oklch(0.82 0.08 255)" }}
              >
                Use CycleOps (recommended)
              </p>
              <p className="text-xs leading-relaxed">
                CycleOps can monitor and automatically top up canisters you
                don't directly control. Visit{" "}
                <a
                  href="https://cycleops.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                  style={{ color: "oklch(0.72 0.14 225)" }}
                  data-ocid="admin.cycleops_link"
                >
                  cycleops.dev
                </a>{" "}
                and add your canister ID to set up automated top-ups.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
              style={{
                background: "oklch(0.55 0.22 230 / 0.2)",
                border: "1px solid oklch(0.67 0.18 230 / 0.4)",
                color: "oklch(0.75 0.16 225)",
              }}
            >
              2
            </div>
            <div>
              <p
                className="font-semibold mb-0.5"
                style={{ color: "oklch(0.82 0.08 255)" }}
              >
                Contact Caffeine Support
              </p>
              <p className="text-xs leading-relaxed">
                Caffeine may be able to add you as a co-controller or handle
                cycle top-ups on your behalf. Reach out via the feedback button
                in your Caffeine account for assistance.
              </p>
            </div>
          </div>
        </div>

        <div
          className="mt-4 pt-4 text-xs"
          style={{
            borderTop: "1px solid oklch(0.28 0.05 265 / 0.5)",
            color: "oklch(0.55 0.04 255)",
          }}
        >
          Your canister ID is shown in the Cycle Balance card above. Copy it to
          use with CycleOps or when contacting support.
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { identity, login, clear, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const [copied, setCopied] = useState(false);

  const isAuthenticated = !!identity;
  const principalText = identity?.getPrincipal().toText() ?? "";

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: isAdminSetup, isLoading: setupLoading } = useQuery<boolean>({
    queryKey: ["isAdminSetup"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isAdminSetup();
    },
    enabled: !!actor && !actorFetching && isAuthenticated,
  });

  const { data: isCallerAdmin, isLoading: adminCheckLoading } =
    useQuery<boolean>({
      queryKey: ["isCallerAdmin"],
      queryFn: async () => {
        if (!actor) throw new Error("Actor not available");
        return actor.isCallerAdmin();
      },
      enabled:
        !!actor && !actorFetching && isAuthenticated && isAdminSetup === true,
    });

  const { data: metrics, isLoading: metricsLoading } = useQuery<AdminMetrics>({
    queryKey: ["adminMetrics"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getAdminMetrics();
    },
    enabled: !!actor && !actorFetching && isCallerAdmin === true,
    refetchInterval: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const claimAdmin = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.setupFirstAdmin();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isAdminSetup"] });
      queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
    },
  });

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    navigate({ to: "/" });
  };

  const handleCopyPrincipal = () => {
    navigator.clipboard.writeText(principalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  const isGlobalLoading =
    isInitializing ||
    actorFetching ||
    (isAuthenticated && setupLoading) ||
    (isAuthenticated && isAdminSetup === true && adminCheckLoading);

  if (isGlobalLoading) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "oklch(0.67 0.18 230)" }}
          />
          <p className="text-sm" style={{ color: "oklch(0.68 0.04 255)" }}>
            Loading admin panel…
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space flex flex-col">
      {/* Background decorative layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, oklch(0.45 0.22 285 / 0.14), transparent 65%)",
          }}
        />
        <div
          className="absolute -bottom-48 -left-32 w-[500px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, oklch(0.48 0.2 230 / 0.12), transparent 65%)",
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        className="relative z-20 sticky top-0 border-b border-border/60 backdrop-blur-sm"
        style={{ background: "oklch(0.13 0.04 265 / 0.92)" }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/uploads/4FFBD3E5-2A6D-4DA4-B19E-16EFB7B05C9D-1.png"
              alt="Cloud Capsule"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="font-display text-base font-semibold leading-none text-gradient-sky">
                Cloud Capsule
              </h1>
              <p
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.68 0.04 255)" }}
              >
                Admin Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: "oklch(0.55 0.22 230 / 0.12)",
                  border: "1px solid oklch(0.67 0.18 230 / 0.25)",
                  color: "oklch(0.72 0.14 225)",
                }}
              >
                <Shield className="w-3 h-3" />
                {isCallerAdmin ? "Administrator" : "Visitor"}
              </div>
            )}
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-12">
        <AnimatePresence mode="wait">
          {/* ── State A: Not logged in ─────────────────────────────────── */}
          {!isAuthenticated && (
            <motion.div
              key="login"
              className="flex items-center justify-center min-h-[60vh]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="w-full max-w-md rounded-2xl p-10 text-center"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.18 0.06 265 / 0.85), oklch(0.15 0.05 285 / 0.9))",
                  border: "1px solid oklch(0.67 0.18 230 / 0.3)",
                  boxShadow: "0 0 60px oklch(0.55 0.2 250 / 0.12)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{
                    background: "oklch(0.55 0.22 230 / 0.2)",
                    border: "1px solid oklch(0.67 0.18 230 / 0.4)",
                  }}
                >
                  <Shield
                    className="w-8 h-8"
                    style={{ color: "oklch(0.75 0.16 225)" }}
                  />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Admin Access
                </h2>
                <p
                  className="text-sm mb-8"
                  style={{ color: "oklch(0.68 0.04 255)" }}
                >
                  Sign in with your Internet Identity to access the Cloud
                  Capsule admin dashboard.
                </p>
                <Button
                  size="lg"
                  onClick={login}
                  disabled={isLoggingIn}
                  data-ocid="admin.login_button"
                  className="w-full gap-2 font-semibold rounded-xl border-0 bg-gradient-sky text-white hover:opacity-90 transition-opacity glow-sky"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  {isLoggingIn
                    ? "Connecting…"
                    : "Sign in with Internet Identity"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── State B: First-time setup ──────────────────────────────── */}
          {isAuthenticated && isAdminSetup === false && (
            <motion.div
              key="setup"
              className="flex items-center justify-center min-h-[60vh]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
            >
              <div
                data-ocid="admin.setup_card"
                className="w-full max-w-lg rounded-2xl p-10 relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.18 0.06 265 / 0.85), oklch(0.15 0.05 285 / 0.9))",
                  border: "1px solid oklch(0.67 0.18 230 / 0.35)",
                  boxShadow:
                    "0 0 80px oklch(0.55 0.2 250 / 0.15), 0 0 0 1px oklch(0.67 0.18 230 / 0.05) inset",
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-8 right-8 h-px rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, oklch(0.67 0.18 230 / 0.6), oklch(0.65 0.2 285 / 0.5), transparent)",
                  }}
                />

                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{
                    background: "oklch(0.55 0.22 230 / 0.2)",
                    border: "1px solid oklch(0.67 0.18 230 / 0.4)",
                  }}
                >
                  <Shield
                    className="w-7 h-7"
                    style={{ color: "oklch(0.75 0.16 225)" }}
                  />
                </div>

                <h2 className="font-display text-2xl font-bold text-foreground mb-3 text-center">
                  Welcome to{" "}
                  <span className="text-gradient-sky">Cloud Capsule Admin</span>
                </h2>

                <p
                  className="text-sm text-center mb-6 leading-relaxed"
                  style={{ color: "oklch(0.68 0.04 255)" }}
                >
                  No administrator has been set up yet. Since you are the first
                  to arrive, you can claim admin access for your Internet
                  Identity.
                </p>

                {/* Principal display */}
                <div
                  className="rounded-xl p-4 mb-6"
                  style={{
                    background: "oklch(0.14 0.04 265 / 0.8)",
                    border: "1px solid oklch(0.3 0.06 265 / 0.6)",
                  }}
                >
                  <p
                    className="text-xs font-medium mb-2"
                    style={{ color: "oklch(0.68 0.04 255)" }}
                  >
                    Your Internet Identity Principal
                  </p>
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 text-xs break-all font-mono leading-relaxed"
                      style={{ color: "oklch(0.75 0.14 220)" }}
                    >
                      {principalText}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyPrincipal}
                      className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{
                        background: "oklch(0.55 0.18 230 / 0.15)",
                        border: "1px solid oklch(0.55 0.18 230 / 0.3)",
                        color: "oklch(0.72 0.14 225)",
                      }}
                      title="Copy principal"
                    >
                      {copied ? (
                        <CheckCircle2
                          className="w-3.5 h-3.5"
                          style={{ color: "oklch(0.72 0.18 145)" }}
                        />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {claimAdmin.isError && (
                  <div
                    data-ocid="admin.error_state"
                    className="rounded-xl p-3 mb-4 text-sm text-center"
                    style={{
                      background: "oklch(0.55 0.22 27 / 0.12)",
                      border: "1px solid oklch(0.55 0.22 27 / 0.3)",
                      color: "oklch(0.72 0.18 27)",
                    }}
                  >
                    Failed to claim admin access. Please try again.
                  </div>
                )}

                <Button
                  size="lg"
                  onClick={() => claimAdmin.mutate()}
                  disabled={claimAdmin.isPending}
                  data-ocid="admin.claim_button"
                  className="w-full gap-2 font-semibold rounded-xl border-0 bg-gradient-sky text-white hover:opacity-90 transition-opacity glow-sky"
                >
                  {claimAdmin.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Claiming Admin Access…
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Claim Admin Access
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── State D: Access denied ─────────────────────────────────── */}
          {isAuthenticated &&
            isAdminSetup === true &&
            isCallerAdmin === false &&
            !adminCheckLoading && (
              <motion.div
                key="denied"
                className="flex items-center justify-center min-h-[60vh]"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5 }}
              >
                <div
                  className="w-full max-w-md rounded-2xl p-10 text-center"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.17 0.05 30 / 0.7), oklch(0.14 0.04 265 / 0.85))",
                    border: "1px solid oklch(0.55 0.22 27 / 0.3)",
                    boxShadow: "0 0 60px oklch(0.5 0.2 27 / 0.1)",
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                    style={{
                      background: "oklch(0.55 0.22 27 / 0.15)",
                      border: "1px solid oklch(0.55 0.22 27 / 0.35)",
                    }}
                  >
                    <ShieldAlert
                      className="w-8 h-8"
                      style={{ color: "oklch(0.7 0.18 27)" }}
                    />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                    Access Denied
                  </h2>
                  <p
                    className="text-sm mb-8 leading-relaxed"
                    style={{ color: "oklch(0.68 0.04 255)" }}
                  >
                    This area is restricted to the Cloud Capsule app
                    administrator. Your principal is not authorized to access
                    this dashboard.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: "/" })}
                    data-ocid="admin.back_home_button"
                    className="gap-2 border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5"
                  >
                    Back to Home
                  </Button>
                </div>
              </motion.div>
            )}

          {/* ── State C: Admin dashboard ───────────────────────────────── */}
          {isAuthenticated && isCallerAdmin === true && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Page title */}
              <motion.div
                className="mb-10"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: "oklch(0.55 0.22 230 / 0.2)",
                      border: "1px solid oklch(0.67 0.18 230 / 0.35)",
                    }}
                  >
                    <BarChart3
                      className="w-5 h-5"
                      style={{ color: "oklch(0.72 0.16 225)" }}
                    />
                  </div>
                  <h2 className="font-display text-3xl font-bold text-gradient-sky">
                    App Analytics
                  </h2>
                </div>
                <p
                  className="text-sm ml-[52px]"
                  style={{ color: "oklch(0.65 0.04 255)" }}
                >
                  Real-time metrics for the Cloud Capsule platform
                </p>
              </motion.div>

              {/* Metrics grid */}
              <motion.div
                data-ocid="admin.metrics_panel"
                className="grid grid-cols-2 md:grid-cols-3 gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
                  },
                }}
              >
                <MetricCard
                  ocid="admin.users_card"
                  label="Total Users"
                  value={metrics?.totalUsers}
                  icon={Users}
                  hue={230}
                  isLoading={metricsLoading}
                />
                <MetricCard
                  ocid="admin.capsules_card"
                  label="Total Capsules"
                  value={metrics?.totalCapsules}
                  icon={Activity}
                  hue={250}
                  isLoading={metricsLoading}
                />
                <MetricCard
                  ocid="admin.media_card"
                  label="Total Media Files"
                  value={metrics?.totalMedia}
                  icon={Image}
                  hue={270}
                  isLoading={metricsLoading}
                />
                <MetricCard
                  ocid="admin.notes_card"
                  label="Total Notes"
                  value={metrics?.totalNotes}
                  icon={FileText}
                  hue={215}
                  isLoading={metricsLoading}
                />
                <MetricCard
                  ocid="admin.neurons_card"
                  label="Neuron Entries"
                  value={metrics?.totalNeuronEntries}
                  icon={Brain}
                  hue={285}
                  isLoading={metricsLoading}
                />
                <MetricCard
                  ocid="admin.visits_card"
                  label="Page Visits"
                  value={metrics?.visitCount}
                  icon={BarChart3}
                  hue={240}
                  isLoading={metricsLoading}
                />
              </motion.div>

              {/* Cycle Management Section */}
              <CycleManagement actor={actor} actorFetching={actorFetching} />

              {/* Principal info card */}
              <motion.div
                className="mt-8 rounded-2xl p-6"
                style={{
                  background: "oklch(0.17 0.045 265 / 0.6)",
                  border: "1px solid oklch(0.26 0.05 265)",
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Shield
                    className="w-4 h-4"
                    style={{ color: "oklch(0.72 0.14 225)" }}
                  />
                  <h3
                    className="font-display text-sm font-semibold"
                    style={{ color: "oklch(0.72 0.14 225)" }}
                  >
                    Admin Principal
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <code
                    className="flex-1 text-xs break-all font-mono leading-relaxed"
                    style={{ color: "oklch(0.68 0.04 255)" }}
                  >
                    {principalText}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPrincipal}
                    className="flex-shrink-0 p-2 rounded-lg transition-colors hover:opacity-80"
                    style={{
                      background: "oklch(0.55 0.18 230 / 0.12)",
                      border: "1px solid oklch(0.55 0.18 230 / 0.25)",
                      color: "oklch(0.68 0.1 225)",
                    }}
                    title="Copy principal"
                  >
                    {copied ? (
                      <CheckCircle2
                        className="w-3.5 h-3.5"
                        style={{ color: "oklch(0.72 0.18 145)" }}
                      />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-6 px-6 md:px-12 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img
              src="/assets/uploads/4FFBD3E5-2A6D-4DA4-B19E-16EFB7B05C9D-1.png"
              alt="Cloud Capsule"
              className="w-5 h-5 object-contain opacity-80"
            />
            <span className="font-display font-semibold text-foreground">
              Cloud Capsule
            </span>
            <span className="text-border/80">·</span>
            <span>Admin</span>
          </div>
          <p>
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
