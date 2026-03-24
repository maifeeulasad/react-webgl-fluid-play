/*
Copyright (c) (2022 - infinity) Maifee Ul Asad
*/

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { fluidSim, type FluidConfig } from "./fluid";
import { PathFollower } from "./PathFollower";
import PathManager from "./PathManager";
import ConfigPanel from "./ConfigPanel";
import {
  cloneFluidPath,
  createPredefinedPath,
  type FluidPath,
  type FluidPathOverrides,
  type PredefinedPathId,
} from "./paths";

interface FluidControl {
  setPath: (path: FluidPath | null) => void;
  getPathFollower: () => PathFollower | undefined;
  isFollowingPath: () => boolean;
  stopPath: () => void;
  updateConfig: (key: keyof FluidConfig, value: any) => void;
  getConfig: () => Partial<FluidConfig>;
}

interface PendingAnimation {
  path: FluidPath | PredefinedPathId | null;
  options?: CanvasAnimationOptions;
}

export interface CanvasAnimationOptions {
  /** Number of loops before stopping. Omit or set -1 for infinite loops. */
  maxLoops?: number;
  /** Optional overrides used when the path input is a predefined path id. */
  predefinedOverrides?: FluidPathOverrides;
}

export interface CanvasInitialAnimation {
  path: FluidPath | PredefinedPathId;
  options?: CanvasAnimationOptions;
}

export interface CanvasRef {
  playPath: (path: FluidPath, options?: CanvasAnimationOptions) => void;
  playPredefinedPath: (pathId: PredefinedPathId, options?: CanvasAnimationOptions) => void;
  stopPath: () => void;
  clearPath: () => void;
  isPlayingPath: () => boolean;
  getCurrentPath: () => FluidPath | null;
}

export interface CanvasProps {
  height?: number;
  width?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Called when the fluid simulation has successfully initialized. */
  onLoad?: () => void;
  /** Called when the fluid simulation fails to initialize. */
  onError?: (error: string) => void;
  /** Whether to render the built-in PathManager UI. Defaults to false. */
  showPathManager?: boolean;
  /** Whether to render the built-in ConfigPanel UI. Defaults to false. */
  showConfigPanel?: boolean;
  /** Optional animation that should start when the simulation is ready. */
  initialAnimation?: CanvasInitialAnimation;
  /** Custom loading indicator. Defaults to a simple spinner. */
  loadingFallback?: React.ReactNode;
  /** Custom error UI. Receives the error message and a retry callback. */
  errorFallback?: (error: string, retry: () => void) => React.ReactNode;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(
  (
    {
      height: heightProps,
      width: widthProps,
      className,
      style,
      onLoad,
      onError,
      showPathManager = false,
      showConfigPanel = false,
      initialAnimation,
      loadingFallback,
      errorFallback,
    },
    ref
  ) => {
    const [height, setHeight] = useState<number>(0);
    const [width, setWidth] = useState<number>(0);
    const [isMobile] = useState<boolean>(() => {
      if (typeof navigator === "undefined") {return false;}
      return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    });
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [retrySeed, setRetrySeed] = useState(0);
    const [fluidConfig, setFluidConfig] = useState<Partial<FluidConfig>>({});

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const pathFollowerRef = useRef<PathFollower>(new PathFollower());
    const fluidControlRef = useRef<FluidControl | null>(null);
    const initialAnimationAppliedRef = useRef<boolean>(false);
    const initialAnimationRef = useRef<CanvasInitialAnimation | undefined>(initialAnimation);
    const activeAnimationRef = useRef<{ path: FluidPath; options?: CanvasAnimationOptions } | null>(null);
    const queuedAnimationRef = useRef<PendingAnimation | null>(null);

    const resolvePath = useCallback(
      (pathInput: FluidPath | PredefinedPathId, options?: CanvasAnimationOptions): FluidPath => {
        if (typeof pathInput === "string") {
          return createPredefinedPath(pathInput, options?.predefinedOverrides);
        }
        return cloneFluidPath(pathInput);
      },
      []
    );

    const playAnimation = useCallback(
      (pathInput: FluidPath | PredefinedPathId | null, options?: CanvasAnimationOptions) => {
        const fluidControl = fluidControlRef.current;

        if (!fluidControl) {
          queuedAnimationRef.current = { path: pathInput, options };
          return;
        }

        if (pathInput === null) {
          pathFollowerRef.current.setMaxLoops(-1);
          fluidControl.setPath(null);
          activeAnimationRef.current = null;
          return;
        }

        const resolvedPath = resolvePath(pathInput, options);
        const maxLoops = typeof options?.maxLoops === "number" ? options.maxLoops : -1;

        pathFollowerRef.current.setMaxLoops(maxLoops);
        fluidControl.setPath(resolvedPath);
        activeAnimationRef.current = { path: resolvedPath, options };
      },
      [resolvePath]
    );

    useEffect(() => {
      initialAnimationRef.current = initialAnimation;

      if (
        initialAnimation &&
        !initialAnimationAppliedRef.current &&
        fluidControlRef.current &&
        !activeAnimationRef.current
      ) {
        initialAnimationAppliedRef.current = true;
        playAnimation(initialAnimation.path, initialAnimation.options);
      }
    }, [initialAnimation, playAnimation]);

    useImperativeHandle(
      ref,
      () => ({
        playPath: (path: FluidPath, options?: CanvasAnimationOptions) => {
          playAnimation(path, options);
        },
        playPredefinedPath: (pathId: PredefinedPathId, options?: CanvasAnimationOptions) => {
          playAnimation(pathId, options);
        },
        stopPath: () => {
          playAnimation(null);
        },
        clearPath: () => {
          playAnimation(null);
        },
        isPlayingPath: () => pathFollowerRef.current.isFollowingPath(),
        getCurrentPath: () => pathFollowerRef.current.getCurrentPath(),
      }),
      [playAnimation]
    );

    // Update dimensions with better mobile handling
    const updateDimensions = useCallback(() => {
      const update = () => {
        if (heightProps && widthProps) {
          setHeight(heightProps);
          setWidth(widthProps);
        } else {
          const visualViewport = window.visualViewport;
          const isMobileDevice =
            /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (visualViewport && isMobileDevice) {
            setHeight(visualViewport.height);
            setWidth(visualViewport.width);
          } else {
            setHeight(window.innerHeight);
            setWidth(window.innerWidth);
          }
        }
      };

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(update);
    }, [heightProps, widthProps]);

    useEffect(() => {
      updateDimensions();
      const handleResize = () => updateDimensions();
      const handleVisualViewportChange = () => updateDimensions();

      window.addEventListener("resize", handleResize, { passive: true });

      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", handleVisualViewportChange, {
          passive: true,
        });
      }

      return () => {
        window.removeEventListener("resize", handleResize);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", handleVisualViewportChange);
        }
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [updateDimensions]);

