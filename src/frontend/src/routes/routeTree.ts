import { createRootRoute, createRoute } from "@tanstack/react-router";
import AdminPage from "../pages/AdminPage";
import BeneficiaryCapsulePage from "../pages/BeneficiaryCapsulePage";
import BeneficiaryLoginPage from "../pages/BeneficiaryLoginPage";
import DashboardPage from "../pages/DashboardPage";
import LandingPage from "../pages/LandingPage";
import SharedDocPage from "../pages/SharedDocPage";
import RootLayout from "./RootLayout";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const accessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/access",
  component: BeneficiaryLoginPage,
});

const accessWithCodeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/access/$code",
  component: BeneficiaryLoginPage,
});

const capsuleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/capsule/$ownerPrincipal",
  component: BeneficiaryCapsulePage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const shareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/share/$token",
  component: SharedDocPage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  accessWithCodeRoute,
  accessRoute,
  capsuleRoute,
  adminRoute,
  shareRoute,
]);
