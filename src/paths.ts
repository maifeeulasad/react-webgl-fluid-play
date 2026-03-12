/*
Copyright (c) (2026 - infinity) Maifee Ul Asad
*/

export interface PathPoint {
  x: number;
  y: number;
  timestamp?: number;
}

export interface PathColor {
  r: number;
  g: number;
  b: number;
}

export interface FluidPath {
  id: string;
  name: string;
  points: PathPoint[];
  duration: number;
  loop: boolean;
  color?: PathColor;
}

export type PredefinedPathId =
  | "oval"
  | "infinity"
  | "spiral"
  | "wave"
  | "star"
  | "heart";

export type FluidPathOverrides = Partial<Omit<FluidPath, "id" | "name" | "points">> & {
  points?: PathPoint[];
};

interface PredefinedPathTemplate {
  id: PredefinedPathId;
  name: string;
  duration: number;
  loop: boolean;
  color?: PathColor;
}

export const PREDEFINED_PATH_IDS: ReadonlyArray<PredefinedPathId> = [
  "oval",
  "infinity",
  "spiral",
  "wave",
  "star",
  "heart",
];

const PREDEFINED_PATH_TEMPLATES: ReadonlyArray<PredefinedPathTemplate> = [
  { id: "oval", name: "Oval", duration: 5, loop: true },
  { id: "infinity", name: "Infinity", duration: 8, loop: true },
  { id: "spiral", name: "Spiral", duration: 10, loop: false },
  { id: "wave", name: "Wave", duration: 6, loop: true },
  { id: "star", name: "Star", duration: 7, loop: true },
  { id: "heart", name: "Heart", duration: 6, loop: true },
];

export function isPredefinedPathId(value: string): value is PredefinedPathId {
  return PREDEFINED_PATH_IDS.includes(value as PredefinedPathId);
}

export function cloneFluidPath(path: FluidPath): FluidPath {
  return {
    ...path,
    points: path.points.map((point) => ({ ...point })),
    color: path.color ? { ...path.color } : undefined,
  };
}

export function createPredefinedPath(pathId: PredefinedPathId, overrides: FluidPathOverrides = {}): FluidPath {
  const template = PREDEFINED_PATH_TEMPLATES.find((path) => path.id === pathId);
  if (!template) {
    throw new Error(`Unknown predefined path id: ${pathId}`);
  }

  return {
    ...template,
    points: overrides.points ? overrides.points.map((point) => ({ ...point })) : generatePathPoints(pathId),
    duration: overrides.duration ?? template.duration,
    loop: overrides.loop ?? template.loop,
    color: overrides.color ?? template.color,
  };
}

export const PREDEFINED_PATHS: ReadonlyArray<FluidPath> = PREDEFINED_PATH_IDS.map((pathId) =>
  createPredefinedPath(pathId)
);

export function getPredefinedPath(pathId: PredefinedPathId): FluidPath {
  return createPredefinedPath(pathId);
}

export function getPredefinedPaths(): FluidPath[] {
  return PREDEFINED_PATHS.map(cloneFluidPath);
}

function generatePathPoints(pathId: PredefinedPathId): PathPoint[] {
  const centerX = 0.5;
  const centerY = 0.5;
  const radiusX = 0.3;
  const radiusY = 0.3;

  switch (pathId) {
    case "oval": {
      const ovalPoints: PathPoint[] = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        ovalPoints.push({
          x: centerX + Math.cos(angle) * radiusX,
          y: centerY + Math.sin(angle) * radiusY,
        });
      }
      return ovalPoints;
    }

    case "infinity": {
      const infinityPoints: PathPoint[] = [];
      for (let i = 0; i <= 128; i++) {
        const t = (i / 128) * Math.PI * 2;
        infinityPoints.push({
          x: centerX + Math.sin(t) * radiusX,
          y: centerY + Math.sin(t) * Math.cos(t) * radiusY,
        });
      }
      return infinityPoints;
    }

    case "spiral": {
      const spiralPoints: PathPoint[] = [];
      for (let i = 0; i <= 200; i++) {
        const t = (i / 200) * Math.PI * 6;
        const radius = (i / 200) * radiusX;
        spiralPoints.push({
          x: centerX + Math.cos(t) * radius,
          y: centerY + Math.sin(t) * radius,
        });
      }
      return spiralPoints;
    }

    case "wave": {
      const wavePoints: PathPoint[] = [];
      for (let i = 0; i <= 100; i++) {
        const x = i / 100;
        wavePoints.push({
          x,
          y: centerY + Math.sin(x * Math.PI * 4) * 0.2,
        });
      }
      return wavePoints;
    }

    case "star": {
      const starPoints: PathPoint[] = [];
      const points = 5;
      const outerRadius = radiusX;
      const innerRadius = radiusX * 0.4;
      for (let i = 0; i <= points * 2; i++) {
        const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        starPoints.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      }
      starPoints.push({ ...starPoints[0] });
      return starPoints;
    }

    case "heart": {
      const heartPoints: PathPoint[] = [];
      for (let i = 0; i <= 100; i++) {
        const t = (i / 100) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y =
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t);
        heartPoints.push({
          x: centerX + (x / 20) * 0.3,
          y: centerY - (y / 20) * 0.3,
        });
      }
      return heartPoints;
    }

    default:
      return [];
  }
}