    // Initialize fluid simulation
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || width === 0 || height === 0) {return;}

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      if (canvas.width === 0 || canvas.height === 0) {
        const msg = "Canvas dimensions are invalid. Please refresh the page.";
        setError(msg);
        setIsLoading(false);
        onError?.(msg);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const fluidControl = fluidSim(canvas, {}, pathFollowerRef.current) as FluidControl;
        fluidControlRef.current = fluidControl;
        setFluidConfig(fluidControl.getConfig());

        setIsLoading(false);
        onLoad?.();

        if (queuedAnimationRef.current) {
          const queuedAnimation = queuedAnimationRef.current;
          queuedAnimationRef.current = null;
          playAnimation(queuedAnimation.path, queuedAnimation.options);
        } else if (activeAnimationRef.current) {
          playAnimation(activeAnimationRef.current.path, activeAnimationRef.current.options);
        } else if (initialAnimationRef.current && !initialAnimationAppliedRef.current) {
          initialAnimationAppliedRef.current = true;
          playAnimation(initialAnimationRef.current.path, initialAnimationRef.current.options);
        }
      } catch (err) {
        const msg = `Failed to initialize WebGL: ${err instanceof Error ? err.message : "Unknown error"}`;
        console.error("Failed to initialize fluid simulation:", err);
        setError(msg);
        setIsLoading(false);
        onError?.(msg);
      }
    }, [
      canvasRef,
      width,
      height,
      onLoad,
      onError,
      playAnimation,
      retrySeed,
    ]);

    const handlePathChange = useCallback(
      (path: FluidPath | null) => {
        playAnimation(path);
      },
      [playAnimation]
    );

    const handleConfigChange = useCallback(
      (key: keyof FluidConfig, value: any) => {
        const fluidControl = fluidControlRef.current;
        if (fluidControl) {
          fluidControl.updateConfig(key, value);
          setFluidConfig((prev) => ({
            ...prev,
            [key]: value,
          }));
        }
      },
      []
    );

    // Prevent default touch behaviors that interfere with the simulation
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) {return;}

      const preventDefault = (e: TouchEvent) => {
        e.preventDefault();
      };

      canvas.addEventListener("touchstart", preventDefault, { passive: false });
      canvas.addEventListener("touchmove", preventDefault, { passive: false });
      canvas.addEventListener("touchend", preventDefault, { passive: false });

      return () => {
        canvas.removeEventListener("touchstart", preventDefault);
        canvas.removeEventListener("touchmove", preventDefault);
        canvas.removeEventListener("touchend", preventDefault);
      };
    }, []);

    const handleRetry = useCallback(() => {
      setError(null);
      setIsLoading(true);
      setRetrySeed((prev) => prev + 1);
    }, []);

    const defaultErrorFallback = (err: string) => (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "#000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          color: "#fff",
          fontFamily: "Arial, sans-serif",
          textAlign: "center",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <p style={{ marginBottom: "8px", opacity: 0.8 }}>{err}</p>
        <button
          onClick={handleRetry}
          style={{
            padding: "8px 18px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Retry
        </button>
      </div>
    );

    const defaultLoadingFallback = (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "#fff",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid rgba(255,255,255,0.2)",
            borderTop: "3px solid #fff",
            borderRadius: "50%",
            animation: "fluidSpinner 0.8s linear infinite",
            margin: "0 auto 10px",
          }}
        />
      </div>
    );

    return (
      <div
        className={className}
        style={{
          height: "100%",
          width: "100%",
          overflow: "hidden",
          position: "relative",
          backgroundColor: "#000",
          touchAction: "none",
          userSelect: "none",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          ...style,
        }}
      >
        {showPathManager && (
          <PathManager onPathChange={handlePathChange} />
        )}

        {showConfigPanel && (
          <ConfigPanel config={fluidConfig} onConfigChange={handleConfigChange} />
        )}

        {error && !isLoading &&
          (errorFallback ? errorFallback(error, handleRetry) : defaultErrorFallback(error))}

        {isLoading && !error &&
          (loadingFallback !== undefined ? loadingFallback : defaultLoadingFallback)}

        <canvas
          ref={canvasRef}
          height={height}
          width={width}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            imageRendering: isMobile ? "auto" : "pixelated",
          }}
        />

        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes fluidSpinner {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `,
          }}
        />
      </div>
    );
  }
);

Canvas.displayName = "Canvas";

export default Canvas;
