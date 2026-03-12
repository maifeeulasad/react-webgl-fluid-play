/*
Copyright (c) (2026 - infinity) Maifee Ul Asad
*/

export { default } from "./Canvas";
export { default as Canvas } from "./Canvas";
export type {
  CanvasAnimationOptions,
  CanvasInitialAnimation,
  CanvasProps,
  CanvasRef,
} from "./Canvas";

export { PathFollower } from "./PathFollower";

export {
  PREDEFINED_PATH_IDS,
  PREDEFINED_PATHS,
  createPredefinedPath,
  getPredefinedPath,
  getPredefinedPaths,
  isPredefinedPathId,
  cloneFluidPath,
} from "./paths";

export type {
  FluidPath,
  FluidPathOverrides,
  PathColor,
  PathPoint,
  PredefinedPathId,
} from "./paths";