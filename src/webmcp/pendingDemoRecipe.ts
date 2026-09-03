import { useEffect, useRef } from "react";

import { DEMO_RECIPE_BY_ID, type DemoRecipeId } from "./demoRecipes";
import type { WebMcpAdapter } from "./WebMcpAdapter";

const STORAGE_PREFIX = "tangle.webmcp.demo.";

interface PendingDemo {
  pipelineName: string;
  recipeId: DemoRecipeId;
}

export function queueDemoRecipe(value: PendingDemo) {
  localStorage.setItem(
    `${STORAGE_PREFIX}${value.pipelineName}`,
    JSON.stringify(value),
  );
}

function readPendingDemo(pipelineName: string): PendingDemo | null {
  const key = `${STORAGE_PREFIX}${pipelineName}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingDemo;
  } catch {
    localStorage.removeItem(key);
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
    const pending = readPendingDemo(pipelineName);
    if (!pending || pending.pipelineName !== pipelineName) return;
    const recipe = DEMO_RECIPE_BY_ID.get(pending.recipeId);
    if (!recipe) return;
    if (adapter.createPipelineSnapshot().tasks.length > 0) return;
    started.current = true;
    try {
      adapter.addPipelineTasks(recipe.batch);
    } catch (error) {
      console.error("Could not initialise demo pipeline", error);
    }
  }, [adapter, pipelineName, ready]);
}
