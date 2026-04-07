import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Principal } from "@dfinity/principal";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Brain,
  Cloud,
  FileStack,
  FileText,
  Image,
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AccessTab from "../components/dashboard/AccessTab";
import BeneficiariesTab from "../components/dashboard/BeneficiariesTab";
import DocsTab from "../components/dashboard/DocsTab";
import MediaTab from "../components/dashboard/MediaTab";
import NeuronsTab from "../components/dashboard/NeuronsTab";
import NotesTab from "../components/dashboard/NotesTab";
import OnboardingModal from "../components/dashboard/OnboardingModal";
import SettingsTab from "../components/dashboard/SettingsTab";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateCapsule,
  useDeleteCapsule,
  useGetCallerUserProfile,
  useGetCapsuleLockStatus,
  useSaveCallerUserProfile,
  useToggleCapsuleLock,
} from "../hooks/useQueries";
import { getOrCreateCapsuleCode } from "../utils/capsuleCode";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { identity, clear, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;
  const ownerPrincipal: Principal | null = identity
    ? (identity.getPrincipal() as unknown as Principal)
    : null;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
    isError: profileError,
  } = useGetCallerUserProfile();
  const { data: capsuleLocked = true } =
    useGetCapsuleLockStatus(ownerPrincipal);
  const saveProfile = useSaveCallerUserProfile();
  const createCapsule = useCreateCapsule();
  const deleteCapsule = useDeleteCapsule();
  const toggleLock = useToggleCapsuleLock();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isInitializing, isAuthenticated, navigate]);

  // Show onboarding only when the profile has been successfully fetched and is
  // confirmed null (brand new user). Transient errors must NOT trigger onboarding
  // because they would hide all tab content for existing users.
  const showOnboarding =
    isAuthenticated &&
    !profileLoading &&
    profileFetched &&
    !profileError &&
    userProfile === null;

  // Tab content renders for any authenticated user — individual tab components
  // handle their own loading skeletons and empty states. The old profile-based
  // guard was causing blank tabs when isFetched flipped due to actor race conditions.
  const capsuleReady = isAuthenticated;

  // Banner state for "Create Your Capsule"
  const [capsuleName, setCapsuleName] = useState("");
  const [bannerCreating, setBannerCreating] = useState(false);

  const showCreateBanner =
    isAuthenticated && !profileLoading && userProfile === null;

  const handleBannerCreate = async () => {
    if (!capsuleName.trim()) return;
    setBannerCreating(true);
    try {
      await createCapsule.mutateAsync();
      await saveProfile.mutateAsync({ name: capsuleName.trim() });
      await queryClient.invalidateQueries();
    } finally {
      setBannerCreating(false);
    }
  };

  // Generate / retrieve the capsule short code (only once a capsule exists)
  const capsuleCode =
    ownerPrincipal && userProfile
      ? getOrCreateCapsuleCode(ownerPrincipal.toString())
      : null;
  const shareableLink = capsuleCode
    ? `${window.location.origin}/access/${capsuleCode}`
    : null;

  const handleToggleLock = async () => {
    try {
      await toggleLock.mutateAsync();
    } catch {
      // handled by toast
    }
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    navigate({ to: "/" });
  };

  const handleDeleteCapsule = async () => {
    await deleteCapsule.mutateAsync();
    toast.success("Your capsule has been deleted");
    await clear();
    queryClient.clear();
    navigate({ to: "/" });
  };

  if (isInitializing || (!isAuthenticated && !isInitializing)) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space flex flex-col">
      {/* Top bar */}
      <motion.header
        className="sticky top-0 z-20 border-b border-border/60 backdrop-blur-sm"
        style={{ background: "oklch(0.13 0.04 265 / 0.92)" }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Logo + title — clicking navigates back to the landing page */}
          <Link
            to="/"
            data-ocid="nav.link"
            className="flex items-center gap-3 group rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            aria-label="Go to Cloud Capsule home"
          >
            <img
              src="/assets/uploads/4FFBD3E5-2A6D-4DA4-B19E-16EFB7B05C9D-1.png"
              alt="Cloud Capsule"
              className="w-8 h-8 object-contain transition-transform group-hover:scale-105"
            />
            <div>
              <h1 className="font-display text-base font-semibold leading-none text-gradient-sky">
                Cloud Capsule
              </h1>
              {userProfile?.name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {userProfile.name}
                </p>
              )}
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Dashboard content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
        <Tabs defaultValue="notes" className="w-full">
          {/* Create Capsule Banner — shown above the tab bar for new users */}
          <AnimatePresence>
            {showCreateBanner && (
              <motion.div
                data-ocid="create_capsule.panel"
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mb-6 rounded-xl overflow-hidden"
                style={{
                  background: "oklch(0.17 0.045 265 / 0.7)",
                  border: "1px solid oklch(0.67 0.18 230 / 0.35)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="px-5 py-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.67 0.18 230 / 0.25), oklch(0.58 0.22 285 / 0.25))",
                        border: "1px solid oklch(0.67 0.18 230 / 0.4)",
                      }}
                    >
                      <Cloud
                        className="w-5 h-5"
                        style={{ color: "oklch(0.72 0.16 230)" }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-display text-base font-semibold leading-tight mb-1"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.82 0.14 230), oklch(0.72 0.18 285))",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Create Your Capsule
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        Your personal capsule is your private on-chain vault.
                        Enter your name to get started.
                      </p>

                      {/* Input + Button row */}
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <Input
                          data-ocid="create_capsule.input"
                          placeholder="Your name"
                          value={capsuleName}
                          onChange={(e) => setCapsuleName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !bannerCreating) {
                              handleBannerCreate();
                            }
                          }}
                          className="flex-1 h-9 text-sm"
                          style={{
                            background: "oklch(0.13 0.04 265 / 0.8)",
                            border: "1px solid oklch(0.67 0.18 230 / 0.3)",
                            color: "oklch(0.92 0.02 265)",
                          }}
                          disabled={bannerCreating}
                        />
                        <Button
                          data-ocid="create_capsule.submit_button"
                          onClick={handleBannerCreate}
                          disabled={bannerCreating || !capsuleName.trim()}
                          size="sm"
                          className="h-9 px-5 font-semibold text-sm text-white whitespace-nowrap"
                          style={{
                            background:
                              bannerCreating || !capsuleName.trim()
                                ? "oklch(0.35 0.05 265)"
                                : "linear-gradient(135deg, oklch(0.67 0.18 230), oklch(0.58 0.22 285))",
                            border: "none",
                          }}
                        >
                          {bannerCreating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              Creating…
                            </>
                          ) : (
                            "Create My Capsule"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                { value: "docs", icon: FileStack, label: "Docs" },
                { value: "media", icon: Image, label: "Media" },
                { value: "neurons", icon: Brain, label: "Neurons" },
                { value: "beneficiaries", icon: Users, label: "Beneficiaries" },
                { value: "settings", icon: Settings, label: "Settings" },
                { value: "access", icon: ShieldCheck, label: "Access" },
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

          <TabsContent value="notes" className="mt-0">
            {capsuleReady && ownerPrincipal && (
              <NotesTab ownerPrincipal={ownerPrincipal} />
            )}
          </TabsContent>

          <TabsContent value="docs" className="mt-0">
            {capsuleReady && <DocsTab />}
          </TabsContent>

          <TabsContent value="media" className="mt-0">
            {capsuleReady && ownerPrincipal && (
              <MediaTab ownerPrincipal={ownerPrincipal} />
            )}
          </TabsContent>

          <TabsContent value="neurons" className="mt-0">
            {capsuleReady && ownerPrincipal && (
              <NeuronsTab ownerPrincipal={ownerPrincipal} />
            )}
          </TabsContent>

          <TabsContent value="beneficiaries" className="mt-0">
            {capsuleReady && <BeneficiariesTab />}
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsTab
              userProfile={userProfile ?? null}
              onSaveProfile={async (profile) => {
                await saveProfile.mutateAsync(profile);
              }}
              onDeleteCapsule={handleDeleteCapsule}
            />
          </TabsContent>

          <TabsContent value="access" className="mt-0">
            <AccessTab
              capsuleLocked={capsuleLocked}
              onToggle={handleToggleLock}
              isToggling={toggleLock.isPending}
              capsuleCode={capsuleCode}
              shareableLink={shareableLink}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Onboarding modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={async (name) => {
            await createCapsule.mutateAsync();
            await saveProfile.mutateAsync({ name });
          }}
          isLoading={createCapsule.isPending || saveProfile.isPending}
        />
      )}
    </div>
  );
}
