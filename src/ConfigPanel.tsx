/*
Copyright (c) (2022 - infinity) Maifee Ul Asad
*/

import React, { useCallback, useState } from "react";

import type { FluidConfig } from "./fluid";

interface ConfigPanelProps {
  config: Partial<FluidConfig>;
  onConfigChange: (key: keyof FluidConfig, value: any) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onConfigChange }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSliderChange = useCallback(
    (key: keyof FluidConfig, value: number) => {
      onConfigChange(key, value);
    },
    [onConfigChange]
  );

  const handleToggle = useCallback(
    (key: keyof FluidConfig) => {
      onConfigChange(key, !(config[key] as boolean));
    },
    [config, onConfigChange]
  );

  const handleColorChange = useCallback(
    (key: keyof FluidConfig, value: string) => {
      const rgb = value.slice(1).match(/.{1,2}/g);
      if (rgb) {
        const [r, g, b] = rgb.map((x) => parseInt(x, 16));
        onConfigChange(key, { r, g, b });
      }
    },
    [onConfigChange]
  );

  const colorToHex = (color: any): string => {
    if (!color || typeof color !== "object") {
      return "#000000";
    }
    const r = String(color.r).padStart(2, "0");
    const g = String(color.g).padStart(2, "0");
    const b = String(color.b).padStart(2, "0");
    return `#${r}${g}${b}`;
  };

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    color: "#fff",
    borderRadius: "8px",
    padding: "12px",
    fontFamily: "monospace",
    fontSize: "12px",
    maxHeight: "85vh",
    overflowY: "auto",
    zIndex: 100,
    border: "1px solid rgba(255, 255, 255, 0.2)",
    minWidth: "280px",
    maxWidth: "320px",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    cursor: "pointer",
    userSelect: "none",
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: "bold",
    fontSize: "13px",
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: "12px",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontWeight: "bold",
    fontSize: "11px",
    textTransform: "uppercase",
    color: "#aaa",
    marginBottom: "6px",
    marginTop: "8px",
  };

  const controlGroupStyle: React.CSSProperties = {
    marginBottom: "8px",
  };

  const labelStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
    fontSize: "11px",
  };

  const sliderStyle: React.CSSProperties = {
    width: "100%",
    cursor: "pointer",
  };

  const toggleStyle: React.CSSProperties = {
    cursor: "pointer",
    padding: "4px 8px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "4px",
    color: "#fff",
    marginRight: "8px",
  };

  const colorInputStyle: React.CSSProperties = {
    width: "40px",
    height: "24px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "4px",
    cursor: "pointer",
  };

  if (!isExpanded) {
    return (
      <div
        style={{
          ...panelStyle,
          minWidth: "auto",
          maxWidth: "none",
          padding: "8px",
        }}
      >
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            cursor: "pointer",
            padding: "4px 8px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "4px",
            color: "#fff",
            fontSize: "12px",
          }}
        >
          ⚙️ Config
        </button>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div
        style={headerStyle}
        onClick={() => setIsExpanded(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(false);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <span style={titleStyle}>⚙️ Fluid Config</span>
        <span style={{ cursor: "pointer", fontSize: "14px" }}>−</span>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Simulation</div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>SIM Resolution</span>
            <span>{config.SIM_RESOLUTION}</span>
          </label>
          <input
            type="range"
            min="256"
            max="2048"
            step="256"
            value={config.SIM_RESOLUTION || 1024}
            onChange={(e) =>
              handleSliderChange("SIM_RESOLUTION", parseInt(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>DYE Resolution</span>
            <span>{config.DYE_RESOLUTION}</span>
          </label>
          <input
            type="range"
            min="256"
            max="2048"
            step="256"
            value={config.DYE_RESOLUTION || 1024}
            onChange={(e) =>
              handleSliderChange("DYE_RESOLUTION", parseInt(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Density Dissipation</span>
            <span>{(config.DENSITY_DISSIPATION || 4).toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={config.DENSITY_DISSIPATION || 4}
            onChange={(e) =>
              handleSliderChange("DENSITY_DISSIPATION", parseFloat(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Velocity Dissipation</span>
            <span>{(config.VELOCITY_DISSIPATION || 3.4).toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={config.VELOCITY_DISSIPATION || 3.4}
            onChange={(e) =>
              handleSliderChange("VELOCITY_DISSIPATION", parseFloat(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Pressure</span>
            <span>{(config.PRESSURE || 0.85).toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={config.PRESSURE || 0.85}
            onChange={(e) =>
              handleSliderChange("PRESSURE", parseFloat(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Pressure Iterations</span>
            <span>{config.PRESSURE_ITERATIONS}</span>
          </label>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={config.PRESSURE_ITERATIONS || 20}
            onChange={(e) =>
              handleSliderChange("PRESSURE_ITERATIONS", parseInt(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Curl</span>
            <span>{(config.CURL || 2).toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={config.CURL || 2}
            onChange={(e) =>
              handleSliderChange("CURL", parseFloat(e.target.value))
            }
            style={sliderStyle}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Splat</div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Splat Radius</span>
            <span>{(config.SPLAT_RADIUS || 0.1).toFixed(3)}</span>
          </label>
          <input
            type="range"
            min="0.05"
            max="0.5"
            step="0.01"
            value={config.SPLAT_RADIUS || 0.1}
            onChange={(e) =>
              handleSliderChange("SPLAT_RADIUS", parseFloat(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Splat Force</span>
            <span>{config.SPLAT_FORCE}</span>
          </label>
          <input
            type="range"
            min="500"
            max="5000"
            step="100"
            value={config.SPLAT_FORCE || 2000}
            onChange={(e) =>
              handleSliderChange("SPLAT_FORCE", parseInt(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Splat Count</span>
            <span>{config.SPLAT_COUNT}</span>
          </label>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={config.SPLAT_COUNT || 5}
            onChange={(e) =>
              handleSliderChange("SPLAT_COUNT", parseInt(e.target.value))
            }
            style={sliderStyle}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Visual</div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <button
              onClick={() => handleToggle("SHADING")}
              style={{
                ...toggleStyle,
                backgroundColor: config.SHADING
                  ? "rgba(100, 200, 100, 0.3)"
                  : "rgba(255, 255, 255, 0.1)",
              }}
            >
              {config.SHADING ? "✓" : "✗"}
            </button>
            <span>Shading</span>
          </label>
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <button
              onClick={() => handleToggle("COLORFUL")}
              style={{
                ...toggleStyle,
                backgroundColor: config.COLORFUL
                  ? "rgba(100, 200, 100, 0.3)"
                  : "rgba(255, 255, 255, 0.1)",
              }}
            >
              {config.COLORFUL ? "✓" : "✗"}
            </button>
            <span>Colorful</span>
          </label>
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Color Update Speed</span>
            <span>{(config.COLOR_UPDATE_SPEED || 3).toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={config.COLOR_UPDATE_SPEED || 3}
            onChange={(e) =>
              handleSliderChange("COLOR_UPDATE_SPEED", parseFloat(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>BG Color</span>
            <input
              type="color"
              value={colorToHex(config.BACK_COLOR)}
              onChange={(e) =>
                handleColorChange("BACK_COLOR", e.target.value)
              }
              style={colorInputStyle}
            />
          </label>
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <button
              onClick={() => handleToggle("TRANSPARENT")}
              style={{
                ...toggleStyle,
                backgroundColor: config.TRANSPARENT
                  ? "rgba(100, 200, 100, 0.3)"
                  : "rgba(255, 255, 255, 0.1)",
              }}
            >
              {config.TRANSPARENT ? "✓" : "✗"}
            </button>
            <span>Transparent</span>
          </label>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Bloom</div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <button
              onClick={() => handleToggle("BLOOM")}
              style={{
                ...toggleStyle,
                backgroundColor: config.BLOOM
                  ? "rgba(100, 200, 100, 0.3)"
                  : "rgba(255, 255, 255, 0.1)",
              }}
            >
              {config.BLOOM ? "✓" : "✗"}
            </button>
            <span>Bloom</span>
          </label>
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Iterations</span>
            <span>{config.BLOOM_ITERATIONS}</span>
          </label>
          <input
            type="range"
            min="1"
            max="16"
            step="1"
            value={config.BLOOM_ITERATIONS || 8}
            onChange={(e) =>
              handleSliderChange("BLOOM_ITERATIONS", parseInt(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Resolution</span>
            <span>{config.BLOOM_RESOLUTION}</span>
          </label>
          <input
            type="range"
            min="64"
            max="512"
            step="64"
            value={config.BLOOM_RESOLUTION || 256}
            onChange={(e) =>
              handleSliderChange("BLOOM_RESOLUTION", parseInt(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Intensity</span>
            <span>{(config.BLOOM_INTENSITY || 0.8).toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={config.BLOOM_INTENSITY || 0.8}
            onChange={(e) =>
              handleSliderChange("BLOOM_INTENSITY", parseFloat(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Threshold</span>
            <span>{(config.BLOOM_THRESHOLD || 0.6).toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.BLOOM_THRESHOLD || 0.6}
            onChange={(e) =>
              handleSliderChange("BLOOM_THRESHOLD", parseFloat(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Soft Knee</span>
            <span>{(config.BLOOM_SOFT_KNEE || 0.7).toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.BLOOM_SOFT_KNEE || 0.7}
            onChange={(e) =>
              handleSliderChange("BLOOM_SOFT_KNEE", parseFloat(e.target.value))
            }
            style={sliderStyle}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Sunrays</div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <button
              onClick={() => handleToggle("SUNRAYS")}
              style={{
                ...toggleStyle,
                backgroundColor: config.SUNRAYS
                  ? "rgba(100, 200, 100, 0.3)"
                  : "rgba(255, 255, 255, 0.1)",
              }}
            >
              {config.SUNRAYS ? "✓" : "✗"}
            </button>
            <span>Sunrays</span>
          </label>
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Resolution</span>
            <span>{config.SUNRAYS_RESOLUTION}</span>
          </label>
          <input
            type="range"
            min="64"
            max="512"
            step="64"
            value={config.SUNRAYS_RESOLUTION || 196}
            onChange={(e) =>
              handleSliderChange("SUNRAYS_RESOLUTION", parseInt(e.target.value))
            }
            style={sliderStyle}
          />
        </div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <span>Weight</span>
            <span>{(config.SUNRAYS_WEIGHT || 1.0).toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={config.SUNRAYS_WEIGHT || 1.0}
            onChange={(e) =>
              handleSliderChange("SUNRAYS_WEIGHT", parseFloat(e.target.value))
            }
            style={sliderStyle}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>State</div>

        <div style={controlGroupStyle}>
          <label style={labelStyle}>
            <button
              onClick={() => handleToggle("PAUSED")}
              style={{
                ...toggleStyle,
                backgroundColor: config.PAUSED
                  ? "rgba(200, 100, 100, 0.3)"
                  : "rgba(100, 200, 100, 0.3)",
              }}
            >
              {config.PAUSED ? "⏸" : "▶"}
            </button>
            <span>{config.PAUSED ? "Paused" : "Playing"}</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
