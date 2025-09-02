import React, { useEffect, useRef, useState, useCallback } from "react";
import { fluidSim } from "./fluid";

interface ICanvasProps {
  height?: number;
  width?: number;
}

const Canvas = ({ height: heightProps, width: widthProps }: ICanvasProps) => {
  const [height, setHeight] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isLandscape, setIsLandscape] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      return mobile;
    };

    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkMobile();
    checkOrientation();

    const handleOrientationChange = () => {
      setTimeout(checkOrientation, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', checkOrientation);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', checkOrientation);
    };
  }, []);

  // Update dimensions with better mobile handling
  const updateDimensions = useCallback(() => {
    const update = () => {
      if (heightProps && widthProps) {
        setHeight(heightProps);
        setWidth(widthProps);
      } else {
        // Use visual viewport for better mobile support
        const visualViewport = window.visualViewport;
        if (visualViewport && isMobile) {
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
  }, [heightProps, widthProps, isMobile]);

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

  // Initialize fluid simulation with error handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;

    try {
      setIsLoading(true);
      setError(null);

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Initialize fluid simulation
      fluidSim(canvas);

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize fluid simulation:', err);
      setError('Failed to initialize WebGL. Please try refreshing the page.');
      setIsLoading(false);
    }
  }, [canvasRef, width, height]);

  // Prevent default touch behaviors that interfere with the simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventDefault = (e: TouchEvent) => {
      e.preventDefault();
    };

    // Prevent scrolling and zooming on touch
    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchmove', preventDefault, { passive: false });
    canvas.addEventListener('touchend', preventDefault, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventDefault);
      canvas.removeEventListener('touchmove', preventDefault);
      canvas.removeEventListener('touchend', preventDefault);
    };
  }, []);

  // Handle visibility change for performance
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause expensive operations when tab is not visible
        console.log('Tab hidden, fluid simulation may pause');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        backgroundColor: "#000",
        touchAction: "none", // Prevent default touch actions
        userSelect: "none", // Prevent text selection
        WebkitTouchCallout: "none", // Prevent callout on iOS
        WebkitUserSelect: "none", // Prevent selection on iOS
      }}
    >
      {error && (
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
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              marginTop: "10px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Refresh Page
          </button>
        </div>
      )}

      {isLoading && !error && (
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
              width: "40px",
              height: "40px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #007bff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 10px",
            }}
          />
          <p>Loading fluid simulation...</p>
          {isMobile && (
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Optimizing for mobile device
            </p>
          )}
        </div>
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
          imageRendering: isMobile ? "auto" : "pixelated", // Better performance on mobile
        }}
      />

      {/* Mobile-specific instructions */}
      {isMobile && !isLoading && !error && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#fff",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
            fontSize: "14px",
            opacity: 0.7,
            pointerEvents: "none",
            zIndex: 100,
          }}
        >
          <p>Touch and drag to create fluid effects</p>
          {!isLandscape && <p>Rotate to landscape for best experience</p>}
        </div>
      )}

      {/* Add CSS animation for loading spinner */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
};

export default Canvas;
