import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Archive,
  Brain,
  ChevronRight,
  FileText,
  Heart,
  Lock,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LandingPage() {
  const navigate = useNavigate();
  const { login, clear, identity, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const queryClient = useQueryClient();
  const { actor } = useActor();

  // Fire-and-forget visit recording
  useEffect(() => {
    if (actor) {
      actor.recordVisit().catch(() => {
        // Intentionally ignore errors — this is analytics-only
      });
    }
  }, [actor]);
  const isAuthenticated = !!identity;

  const handleCreateCapsule = async () => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    } else {
      try {
        await login();
      } catch (error: unknown) {
        const err = error as Error;
        if (err?.message === "User is already authenticated") {
          await clear();
          queryClient.clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const handleAccessCapsule = () => {
    navigate({ to: "/access" });
  };

  const features = [
    {
      icon: Archive,
      title: "Preserve Your Memories",
      desc: "Upload photos, videos, and heartfelt notes for the people who matter most.",
      hue: 230,
    },
    {
      icon: Brain,
      title: "ICP Neuron Instructions",
      desc: "Leave guidance on your neurons, including details about maturity, voting, and governance participation.",
      hue: 260,
    },
    {
      icon: Lock,
      title: "You Control Access",
      desc: "Toggle your capsule open or locked. Share credentials only when you're ready.",
      hue: 285,
    },
    {
      icon: FileText,
      title: "Secure & Private",
      desc: "Your data is stored on the Internet Computer blockchain — private by design, protected by cryptography.",
      hue: 215,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-space relative overflow-hidden">
      {/* Background nebula glow layers */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top-right violet nebula */}
        <div
          className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, oklch(0.45 0.22 285 / 0.18), transparent 65%)",
          }}
        />
        {/* Bottom-left sky blue nebula */}
        <div
          className="absolute -bottom-48 -left-32 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, oklch(0.48 0.2 230 / 0.16), transparent 65%)",
          }}
        />
        {/* Center subtle glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, oklch(0.38 0.15 255 / 0.1), transparent 70%)",
          }}
        />
        {/* Star dots */}
        {[
          { id: "s1", top: "8%", left: "12%", size: 2 },
          { id: "s2", top: "15%", left: "75%", size: 1.5 },
          { id: "s3", top: "35%", left: "92%", size: 2 },
          { id: "s4", top: "60%", left: "5%", size: 1.5 },
          { id: "s5", top: "78%", left: "88%", size: 2 },
          { id: "s6", top: "22%", left: "48%", size: 1 },
          { id: "s7", top: "50%", left: "30%", size: 1.5 },
          { id: "s8", top: "90%", left: "50%", size: 1 },
        ].map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full opacity-40"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: "oklch(0.9 0.05 220)",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header
        className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/uploads/4FFBD3E5-2A6D-4DA4-B19E-16EFB7B05C9D-1.png"
            alt="Cloud Capsule"
            className="w-10 h-10 object-contain"
          />
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-gradient-sky">Cloud Capsule</span>
          </span>
        </div>

        {/* Nav links — hidden on mobile, visible md+ */}
        <nav className="hidden md:flex items-center gap-1 mr-2">
          <button
            type="button"
            onClick={handleCreateCapsule}
            disabled={isLoggingIn || isInitializing}
            data-ocid="nav.create_capsule_button"
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: "oklch(0.72 0.14 220)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "oklch(0.85 0.14 220)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "oklch(0.72 0.14 220)";
            }}
          >
            {isAuthenticated ? "My Capsule" : "Open My Capsule"}
          </button>
          <button
            type="button"
            onClick={handleAccessCapsule}
            data-ocid="nav.access_capsule_button"
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={{ color: "oklch(0.72 0.14 220)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "oklch(0.85 0.14 220)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "oklch(0.72 0.14 220)";
            }}
          >
            Access a Capsule
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {!isInitializing &&
            (isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clear();
                    queryClient.clear();
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sign Out
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="bg-gradient-sky text-white hover:opacity-90 transition-opacity border-0"
                >
                  My Capsule
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateCapsule}
                disabled={isLoggingIn}
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                Sign In
              </Button>
            ))}
        </div>
      </motion.header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col">
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-8 max-w-3xl"
          >
            {/* Logo mark — large hero version */}
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.05 }}
            >
              <div className="relative">
                {/* Glow ring behind logo */}
                <div
                  className="absolute inset-0 rounded-full blur-2xl opacity-40"
                  style={{
                    background:
                      "radial-gradient(ellipse, oklch(0.67 0.18 230 / 0.6), oklch(0.55 0.22 285 / 0.4), transparent 70%)",
                    transform: "scale(1.4)",
                  }}
                />
                <img
                  src="/assets/uploads/4FFBD3E5-2A6D-4DA4-B19E-16EFB7B05C9D-1.png"
                  alt="Cloud Capsule"
                  className="relative w-36 h-36 md:w-44 md:h-44 object-contain drop-shadow-2xl"
                />
              </div>

              {/* Logo text beneath the hero image */}
              <div className="relative flex items-center justify-center">
                {/* Radial glow backdrop behind text */}
                <div
                  className="absolute inset-0 blur-2xl rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse 120% 80%, oklch(0.67 0.18 230 / 0.25) 0%, oklch(0.58 0.22 285 / 0.18) 50%, transparent 100%)",
                    transform: "scaleX(1.6) scaleY(1.8)",
                  }}
                />
                <motion.span
                  className="relative font-logo font-bold tracking-widest uppercase text-gradient-sky logo-text-glow"
                  style={{
                    fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
                    letterSpacing: "0.18em",
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.45 }}
                >
                  Cloud Capsule
                </motion.span>
              </div>
            </motion.div>

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium"
              style={{
                borderColor: "oklch(0.67 0.18 230 / 0.35)",
                background: "oklch(0.67 0.18 230 / 0.1)",
                color: "oklch(0.78 0.12 220)",
              }}
            >
              <Heart className="w-3.5 h-3.5" />
              Your digital legacy, preserved on-chain
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
              <span className="text-foreground">Leave what</span>
              <br />
              <span className="text-gradient-sky font-serif italic">
                matters most
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground font-body leading-relaxed max-w-xl mx-auto">
              Create a private time capsule for your loved ones. Store memories,
              leave messages, and share your ICP inheritance wishes — all
              secured on the Internet Computer.
            </p>
          </motion.div>

          {/* Hero image */}
          <motion.div
            className="mt-16 w-full max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
          >
            <div
              className="relative rounded-2xl overflow-hidden shadow-cloud-lg"
              style={{ aspectRatio: "16/7" }}
            >
              <img
                src="/assets/generated/icp-digital-lockbox.dim_1200x675.jpg"
                alt="Cloud Capsule — your digital legacy lockbox"
                className="w-full h-full object-cover"
              />
              {/* Overlay tinted to match theme */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, oklch(0.13 0.04 265 / 0.6) 0%, transparent 60%)",
                }}
              />
            </div>
          </motion.div>
        </section>

        {/* Privacy Trust Section — beneath the lockbox image */}
        <section className="px-6 pt-16 pb-8 md:px-12">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* App intro */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                What is{" "}
                <span className="text-gradient-sky">Cloud Capsule?</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Cloud Capsule is a digital legacy platform built on the Internet
                Computer. It gives you a private, permanent space to store
                memories, personal messages, and critical instructions for the
                people you love — to be discovered when the time comes. Think of
                it as a safety deposit box for everything that matters: photos,
                videos, heartfelt notes, and clear guidance on your ICP neurons
                and digital assets. Unlike traditional cloud storage, your data
                lives entirely on-chain — secured by the cryptographic
                guarantees of the Internet Computer, not by trusting a company's
                servers.
              </p>
            </motion.div>

            {/* Privacy emphasis block */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative rounded-2xl p-7 text-left"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.18 0.06 265 / 0.85), oklch(0.15 0.05 285 / 0.9))",
                border: "1px solid oklch(0.67 0.18 230 / 0.3)",
                boxShadow:
                  "0 0 40px oklch(0.55 0.2 250 / 0.12), inset 0 0 0 1px oklch(0.67 0.18 230 / 0.08)",
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

              <div className="flex items-start gap-4 mb-5">
                <div
                  className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-0.5"
                  style={{
                    background: "oklch(0.55 0.22 230 / 0.2)",
                    border: "1px solid oklch(0.67 0.18 230 / 0.35)",
                  }}
                >
                  <Lock
                    className="w-5 h-5"
                    style={{ color: "oklch(0.78 0.16 220)" }}
                  />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">
                    Your Data Belongs to You — Only You
                  </h3>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "oklch(0.72 0.14 230)" }}
                  >
                    Completely private. Fully sovereign. Unhackable by design.
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                <p>
                  Cloud Capsule runs on the{" "}
                  <span className="text-foreground font-semibold">
                    Internet Computer blockchain
                  </span>{" "}
                  — a decentralized network of compute nodes that stores and
                  executes your data without relying on any traditional cloud
                  provider. There is no AWS, no Google Cloud, no centralized
                  server that can be seized, hacked, or shut down.
                </p>
                <p>
                  Your capsule content is{" "}
                  <span className="text-foreground font-semibold">
                    access-controlled by your identity
                  </span>{" "}
                  — only you and the beneficiaries you explicitly authorize can
                  ever view it. The Cloud Capsule team has no ability to read,
                  copy, or hand over your private content. Access control is
                  enforced at the code level by the Internet Computer's
                  cryptographic security model, not by a password policy or
                  privacy promise.
                </p>
                <p>
                  Infrastructure and cycle costs are handled automatically so
                  you never have to think about them. Since a Cloud Capsule sees
                  very little traffic, the on-chain storage cost is minimal —
                  and your capsule is designed to{" "}
                  <span className="text-foreground font-semibold">
                    outlast you
                  </span>
                  .
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 pb-20 pt-10 md:px-12">
          <div className="max-w-5xl mx-auto">
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.1 } },
              }}
            >
              {features.map((f) => (
                <motion.div
                  key={f.title}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5 },
                    },
                  }}
                  className="capsule-card p-6 space-y-3"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: `oklch(0.55 0.2 ${f.hue} / 0.15)`,
                      border: `1px solid oklch(0.55 0.2 ${f.hue} / 0.25)`,
                    }}
                  >
                    <f.icon
                      className="w-5 h-5"
                      style={{ color: `oklch(0.72 0.16 ${f.hue})` }}
                    />
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      {/* Bottom CTA Section */}
      <motion.section
        className="relative z-10 px-6 py-20 md:px-12"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          {/* Decorative glow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse, oklch(0.55 0.2 250 / 0.15), transparent 70%)",
            }}
          />

          <motion.h2
            className="font-display text-4xl md:text-5xl font-bold leading-tight relative"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="text-foreground">Your legacy deserves</span>
            <br />
            <span className="text-gradient-sky italic font-serif">
              to last forever.
            </span>
          </motion.h2>

          <motion.p
            className="text-lg text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Start your capsule today or access one left for you.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Button
              size="lg"
              onClick={handleCreateCapsule}
              disabled={isLoggingIn || isInitializing}
              data-ocid="landing.create_capsule_button"
              className="w-full sm:w-auto gap-2 text-base px-8 py-6 rounded-xl border-0 font-semibold glow-sky bg-gradient-sky text-white hover:opacity-90 transition-all duration-200"
            >
              {isLoggingIn
                ? "Connecting..."
                : isAuthenticated
                  ? "Open My Capsule"
                  : "Create My Capsule"}
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleAccessCapsule}
              data-ocid="landing.access_capsule_button"
              className="w-full sm:w-auto gap-2 text-base px-8 py-6 rounded-xl border-2 font-semibold transition-all duration-200 hover:bg-white/5"
              style={{
                borderColor: "oklch(0.42 0.12 265)",
                color: "oklch(0.78 0.1 240)",
              }}
            >
              <Lock className="w-4 h-4" />
              Access a Capsule
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-6 px-6 md:px-12">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img
              src="/assets/uploads/4FFBD3E5-2A6D-4DA4-B19E-16EFB7B05C9D-1.png"
              alt="Cloud Capsule"
              className="w-5 h-5 object-contain opacity-80"
            />
            <span className="font-display font-semibold text-foreground">
              Cloud Capsule
            </span>
          </div>
          <p>
            © {new Date().getFullYear()}. Built with{" "}
            <Heart className="w-3.5 h-3.5 inline text-red-400" /> using{" "}
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
