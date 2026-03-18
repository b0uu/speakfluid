"use client";

import { useRef, useEffect } from "react";

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
}

const BAR_COUNT = 20;
const BAR_WIDTH = 4;
const BAR_GAP = 4;
const CANVAS_HEIGHT = 40;
const CANVAS_WIDTH = BAR_COUNT * (BAR_WIDTH + BAR_GAP) - BAR_GAP;

export default function WaveformVisualizer({ analyser, isActive }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const barHeightsRef = useRef<number[]>(new Array(BAR_COUNT).fill(2));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (isActive && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < BAR_COUNT; i++) {
          // Map frequency data to bar heights
          const dataIdx = Math.floor((i / BAR_COUNT) * dataArray.length);
          const value = dataArray[dataIdx] / 255;
          const targetHeight = Math.max(2, value * CANVAS_HEIGHT);
          // Smooth transition
          barHeightsRef.current[i] +=
            (targetHeight - barHeightsRef.current[i]) * 0.3;
        }
      } else {
        // Decay bars when not active
        for (let i = 0; i < BAR_COUNT; i++) {
          barHeightsRef.current[i] *= 0.85;
          if (barHeightsRef.current[i] < 2) barHeightsRef.current[i] = 2;
        }
      }

      // Draw bars
      ctx.fillStyle = "#2D5BFF";
      ctx.lineCap = "round";

      for (let i = 0; i < BAR_COUNT; i++) {
        const h = barHeightsRef.current[i];
        const x = i * (BAR_WIDTH + BAR_GAP);
        const y = (CANVAS_HEIGHT - h) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, h, 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className={`transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0"}`}
      aria-hidden="true"
    />
  );
}
