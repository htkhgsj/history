'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';

interface TimelineSliderProps {
  startYear: number;
  endYear: number;
  currentYear: number;
  onYearChange: (year: number) => void;
  keyframes?: { year: number; label: string }[];
}

export function TimelineSlider({
  startYear,
  endYear,
  currentYear,
  onYearChange,
  keyframes = [],
}: TimelineSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    lastTimeRef.current = performance.now();

    const step = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Advance ~3 years per second
      const yearsPerMs = 3 / 1000;
      const newYear = currentYear + dt * yearsPerMs;

      if (newYear >= endYear) {
        onYearChange(endYear);
        setIsPlaying(false);
        return;
      }

      onYearChange(newYear);
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, currentYear, endYear, onYearChange]);

  // Find current keyframe label
  const currentLabel = keyframes
    .filter((kf) => kf.year <= currentYear)
    .pop()?.label || '';

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={isPlaying ? pause : play}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min={startYear}
            max={endYear}
            step={0.5}
            value={currentYear}
            onChange={(e) => onYearChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-foreground">
              {Math.round(currentYear)} AD
            </span>
            <span className="text-xs text-muted-foreground truncate ml-2">
              {currentLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
