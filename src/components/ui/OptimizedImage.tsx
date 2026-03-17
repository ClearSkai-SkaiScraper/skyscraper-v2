/**
 * H-3: Optimized Image Component
 *
 * Wrapper around Next.js Image with performance optimizations:
 * - Automatic AVIF/WebP conversion
 * - Lazy loading by default
 * - Blur placeholder support
 * - Responsive srcsets
 * - Loading states
 *
 * Use this EVERYWHERE instead of <img> tags.
 */

import NextImage, { ImageProps as NextImageProps } from "next/image";
import { useState } from "react";

import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<NextImageProps, "onLoad"> {
  /** Show loading skeleton while image loads */
  showSkeleton?: boolean;
  /** Fallback image URL if main image fails */
  fallbackSrc?: string;
  /** Container className */
  containerClassName?: string;
}

export function OptimizedImage({
  src,
  alt,
  showSkeleton = true,
  fallbackSrc,
  containerClassName,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    logger.error(`[OptimizedImage] Failed to load image: ${currentSrc}`);
    setError(true);
    setIsLoading(false);

    // Try fallback if available
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setError(false);
      setIsLoading(true);
    }
  };

  // Show error state
  if (error && (!fallbackSrc || currentSrc === fallbackSrc)) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-slate-100 dark:bg-slate-800",
          containerClassName,
          className
        )}
      >
        <svg
          className="h-8 w-8 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {/* Loading skeleton */}
      {showSkeleton && isLoading && (
        <div
          className={cn("absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700", className)}
        />
      )}

      {/* Optimized Next.js Image */}
      <NextImage
        src={currentSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        loading="lazy"
        quality={85}
        {...props}
      />
    </div>
  );
}

/**
 * Optimized Avatar Image
 * Circular image with fallback initials
 */
interface AvatarImageProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function AvatarImage({ src, alt, size = "md", className }: AvatarImageProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  // Get initials from alt text
  const initials = alt
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 font-semibold text-white",
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size === "sm" ? 32 : size === "md" ? 40 : size === "lg" ? 48 : 64}
      height={size === "sm" ? 32 : size === "md" ? 40 : size === "lg" ? 48 : 64}
      className={cn("rounded-full object-cover", sizeClasses[size], className)}
      containerClassName={cn("rounded-full", sizeClasses[size])}
      fallbackSrc={undefined}
    />
  );
}

/**
 * Optimized Claim Photo Gallery
 * Grid of photos with lazy loading and modal support
 */
interface ClaimPhotoGalleryProps {
  photos: Array<{ id: string; url: string; alt?: string }>;
  onPhotoClick?: (photoId: string) => void;
}

export function ClaimPhotoGallery({ photos, onPhotoClick }: ClaimPhotoGalleryProps) {
  if (photos.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-500">No photos uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          onClick={() => onPhotoClick?.(photo.id)}
          className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition-all hover:scale-105 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <OptimizedImage
            src={photo.url}
            alt={photo.alt || `Claim photo ${index + 1}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover"
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 transition-all group-hover:bg-black/20" />
        </button>
      ))}
    </div>
  );
}
