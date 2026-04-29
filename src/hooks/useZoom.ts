import { useState, useEffect } from 'react';

export const useZoom = () => {
    const calculateZoom = () => {
        if (typeof window === 'undefined') return 1;
        const width = window.innerWidth;
        if (width >= 2500) return 1.25; // Large 4K screens
        if (width >= 1920) return 1;    // Standard Full HD
        if (width >= 1600) return 0.9;  // High-res laptops
        if (width >= 1350) return 0.8;  // 14" MacBook Pro (1512px), 15" Laptops
        if (width >= 1200) return 0.75; // 13" Laptops
        return 0.7;                     // Smaller screens/Tablets
    };

    const [zoomLevel, setZoomLevel] = useState<number>(calculateZoom);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setZoomLevel(calculateZoom());
            }, 150); // Debounce by 150ms
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    return { zoomLevel, setZoomLevel };
};
