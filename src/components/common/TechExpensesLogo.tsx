import React, { useEffect, useRef, useState } from 'react';

export const LOGO_VIDEO_SRC = '/assets/aistudio/Tech_Expenses______5a351bbf.mp4';
export const LOGO_FULL_IMG = '/assets/tech-expenses-logo.png';
export const LOGO_WORDMARK_IMG = '/assets/tech-expenses-wordmark.png';
export const LOGO_ICON_IMG = '/assets/tech-expenses-icon.png';

interface LogoProps {
  variant?: 'wordmark' | 'icon' | 'full';
  className?: string;
  alt?: string;
}

/**
 * Official Tech Expenses static brand logo extracted directly from the brand MP4 asset.
 */
export const TechExpensesLogo: React.FC<LogoProps> = ({
  variant = 'wordmark',
  className = '',
  alt = 'Tech Expenses',
}) => {
  const src =
    variant === 'icon'
      ? LOGO_ICON_IMG
      : variant === 'full'
      ? LOGO_FULL_IMG
      : LOGO_WORDMARK_IMG;

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={`object-contain select-none block ${className}`}
    />
  );
};

export type VideoLoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface VideoLoaderProps {
  mode?: 'play-once' | 'loop';
  size?: VideoLoaderSize;
  onEnded?: () => void;
  onProgress?: (percent: number, currentTime: number, duration: number) => void;
  className?: string;
  roundedClass?: string;
}

const SIZE_CLASSES: Record<VideoLoaderSize, string> = {
  xs: 'w-5 h-5',
  sm: 'w-12 h-12',
  md: 'w-28 h-28 sm:w-32 sm:h-32',
  lg: 'w-44 h-44 sm:w-52 sm:h-52',
  xl: 'w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80',
};

/**
 * Plays the complete Tech Expenses MP4 logo animation strictly from start (0:00) to end (12.5s)
 * inside a 1:1 aspect-square frame with object-contain so zero cropping or skipping occurs.
 */
export const TechExpensesVideoLoader: React.FC<VideoLoaderProps> = ({
  mode = 'play-once',
  size = 'xl',
  onEnded,
  onProgress,
  className = '',
  roundedClass = 'rounded-3xl',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const hasPlayedRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    completedRef.current = false;
    hasPlayedRef.current = false;
    const vid = videoRef.current;
    if (!vid) return;

    // Start strictly from the very beginning of the MP4 animation
    try {
      vid.currentTime = 0;
    } catch {
      // Ignore if metadata not yet ready
    }

    const playPromise = vid.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Retry once muted in case browser autoplay paused momentarily
        vid.muted = true;
        vid.play().catch(() => {});
      });
    }

    // Safety guard: if autoplay is completely blocked by environment/headless policies
    // after 2.5s while paused at 0s, allow progression after full duration rather than hanging forever.
    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    if (mode === 'play-once') {
      stallTimer = setTimeout(() => {
        if (!hasPlayedRef.current && !completedRef.current && vid.paused && vid.currentTime === 0) {
          vid.muted = true;
          vid.play().catch(() => {
            // Last-resort safety fallback after full video length (12.5s)
            setTimeout(() => {
              if (!completedRef.current) {
                completedRef.current = true;
                onProgressRef.current?.(100, 12.5, 12.5);
                onEndedRef.current?.();
              }
            }, 10500);
          });
        }
      }, 2500);
    }

    return () => {
      if (stallTimer) clearTimeout(stallTimer);
    };
  }, [mode]);

  const handlePlaying = () => {
    hasPlayedRef.current = true;
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.currentTime > 0) {
      hasPlayedRef.current = true;
    }
    const duration = vid.duration && isFinite(vid.duration) ? vid.duration : 12.5;
    const pct = Math.min(100, Math.max(0, (vid.currentTime / duration) * 100));
    onProgressRef.current?.(pct, vid.currentTime, duration);
  };

  const handleEnded = () => {
    if (mode === 'play-once' && !completedRef.current) {
      completedRef.current = true;
      onProgressRef.current?.(100, 12.5, 12.5);
      onEndedRef.current?.();
    }
  };

  const handleError = () => {
    setHasError(true);
    if (mode === 'play-once' && !completedRef.current) {
      setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onProgressRef.current?.(100, 12.5, 12.5);
          onEndedRef.current?.();
        }
      }, 1500);
    }
  };

  const isTiny = size === 'xs';

  return (
    <div
      className={`aspect-square bg-white flex items-center justify-center overflow-hidden select-none shrink-0 ${
        isTiny ? 'rounded-md' : `${roundedClass} shadow-lg border border-slate-200/70 p-1.5`
      } ${SIZE_CLASSES[size]} ${className}`}
    >
      {hasError ? (
        <TechExpensesLogo variant="full" className="w-full h-full object-contain" />
      ) : (
        <video
          ref={videoRef}
          src={LOGO_VIDEO_SRC}
          autoPlay
          muted
          playsInline
          loop={mode === 'loop'}
          preload="auto"
          controls={false}
          disablePictureInPicture
          onPlaying={handlePlaying}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleError}
          className="w-full h-full object-contain block pointer-events-none"
        />
      )}
    </div>
  );
};

interface FullScreenLoaderProps {
  mode?: 'play-once' | 'loop';
  title?: string;
  subtitle?: string;
  showProgressBar?: boolean;
  onComplete?: () => void;
  variant?: 'dark' | 'light';
}

/**
 * Consistent full-screen loading overlay used for App Launch (Web & Windows Desktop),
 * Login Verification, Dashboard Data Loading, and Transitions.
 */
export const TechExpensesLoadingScreen: React.FC<FullScreenLoaderProps> = ({
  mode = 'play-once',
  title = 'Tech Expenses',
  subtitle = 'Loading your personal finance vault...',
  showProgressBar = true,
  onComplete,
  variant = 'light',
}) => {
  const [progress, setProgress] = useState(0);

  const isDark = variant === 'dark';

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 antialiased transition-colors ${
        isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-5 animate-in fade-in duration-300">
        {/* Complete Uncropped Square MP4 Animation */}
        <TechExpensesVideoLoader
          mode={mode}
          size="xl"
          onProgress={(pct) => setProgress(pct)}
          onEnded={onComplete}
          className={isDark ? 'ring-1 ring-white/10 shadow-2xl shadow-indigo-500/10' : 'shadow-xl shadow-slate-200/80 border-slate-100'}
        />

        {/* Brand Caption & Smooth Progress */}
        <div className="space-y-1.5 px-4">
          <h2
            className={`text-lg sm:text-xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {title}
          </h2>
          <p
            className={`text-xs sm:text-sm font-medium ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {subtitle}
          </p>
        </div>

        {showProgressBar && mode === 'play-once' && (
          <div className="w-56 sm:w-64 space-y-1.5">
            <div
              className={`w-full h-1.5 rounded-full overflow-hidden ${
                isDark ? 'bg-slate-800' : 'bg-slate-100'
              }`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#021329] via-[#0d6efd] to-[#00b894] transition-all duration-150 ease-out"
                style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
              />
            </div>
            <div
              className={`text-[10px] font-mono font-semibold ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {Math.round(progress)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
