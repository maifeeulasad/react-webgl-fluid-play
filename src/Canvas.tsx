import React, { useEffect, useRef } from "react";
import { fluidSim } from "./fluid";

interface ICanvasProps {
  height?: number;
  width?: number;
}

const Canvas = ({ height: heightProps, width: widthProps }: ICanvasProps) => {
  const [height, setHeight] = React.useState<number>(0);
  const [width, setWidth] = React.useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (heightProps && widthProps) {
      setHeight(heightProps);
      setWidth(widthProps);
    }
  }, [heightProps, widthProps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      fluidSim(canvas);
    }
  }, [canvasRef]);

  useEffect(() => {
    const updateDimensions = () => {
      setHeight(window.innerHeight);
      setWidth(window.innerWidth);
    };

    window.addEventListener("resize", updateDimensions);
    updateDimensions();

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <canvas ref={canvasRef} height={height} width={width} />
    </div>
  );
};

export default Canvas;
