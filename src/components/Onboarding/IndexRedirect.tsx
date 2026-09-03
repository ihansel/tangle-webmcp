import { Navigate } from "@tanstack/react-router";

import { APP_ROUTES } from "@/routes/appRoutes";

export function IndexRedirect() {
  return <Navigate replace to={APP_ROUTES.DASHBOARD} />;
}
