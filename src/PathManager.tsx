import React, { useState, useEffect } from 'react';

export interface PathPoint {
  x: number;
  y: number;
  timestamp?: number;
}

export interface FluidPath {
  id: string;
  name: string;
  points: PathPoint[];
  duration: number; // Duration in seconds to complete the path
  loop: boolean;
  color?: { r: number; g: number; b: number };
}

interface PathManagerProps {
  onPathChange: (path: FluidPath | null) => void;
  canvasWidth: number;
  canvasHeight: number;
}

// Predefined path templates
const PREDEFINED_PATHS: FluidPath[] = [
  {
    id: 'circle',
    name: 'Circle',
    points: [],
    duration: 5,
    loop: true,
  },
  {
    id: 'infinity',
    name: 'Infinity',
    points: [],
    duration: 8,
    loop: true,
  },
  {
    id: 'spiral',
    name: 'Spiral',
    points: [],
    duration: 10,
    loop: false,
  },
  {
    id: 'wave',
    name: 'Wave',
    points: [],
    duration: 6,
    loop: true,
  },
  {
    id: 'star',
    name: 'Star',
    points: [],
    duration: 7,
    loop: true,
  },
  {
    id: 'heart',
    name: 'Heart',
    points: [],
    duration: 6,
    loop: true,
  },
];

