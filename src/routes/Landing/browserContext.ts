export type RootExperience = "app" | "overview";

interface RootExperienceSignals {
  search: string;
  userAgent: string;
  hasModelContext: boolean;
}

export function resolveRootExperience({
  search,
  userAgent,
  hasModelContext,
}: RootExperienceSignals): RootExperience {
  const requestedView = new URLSearchParams(search).get("view");

  if (requestedView === "app") return "app";
  if (requestedView === "overview") return "overview";

  if (hasModelContext || /chatgpt|codex|electron/i.test(userAgent)) {
    return "app";
  }

  return "overview";
}

export function getCurrentRootExperience(): RootExperience {
  return resolveRootExperience({
    search: window.location.search,
    userAgent: window.navigator.userAgent,
    hasModelContext:
      "modelContext" in document &&
      typeof (document as Document & { modelContext?: unknown })
        .modelContext !== "undefined",
  });
}
