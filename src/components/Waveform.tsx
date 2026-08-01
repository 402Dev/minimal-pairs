"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  /** Pulls the latest time-domain byte data, or null when unavailable. */
  getData: () => Uint8Array | null;
}

/**
 * Minimal monochrome waveform: a single dynamic line rendered on a canvas,
 * redrawn every frame via requestAnimationFrame while mounted.
 */
export default function Waveform({ getData }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let frameId: number;

    const draw = () => {
      const data = getData();
      ctx.clearRect(0, 0, width, height);

      if (data) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#171717";
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        const sliceWidth = width / data.length;
        let x = 0;

        for (let i = 0; i < data.length; i++) {
          const normalized = data[i] / 128 - 1; // -1 .. 1
          const y = height / 2 + normalized * (height / 2 - 2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }

        ctx.stroke();
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [getData]);

  return (
    <canvas
      ref={canvasRef}
      className="h-16 w-full"
      style={{ width: "100%", height: "64px" }}
    />
  );
}
