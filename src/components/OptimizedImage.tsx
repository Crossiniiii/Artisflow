
import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, RefreshCw } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
    fallback?: React.ReactNode;
    containerClassName?: string;
    maxRetries?: number;
    retryDelay?: number;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(({
    src,
    alt,
    className,
    containerClassName,
    fallbackSrc,
    fallback,
    maxRetries = 2,
    retryDelay = 1000,
    ...props
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [currentSrc, setCurrentSrc] = useState<string | undefined>(
        typeof src === 'string' && src.trim().length > 0 ? src : undefined
    );
    const imgRef = React.useRef<HTMLImageElement>(null);

    // Reset state when src changes
    useEffect(() => {
        const normalizedSrc = typeof src === 'string' ? src.trim() : src;

        if (!normalizedSrc) {
            setCurrentSrc(undefined);
            setIsLoading(false);
            setHasError(true);
            return;
        }
        setIsLoading(true);
        setHasError(false);
        setRetryCount(0);
        setCurrentSrc(normalizedSrc);
    }, [src]);

    // Check if image is already loaded (e.g. from cache)
    useEffect(() => {
        if (imgRef.current?.complete) {
            if (isLoading) {
                setIsLoading(false);
            }
        }
    }, [currentSrc, isLoading]);

    const handleLoad = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const handleRetry = useCallback(() => {
        if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            setIsLoading(true);
            setHasError(false);
            // Force reload by appending cache buster or re-setting src
            setTimeout(() => {
                if (src?.startsWith('data:')) {
                    // Cannot append query params to data URLs, just re-set
                    setCurrentSrc(src);
                } else {
                    const newSrc = src + (src?.includes('?') ? '&' : '?') + `_retry=${retryCount + 1}`;
                    setCurrentSrc(newSrc);
                }
            }, retryDelay);
        }
    }, [retryCount, maxRetries, src, retryDelay]);

    const handleError = () => {
        if (retryCount < maxRetries) {
            handleRetry();
        } else {
            setIsLoading(false);
            setHasError(true);
        }
    };

    // Let the browser handle Base64 validation via onError
    useEffect(() => {
        if (currentSrc && currentSrc.startsWith('data:image')) {
            // Basic check to ensure it has a comma
            if (!currentSrc.includes(',')) {
                console.warn('[OptimizedImage] Malformed Base64 image:', alt);
                setHasError(true);
                setIsLoading(false);
            }
        }
    }, [currentSrc, alt]);

    if (!currentSrc) {
        if (fallback) return <>{fallback}</>;
        return (
            <div className={`flex flex-col items-center justify-center bg-neutral-100 text-neutral-300 ${className || 'w-full h-full'} relative`}>
                <ImageIcon size={24} className="mb-2" />
            </div>
        );
    }

    if (hasError) {
        if (fallback) return <>{fallback}</>;
        return (
            <div className={`flex flex-col items-center justify-center bg-neutral-100 text-neutral-300 ${className || 'w-full h-full'} relative group`}>
                <ImageIcon size={24} className="mb-2" />
                {retryCount >= maxRetries && (
                    <button
                        onClick={handleRetry}
                        className="absolute inset-0 flex items-center justify-center bg-neutral-100/90 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Retry loading image"
                    >
                        <RefreshCw size={20} className="text-neutral-500 hover:text-neutral-700" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${containerClassName || ''}`}>
            {isLoading && (
                <div className={`absolute inset-0 bg-neutral-100 animate-pulse ${className || ''}`} />
            )}
            <img
                ref={imgRef}
                src={currentSrc}
                alt={alt}
                className={className}
                style={{
                    opacity: isLoading ? 0 : 1,
                    transition: 'opacity 0.3s ease-in-out',
                    ...props.style
                }}
                onLoad={handleLoad}
                onError={handleError}
                loading="lazy"
                {...props}
            />
        </div>
    );
});
