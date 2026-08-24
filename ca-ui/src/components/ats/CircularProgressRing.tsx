import React, { useEffect, useState, useId } from 'react';

interface CircularProgressRingProps {
  score: number; // 0 to 10
  size?: number; // overall diameter in pixels
  strokeWidth?: number;
  className?: string;
  gradientStart?: string;
  gradientEnd?: string;
  trackClassName?: string;
  progressClassName?: string;
  animationDuration?: number; // in ms
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  score,
  size = 160,
  strokeWidth = 10,
  className = '',
  gradientStart = '#2563EB', // Brand Electric Blue
  gradientEnd = '#818cf8', // Lighter electric blue/indigo
  trackClassName = 'text-slate-100 dark:text-slate-800',
  progressClassName = '',
  animationDuration = 1000,
}) => {
  // Clamp score between 0 and 10, handle strings and NaN gracefully
  const numericScore = typeof score === 'number' ? score : parseFloat(score as any);
  const clampedScore = Math.max(0, Math.min(10, isNaN(numericScore) ? 0 : numericScore));
  
  // State to drive the animation
  const [progress, setProgress] = useState(0);
  const baseId = useId();
  const gradId = `progress-grad-${baseId.replace(/:/g, '_')}`;

  useEffect(() => {
    // Start animation on mount or score change
    const timer = setTimeout(() => {
      setProgress(clampedScore);
    }, 100);
    return () => clearTimeout(timer);
  }, [clampedScore]);

  // Math for SVG
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate offset based on current progress (0 to 10 scale)
  const strokeDashoffset = circumference - (progress / 10) * circumference;

  return (
    <div 
      className={`relative flex items-center justify-center transition-transform duration-300 hover:scale-102 ${className}`} 
      style={{ width: size, height: size }}
    >
      <svg
        className="absolute inset-0 -rotate-90 transform"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
        </defs>
        
        {/* Track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={`${trackClassName} transition-all duration-300`}
        />
        
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${progressClassName} transition-all ease-out`}
          style={{ 
            transitionDuration: `${animationDuration}ms`,
            strokeDashoffset: strokeDashoffset
          }}
        />
      </svg>
      
      {/* Inner score display */}
      <div className="flex flex-col items-center justify-center z-10 select-none animate-in fade-in zoom-in duration-500">
        <div className="flex items-baseline gap-0.5">
          <span className="text-4xl font-black text-text-primary tracking-tighter">
            {clampedScore.toFixed(1)}
          </span>
        </div>
        <span className="text-text-muted font-semibold text-[10px] tracking-wider mt-0.5">/ 10</span>
      </div>
    </div>
  );
};
