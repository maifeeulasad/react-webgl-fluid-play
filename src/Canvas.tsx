import React, { useEffect, useRef, useState, useCallback } from "react";
import { fluidSim } from "./fluid";
import PathManager, { FluidPath } from "./PathManager";
import { PathFollower } from "./PathFollower";

interface ICanvasProps {
  height?: number;
  width?: number;
}

const Canvas = ({ height: heightProps, width: widthProps }: ICanvasProps) => {
  const [height, setHeight] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  // Detect mobile device immediately
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    return window.innerWidth > window.innerHeight;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();
  const pathFollowerRef = useRef<PathFollower>(new PathFollower());
  const fluidControlRef = useRef<any>(null);

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

  // Initialize fluid simulation with error handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) {
      console.log('Canvas not ready:', { canvas: !!canvas, width, height });
      return;
    }

    // Ensure canvas has the correct dimensions
    if (canvas.width !== width || canvas.height !== height) {
      console.log('Setting canvas dimensions:', { width, height });
      canvas.width = width;
      canvas.height = height;
    }

    // Double-check canvas has valid dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      console.error('Canvas dimensions are still invalid after setting');
      setError('Canvas dimensions are invalid. Please refresh the page.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Initializing fluid simulation with canvas:', {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight
      });

      // Initialize fluid simulation
      const fluidControl = fluidSim(canvas, {}, pathFollowerRef.current);
      fluidControlRef.current = fluidControl;

      setIsLoading(false);
      console.log('Fluid simulation initialized successfully');
    } catch (err) {
      console.error('Failed to initialize fluid simulation:', err);
      setError(`Failed to initialize WebGL: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [canvasRef, width, height]);

  // Hide welcome after simulation loads or on click
  useEffect(() => {
    if (!isLoading && !error && showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, error, showWelcome]);

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
      {/* Path Manager */}
      <PathManager 
        onPathChange={handlePathChange}
        canvasWidth={width}
        canvasHeight={height}
      />
      
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: isMobile ? '80px' : '60px',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          padding: isMobile ? '10px 15px' : '0 20px',
          zIndex: 1000,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ marginBottom: isMobile ? '5px' : 0 }}>
          <h1 style={{ color: '#fff', fontSize: isMobile ? '1.2rem' : '1.5rem', margin: 0, fontWeight: 'bold' }}>React WebGL Fluid Play</h1>
          <p style={{ color: '#fff', opacity: 0.8, margin: 0, fontSize: isMobile ? '0.8rem' : '0.9rem' }}>By Maifee Ul Asad</p>
        </div>
        <div style={{ color: '#fff', fontSize: isMobile ? '0.7rem' : '0.8rem', opacity: 0.7, textAlign: isMobile ? 'left' : 'right' }}>
          <p style={{ margin: 0 }}>All necessary citations are mentioned in the codebase.</p>
          <p style={{ margin: 0 }}>Based on <a href="https://github.com/PavelDoGreat/WebGL-Fluid-Simulation" target="_blank" rel="noopener noreferrer" style={{ color: '#4fc3f7' }}>PavelDoGreat's WebGL-Fluid-Simulation</a></p>
        </div>
      </div>
      {/* Fallback display when WebGL fails */}
      {error && !isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <img
            src="/logo512.png"
            alt="Fluid Simulation Logo"
            style={{
              width: "120px",
              height: "120px",
              marginBottom: "20px",
              opacity: 0.8,
            }}
          />
          <h1 style={{ color: "#fff", marginBottom: "10px", fontSize: "2rem" }}>
            Fluid Simulation
          </h1>
          <p style={{ color: "#fff", opacity: 0.8, textAlign: "center", maxWidth: "400px", marginBottom: "20px" }}>
            Interactive WebGL fluid simulation is not available on this device/browser.
          </p>

          {/* Error details and troubleshooting */}
          <div
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              padding: "20px",
              borderRadius: "10px",
              maxWidth: "500px",
              textAlign: "center",
            }}
          >
            <h3 style={{ color: "#ff6b6b", marginBottom: "10px" }}>⚠️ WebGL Error</h3>
            <p style={{ color: "#fff", marginBottom: "15px", lineHeight: "1.4" }}>{error}</p>
            <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "15px" }}>
              <p style={{ color: "#fff" }}>Try these solutions:</p>
              <ul style={{ textAlign: "left", display: "inline-block", color: "#fff" }}>
                <li>Enable hardware acceleration in your browser</li>
                <li>Update your graphics drivers</li>
                <li>Try a different browser (Chrome recommended)</li>
                <li>Restart your browser</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                // Force re-initialization
                setTimeout(() => {
                  window.location.reload();
                }, 100);
              }}
              style={{
                padding: "10px 20px",
                marginRight: "10px",
                backgroundColor: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                backgroundColor: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Refresh Page
            </button>
          </div>
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

      {showWelcome && !isLoading && !error && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 500,
            backdropFilter: 'blur(5px)',
            cursor: 'pointer',
          }}
          onClick={() => setShowWelcome(false)}
        >
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <h1 style={{ fontSize: isMobile ? '2rem' : '3rem', margin: 0, fontWeight: 'bold' }}>Welcome to React WebGL Fluid Play</h1>
            <p style={{ fontSize: isMobile ? '1rem' : '1.2rem', opacity: 0.8, margin: '10px 0' }}>Interactive fluid simulation by Maifee Ul Asad</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>Click anywhere or wait to start</p>
          </div>
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
