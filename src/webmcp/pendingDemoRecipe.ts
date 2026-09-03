import { useEffect, useRef } from "react";

import { DEMO_RECIPE_BY_ID, type DemoRecipeId } from "./demoRecipes";
import type { WebMcpAdapter } from "./WebMcpAdapter";

const STORAGE_KEY = "tangle.webmcp.pending-demo";

interface PendingDemo {
  pipelineName: string;
  recipeId: DemoRecipeId;
}

export function queueDemoRecipe(value: PendingDemo) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function readPendingDemo(): PendingDemo | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingDemo;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function usePendingDemoRecipe(
  adapter: WebMcpAdapter,
  pipelineName: string,
  ready: boolean,
) {
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    const pending = readPendingDemo();
    if (!pending || pending.pipelineName !== pipelineName) return;
    const recipe = DEMO_RECIPE_BY_ID.get(pending.recipeId);
    sessionStorage.removeItem(STORAGE_KEY);
    if (!recipe) return;
    started.current = true;
    try {
      adapter.addPipelineTasks(recipe.batch);
    } catch (error) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
      console.error("Could not initialise demo pipeline", error);
    }
  }, [adapter, pipelineName, ready]);
}
