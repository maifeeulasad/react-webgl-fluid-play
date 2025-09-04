import { FluidPath, PathPoint } from './PathManager';

export class PathFollower {
  private path: FluidPath | null = null;
  private startTime: number = 0;
  private isActive: boolean = false;
  private currentPointIndex: number = 0;
  private completedLoops: number = 0;
  private maxLoops: number = -1; // -1 means infinite loops

  public setPath(path: FluidPath | null): void {
    this.path = path;
    this.startTime = Date.now();
    this.isActive = path !== null;
    this.currentPointIndex = 0;
    this.completedLoops = 0;
  }

  public setMaxLoops(maxLoops: number): void {
    this.maxLoops = maxLoops;
  }

  public isFollowingPath(): boolean {
    return this.isActive && this.path !== null;
  }

  public getCurrentPath(): FluidPath | null {
    return this.path;
  }

  public stop(): void {
    this.isActive = false;
    this.path = null;
  }

  public getCurrentPosition(canvasWidth: number, canvasHeight: number): { 
    x: number; 
    y: number; 
    deltaX: number; 
    deltaY: number;
    color?: { r: number; g: number; b: number };
  } | null {
    if (!this.isActive || !this.path || this.path.points.length === 0) {
      return null;
    }

    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.startTime) / 1000; // Convert to seconds

    // Calculate progress through the path
    let progress: number;
    
    if (this.path.loop) {
      // For looping paths, use modulo to repeat
      const cycleTime = elapsedTime % this.path.duration;
      progress = cycleTime / this.path.duration;
      
      // Check if we've completed a loop
      const currentLoop = Math.floor(elapsedTime / this.path.duration);
      if (currentLoop > this.completedLoops) {
        this.completedLoops = currentLoop;
        // Stop if we've reached max loops
        if (this.maxLoops > 0 && this.completedLoops >= this.maxLoops) {
          this.stop();
          return null;
        }
      }
    } else {
      // For non-looping paths, clamp to [0, 1]
      progress = Math.min(elapsedTime / this.path.duration, 1);
      
      // Stop if we've reached the end
      if (progress >= 1) {
        this.stop();
        return null;
      }
    }

    // Get the current point and next point for interpolation
    const totalPoints = this.path.points.length;
    const exactIndex = progress * (totalPoints - 1);
    const currentIndex = Math.floor(exactIndex);
    const nextIndex = Math.min(currentIndex + 1, totalPoints - 1);
    const interpolationFactor = exactIndex - currentIndex;

    const currentPoint = this.path.points[currentIndex];
    const nextPoint = this.path.points[nextIndex];

    // Interpolate between current and next point
    const interpolatedX = this.lerp(currentPoint.x, nextPoint.x, interpolationFactor);
    const interpolatedY = this.lerp(currentPoint.y, nextPoint.y, interpolationFactor);

    // Calculate delta (velocity) for the fluid simulation
    const prevPosition = this.getPreviousPosition(progress, totalPoints);
    const deltaX = interpolatedX - prevPosition.x;
    const deltaY = interpolatedY - prevPosition.y;

    // Convert normalized coordinates to pixel coordinates
    const pixelX = interpolatedX * canvasWidth;
    const pixelY = interpolatedY * canvasHeight;

    return {
      x: pixelX,
      y: pixelY,
      deltaX: deltaX * 5, // Amplify delta for better fluid effect
      deltaY: deltaY * 5,
      color: this.path.color,
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private getPreviousPosition(currentProgress: number, totalPoints: number): { x: number; y: number } {
    if (!this.path) {
      return { x: 0, y: 0 };
    }

    // Calculate position from a slightly earlier time for delta calculation
    const deltaTime = 0.016; // ~60fps frame time
    const prevProgress = Math.max(0, currentProgress - (deltaTime / this.path.duration));
    
    const exactIndex = prevProgress * (totalPoints - 1);
    const currentIndex = Math.floor(exactIndex);
    const nextIndex = Math.min(currentIndex + 1, totalPoints - 1);
    const interpolationFactor = exactIndex - currentIndex;

    const currentPoint = this.path.points[currentIndex];
    const nextPoint = this.path.points[nextIndex];

    return {
      x: this.lerp(currentPoint.x, nextPoint.x, interpolationFactor),
      y: this.lerp(currentPoint.y, nextPoint.y, interpolationFactor),
    };
  }

  public getPathProgress(): number {
    if (!this.isActive || !this.path) {
      return 0;
    }

    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.startTime) / 1000;

    if (this.path.loop) {
      const cycleTime = elapsedTime % this.path.duration;
      return cycleTime / this.path.duration;
    } else {
      return Math.min(elapsedTime / this.path.duration, 1);
    }
  }

  public getLoopsCompleted(): number {
    return this.completedLoops;
  }

  // Method to record a new path from mouse/touch input
  public static recordPath(
    startTime: number,
    points: { x: number; y: number; timestamp: number }[],
    canvasWidth: number,
    canvasHeight: number
  ): FluidPath {
    if (points.length === 0) {
      throw new Error('Cannot create path with no points');
    }

    // Normalize coordinates to [0, 1] range
    const normalizedPoints: PathPoint[] = points.map(point => ({
      x: point.x / canvasWidth,
      y: point.y / canvasHeight,
      timestamp: point.timestamp,
    }));

    // Calculate duration
    const duration = (points[points.length - 1].timestamp - points[0].timestamp) / 1000;

    return {
      id: `recorded-${Date.now()}`,
      name: `Recorded Path`,
      points: normalizedPoints,
      duration: Math.max(duration, 1), // Minimum 1 second duration
      loop: false,
    };
  }

  // Method to simplify recorded paths (reduce number of points while maintaining shape)
  public static simplifyPath(path: FluidPath, tolerance: number = 0.01): FluidPath {
    if (path.points.length <= 2) {
      return path;
    }

    const simplified = this.ramerDouglasPeucker(path.points, tolerance);
    
    return {
      ...path,
      points: simplified,
    };
  }

  // Ramer-Douglas-Peucker algorithm for path simplification
  private static ramerDouglasPeucker(points: PathPoint[], tolerance: number): PathPoint[] {
    if (points.length <= 2) {
      return points;
    }

    // Find the point with the maximum distance from the line between first and last points
    let maxDistance = 0;
    let maxIndex = 0;

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.pointToLineDistance(points[i], firstPoint, lastPoint);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const leftSegment = this.ramerDouglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const rightSegment = this.ramerDouglasPeucker(points.slice(maxIndex), tolerance);

      // Combine segments (remove duplicate point at junction)
      return leftSegment.slice(0, -1).concat(rightSegment);
    } else {
      // All points are within tolerance, return just the endpoints
      return [firstPoint, lastPoint];
    }
  }

  // Calculate distance from point to line
  private static pointToLineDistance(point: PathPoint, lineStart: PathPoint, lineEnd: PathPoint): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line start and end are the same point
      return Math.sqrt(A * A + B * B);
    }

    const param = dot / lenSq;
    
    let xx: number, yy: number;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }
}
