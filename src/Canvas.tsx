import React, { useEffect, useRef } from "react";
import { fluidSim } from "./fluid";

interface Props {
  height?: number;
  width?: number;
}

const Canvas = ({ height, width }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      fluidSim(canvas);
    }
  }, [canvasRef]);

  return <canvas ref={canvasRef} height={height || 0} width={width || 0} />;
};

export default Canvas;
