/*
Copyright (c) (2022 - infinity) Maifee Ul Asad
*/

import React, { useEffect, useRef, useState, useCallback } from "react";
import { fluidSim } from "./fluid";
import PathManager, { FluidPath } from "./PathManager";
import { PathFollower } from "./PathFollower";

interface ICanvasProps {
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
  /** Custom loading indicator. Defaults to a simple spinner. */
  loadingFallback?: React.ReactNode;
  /** Custom error UI. Receives the error message and a retry callback. */
  errorFallback?: (error: string, retry: () => void) => React.ReactNode;
}

const Canvas = ({
  height: heightProps,
  width: widthProps,
  className,
  style,
  onLoad,
  onError,
  showPathManager = false,
  loadingFallback,
  errorFallback,
}: ICanvasProps) => {
  const [height, setHeight] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [isMobile] = useState<boolean>(() =>
    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();
  const pathFollowerRef = useRef<PathFollower>(new PathFollower());
  const fluidControlRef = useRef<any>(null);

  // Update dimensions with better mobile handling
  const updateDimensions = useCallback(() => {
    const update = () => {
      if (heightProps && widthProps) {
        setHeight(heightProps);
        setWidth(widthProps);
      } else {
        // Use visual viewport for better mobile support
        const visualViewport = window.visualViewport;
        const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (visualViewport && isMobileDevice) {
          setHeight(visualViewport.height);
          setWidth(visualViewport.width);
        } else {
          setHeight(window.innerHeight);
          setWidth(window.innerWidth);
        }
      }
    };

    // Debounce for better performance
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(update);
  }, [heightProps, widthProps]);

  useEffect(() => {
    updateDimensions();
    const handleResize = () => updateDimensions();
    const handleVisualViewportChange = () => updateDimensions();

    window.addEventListener('resize', handleResize, { passive: true });

    // Listen to visual viewport changes for mobile
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateDimensions]);

  // Initialize fluid simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    if (canvas.width === 0 || canvas.height === 0) {
      const msg = 'Canvas dimensions are invalid. Please refresh the page.';
      setError(msg);
      setIsLoading(false);
      onError?.(msg);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const fluidControl = fluidSim(canvas, {}, pathFollowerRef.current);
      fluidControlRef.current = fluidControl;

      setIsLoading(false);
      onLoad?.();
    } catch (err) {
      const msg = `Failed to initialize WebGL: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('Failed to initialize fluid simulation:', err);
      setError(msg);
      setIsLoading(false);
      onError?.(msg);
    }
  }, [canvasRef, width, height, onLoad, onError]);

  // Handle path changes
  const handlePathChange = useCallback((path: FluidPath | null) => {
    if (fluidControlRef.current) {
      fluidControlRef.current.setPath(path);
    }
  }, []);

  // Prevent default touch behaviors that interfere with the simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventDefault = (e: TouchEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchmove', preventDefault, { passive: false });
    canvas.addEventListener('touchend', preventDefault, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventDefault);
      canvas.removeEventListener('touchmove', preventDefault);
      canvas.removeEventListener('touchend', preventDefault);
    };
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setTimeout(() => window.location.reload(), 100);
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
        <PathManager
          onPathChange={handlePathChange}
          canvasWidth={width}
          canvasHeight={height}
        />
      )}

      {error && !isLoading && (
        errorFallback ? errorFallback(error, handleRetry) : defaultErrorFallback(error)
      )}

      {isLoading && !error && (
        loadingFallback !== undefined ? loadingFallback : defaultLoadingFallback
      )}

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

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fluidSpinner {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
};

export default Canvas;