const PathManager: React.FC<PathManagerProps> = ({ onPathChange, canvasWidth, canvasHeight }) => {
  const [selectedPath, setSelectedPath] = useState<FluidPath | null>(null);
  const [customPaths, setCustomPaths] = useState<FluidPath[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPoints, setRecordingPoints] = useState<PathPoint[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [showManager, setShowManager] = useState(false);

  // Generate points for predefined paths based on canvas dimensions
  const generatePathPoints = (pathId: string): PathPoint[] => {
    const centerX = 0.5;
    const centerY = 0.5;
    const radiusX = 0.3;
    const radiusY = 0.3;

    switch (pathId) {
      case 'circle':
        const circlePoints: PathPoint[] = [];
        for (let i = 0; i <= 64; i++) {
          const angle = (i / 64) * Math.PI * 2;
          circlePoints.push({
            x: centerX + Math.cos(angle) * radiusX,
            y: centerY + Math.sin(angle) * radiusY,
          });
        }
        return circlePoints;

      case 'figure8':
        const figure8Points: PathPoint[] = [];
        for (let i = 0; i <= 128; i++) {
          const t = (i / 128) * Math.PI * 2;
          figure8Points.push({
            x: centerX + Math.sin(t) * radiusX,
            y: centerY + Math.sin(t) * Math.cos(t) * radiusY,
          });
        }
        return figure8Points;

      case 'spiral':
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

      case 'wave':
        const wavePoints: PathPoint[] = [];
        for (let i = 0; i <= 100; i++) {
          const x = i / 100;
          wavePoints.push({
            x: x,
            y: centerY + Math.sin(x * Math.PI * 4) * 0.2,
          });
        }
        return wavePoints;

      case 'star':
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
        starPoints.push(starPoints[0]); // Close the star
        return starPoints;

      case 'heart':
        const heartPoints: PathPoint[] = [];
        for (let i = 0; i <= 100; i++) {
          const t = (i / 100) * Math.PI * 2;
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          heartPoints.push({
            x: centerX + (x / 20) * 0.3,
            y: centerY - (y / 20) * 0.3,
          });
        }
        return heartPoints;

      default:
        return [];
    }
  };

  // Initialize predefined paths with generated points
  useEffect(() => {
    const pathsWithPoints = PREDEFINED_PATHS.map(path => ({
      ...path,
      points: generatePathPoints(path.id),
    }));
    
    // Update the predefined paths (you might want to store these differently)
    PREDEFINED_PATHS.forEach((path, index) => {
      path.points = pathsWithPoints[index].points;
    });
  }, [canvasWidth, canvasHeight]);

  const handlePathSelect = (path: FluidPath) => {
    setSelectedPath(path);
    onPathChange(path);
  };

  const handleStopPath = () => {
    setSelectedPath(null);
    onPathChange(null);
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingPoints([]);
    setRecordingStartTime(Date.now());
  };

  const stopRecording = () => {
    if (recordingPoints.length > 0) {
      const newPath: FluidPath = {
        id: `custom-${Date.now()}`,
        name: `Custom Path ${customPaths.length + 1}`,
        points: recordingPoints,
        duration: (Date.now() - recordingStartTime) / 1000,
        loop: false,
      };
      setCustomPaths([...customPaths, newPath]);
    }
    setIsRecording(false);
    setRecordingPoints([]);
  };

  const deleteCustomPath = (pathId: string) => {
    setCustomPaths(customPaths.filter(p => p.id !== pathId));
    if (selectedPath?.id === pathId) {
      handleStopPath();
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setShowManager(!showManager)}
        style={{
          position: 'fixed',
          top: '100px',
          right: '20px',
          zIndex: 2000,
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          backdropFilter: 'blur(10px)',
        }}
      >
        {showManager ? '✕ Close' : '🎯 Paths'}
      </button>

      {/* Path Manager Panel */}
      {showManager && (
        <div
          style={{
            position: 'fixed',
            top: '140px',
            right: '20px',
            width: '280px',
            maxHeight: '60vh',
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(15px)',
            borderRadius: '12px',
            padding: '20px',
            color: 'white',
            zIndex: 1500,
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem' }}>Path Manager</h3>

          {/* Current Status */}
          <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '6px' }}>
            <strong>Status: </strong>
            {selectedPath ? (
              <span style={{ color: '#4fc3f7' }}>Following "{selectedPath.name}"</span>
            ) : isRecording ? (
              <span style={{ color: '#f44336' }}>Recording path...</span>
            ) : (
              <span style={{ color: '#9e9e9e' }}>Free mode (mouse/touch)</span>
            )}
          </div>

          {/* Control Buttons */}
          <div style={{ marginBottom: '20px' }}>
            {selectedPath ? (
              <button
                onClick={handleStopPath}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '10px',
                }}
              >
                Stop Following Path
              </button>
            ) : (
              <div>
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginBottom: '10px',
                    }}
                  >
                    🔴 Record New Path
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginBottom: '10px',
                    }}
                  >
                    ⏹️ Stop Recording
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Predefined Paths */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#4fc3f7' }}>Predefined Paths</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {PREDEFINED_PATHS.map(path => (
                <button
                  key={path.id}
                  onClick={() => handlePathSelect(path)}
                  disabled={isRecording}
                  style={{
                    padding: '8px',
                    background: selectedPath?.id === path.id ? '#4fc3f7' : 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: isRecording ? 0.5 : 1,
                  }}
                >
                  {path.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Paths */}
          {customPaths.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#4fc3f7' }}>Custom Paths</h4>
              {customPaths.map(path => (
                <div
                  key={path.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px',
                    background: selectedPath?.id === path.id ? '#4fc3f7' : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    marginBottom: '6px',
                  }}
                >
                  <button
                    onClick={() => handlePathSelect(path)}
                    disabled={isRecording}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      cursor: isRecording ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      textAlign: 'left',
                      opacity: isRecording ? 0.5 : 1,
                    }}
                  >
                    {path.name}
                  </button>
                  <button
                    onClick={() => deleteCustomPath(path.id)}
                    style={{
                      background: '#f44336',
                      border: 'none',
                      color: 'white',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      padding: '4px 6px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Instructions */}
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '15px', lineHeight: '1.4' }}>
            <li style={{ margin: '0 0 5px 0' }}>Click a path to make fluid follow it</li>
            <li style={{ margin: '0 0 5px 0' }}>Record custom paths by dragging mouse/finger</li>
            <li style={{ margin: '0' }}>Custom paths are saved for this session</li>
          </div>
        </div>
      )}
    </>
  );
};

export default PathManager;
