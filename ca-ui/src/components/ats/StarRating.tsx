import React, { useId } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number; // 0 to 5
  size?: number; // size in pixels
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 16,
  className = '',
}) => {
  // Clamp rating between 0 and 5
  const clampedRating = Math.max(0, Math.min(5, rating));
  const baseId = useId();

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const fillPercentage = Math.max(
          0,
          Math.min(100, (clampedRating - (starIndex - 1)) * 100)
        );

        if (fillPercentage === 100) {
          return (
            <Star
              key={starIndex}
              size={size}
              className="text-amber-400 fill-amber-400 transition-transform duration-200 hover:scale-110 cursor-default"
            />
          );
        } else if (fillPercentage === 0) {
          return (
            <Star
              key={starIndex}
              size={size}
              className="text-slate-200 fill-slate-200 cursor-default"
            />
          );
        } else {
          // Fractional fill using SVG linear gradient
          const gradId = `star-grad-${starIndex}-${baseId.replace(/:/g, '_')}`;
          return (
            <div key={starIndex} className="relative cursor-default" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox="0 0 24 24" className="transition-transform duration-200 hover:scale-110">
                <defs>
                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset={`${fillPercentage}%`} stopColor="#fbbf24" /> {/* amber-400 */}
                    <stop offset={`${fillPercentage}%`} stopColor="#e2e8f0" /> {/* slate-200 */}
                  </linearGradient>
                </defs>
                <path
                  d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                  fill={`url(#${gradId})`}
                  stroke="none"
                />
              </svg>
            </div>
          );
        }
      })}
    </div>
  );
};
