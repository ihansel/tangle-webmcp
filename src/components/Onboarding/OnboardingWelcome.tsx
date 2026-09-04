import { Link, Navigate } from "@tanstack/react-router";

import { StrandLogo } from "@/components/brand/StrandLogo";
import { OnboardingHero } from "@/components/Learn/OnboardingHero";
import { BlockStack } from "@/components/ui/layout";
import { Spinner } from "@/components/ui/spinner";
import { useOnboarding } from "@/providers/OnboardingProvider/OnboardingProvider";
import { APP_ROUTES } from "@/routes/appRoutes";
import { tracking } from "@/utils/tracking";

export function OnboardingWelcome() {
  const { isResolved, shouldShowOnboarding } = useOnboarding();

  if (!isResolved) {
    return (
      <BlockStack align="center" inlineAlign="center" className="h-full">
        <Spinner />
      </BlockStack>
    );
  }

  if (!shouldShowOnboarding) {
    return <Navigate to={APP_ROUTES.DASHBOARD} replace />;
  }

  return (
    <BlockStack
      gap="4"
      align="center"
      inlineAlign="center"
      className="h-full w-full"
    >
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <StrandLogo
            showByline
            className="justify-center"
            markClassName="size-10"
          />
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            An independent WebMCP ML workspace built on Tangle&apos;s
            open-source visual pipeline editor.
          </p>
        </div>
        <OnboardingHero />
      </div>
      <Link
        to={APP_ROUTES.LEARN}
        className="text-sm text-muted-foreground hover:text-foreground"
        {...tracking("homepage.onboarding.learning_hub")}
      >
        Explore the Learning Hub →
      </Link>
    </BlockStack>
  );
}
