import React, { useState, useRef, useEffect } from 'react';
import { OptimizedImage } from './OptimizedImage';

interface ImageWithLazyLoadProps {
  src: string;
  alt: string;
  className?: string;
}

export const ImageWithLazyLoad: React.FC<ImageWithLazyLoadProps> = React.memo(({
  src,
  alt,
  className
}) => {
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isInView ? (
        <OptimizedImage
          src={src}
          alt={alt}
          className={className}
        />
      ) : (
        <div className={`bg-neutral-100 animate-pulse ${className}`} />
      )}
    </div>
  );
});
