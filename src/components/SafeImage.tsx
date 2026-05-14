"use client";

import Image, { ImageProps } from "next/image";
import { useState, useEffect } from "react";

interface SafeImageProps extends ImageProps {
  fallbackSrc?: string;
}

/**
 * SafeImage Component
 * 
 * A robust wrapper around next/image that handles:
 * 1. Missing or null src (uses fallback)
 * 2. Runtime loading errors (switches to fallback)
 * 3. Malformed URLs
 * 
 * @param props - All standard next/image props + fallbackSrc
 */
export const SafeImage = ({
  src,
  fallbackSrc = "https://placehold.co/400x400?text=Image+Not+Found",
  alt,
  className,
  unoptimized,
  ...props
}: SafeImageProps) => {

  const [imgSrc, setImgSrc] = useState<string | any>(src);
  const [error, setError] = useState(false);

  // Update internal state if external src changes
  useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);

  // Handle case where src is null/undefined/empty
  const finalSrc = !imgSrc || imgSrc === "" ? fallbackSrc : imgSrc;

  // Filter out Next.js-specific props when using native <img>
  const { 
    priority, 
    fill, 
    sizes, 
    quality, 
    placeholder, 
    blurDataURL, 
    onLoadingComplete, 
    ...nativeProps 
  } = props as any;

  // Handle styles for 'fill' prop manually for native <img>
  const fillStyles: React.CSSProperties = fill ? {
    position: 'absolute',
    height: '100%',
    width: '100%',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    objectFit: (nativeProps.style?.objectFit as any) || 'contain',
  } : {};

  return (
    <>
      {unoptimized ? (
        <img
          {...nativeProps}
          src={error ? fallbackSrc : finalSrc}
          alt={alt || "Image"}
          className={className}
          style={{ ...fillStyles, ...nativeProps.style }}
          onError={() => {
            if (!error) {
              setError(true);
            }
          }}
          loading={priority ? "eager" : "lazy"}
        />
      ) : (
        <Image
          {...props}
          src={error ? fallbackSrc : finalSrc}
          alt={alt || "Image"}
          className={className}
          onError={() => {
            if (!error) {
              setError(true);
            }
          }}
          unoptimized={false}
        />
      )}
    </>
  );
};


