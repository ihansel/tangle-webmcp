import { SelectionMode } from "@xyflow/react";

export const GRID_SIZE = 10;
export const ZOOM_THRESHOLD = 0.3;
export const MAX_COLLAPSED_SCALE = 7;
export const READABLE_FIT_MIN_ZOOM = 0.25;

/**
 * Shared ReactFlow props that are identical across Editor and RunView canvases.
 *
 * Does NOT include `nodeTypes` / `edgeTypes` because those depend on
 * page-specific manifest registration (side-effect imports) that must
 * happen before the registry is queried.  Each canvas computes them
 * at module level after its own `import "./nodes"`.
 */
export const FLOW_CANVAS_DEFAULT_PROPS = {
  snapToGrid: true,
  snapGrid: [GRID_SIZE, GRID_SIZE] as [number, number],
  minZoom: 0.1,
  maxZoom: 2,
  fitView: true,
  // Large pipelines may extend beyond the first viewport. Keep the initial
  // fitted view large enough that simplified task labels remain readable;
  // people can still zoom farther out manually when they need an overview.
  fitViewOptions: {
    minZoom: READABLE_FIT_MIN_ZOOM,
    maxZoom: 1,
    padding: 0.2,
  },
  proOptions: { hideAttribution: true },
  selectionOnDrag: false,
  selectionMode: SelectionMode.Full,
  panOnDrag: true,
  zIndexMode: "manual" as const,
  defaultEdgeOptions: { style: { stroke: "#6b7280", strokeWidth: 4 } },
} as const;
