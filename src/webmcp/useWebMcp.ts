import { useEffect, useMemo, useState } from "react";

import type { UndoStore } from "@/routes/v2/pages/Editor/store/undoStore";
import type { NavigationStore } from "@/routes/v2/shared/store/navigationStore";

import { createWebMcpToolDefinitions } from "./toolDefinitions";
import { WebMcpAdapter } from "./WebMcpAdapter";

export interface WebMcpRegistrationState {
  available: boolean;
  registered: boolean;
  toolCount: number;
  error: string | null;
}

export function useWebMcp(navigation: NavigationStore, undo: UndoStore) {
  const adapter = useMemo(
    () =>
      new WebMcpAdapter({
        getSpec: () => navigation.rootSpec,
        getActiveSubgraphPath: () =>
          navigation.navigationPath.slice(1).map((entry) => entry.displayName),
        undo,
      }),
    [navigation, undo],
  );
  const [state, setState] = useState<WebMcpRegistrationState>({
    available: typeof document.modelContext?.registerTool === "function",
    registered: false,
    toolCount: 0,
    error: null,
  });

  useEffect(() => {
    const modelContext = document.modelContext;
    if (typeof modelContext?.registerTool !== "function") {
      setState({
        available: false,
        registered: false,
        toolCount: 0,
        error: null,
      });
      return;
    }
    const registration = new AbortController();
    const tools = createWebMcpToolDefinitions(adapter);
    let active = true;
    Promise.all(
      tools.map((tool) =>
        modelContext.registerTool(tool, { signal: registration.signal }),
      ),
    )
      .then(() => {
        if (active)
          setState({
            available: true,
            registered: true,
            toolCount: tools.length,
            error: null,
          });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          available: true,
          registered: false,
          toolCount: 0,
          error:
            error instanceof Error
              ? error.message
              : "WebMCP tool registration failed.",
        });
      });
    return () => {
      active = false;
      registration.abort();
    };
  }, [adapter]);

  return { adapter, registration: state };
}
