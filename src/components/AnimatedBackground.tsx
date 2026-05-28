import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Artwork } from '../types';
import { supabase } from '../supabase';

interface AnimatedBackgroundProps {
    artworks?: Artwork[];
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ artworks = [] }) => {
    const [index, setIndex] = useState(0);
    const [fetchedImages, setFetchedImages] = useState<string[]>([]);

    const artworkImages = useMemo(() => {
        if (!artworks || artworks.length === 0) return [];

        return artworks
            .map(art => art.imageUrl?.trim())
            .filter((imageUrl): imageUrl is string => Boolean(imageUrl))
            .sort(() => Math.random() - 0.5)
            .slice(0, 18);
    }, [artworks]);

    const images = artworkImages.length > 0 ? artworkImages : fetchedImages;

    useEffect(() => {
        if (artworkImages.length > 0 || fetchedImages.length > 0) return;

        let isMounted = true;

        const loadBackgroundImages = async () => {
            try {
                const { data, error } = await supabase
                    .from('artworks')
                    .select('image_url')
                    .not('image_url', 'is', null)
                    .neq('image_url', '')
                    .order('created_at', { ascending: false })
                    .limit(18);

                if (error || !isMounted) return;

                const urls = (data || [])
                    .map((row: { image_url?: string | null }) => row.image_url?.trim())
                    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));

                setFetchedImages(urls.sort(() => Math.random() - 0.5));
            } catch {
                // Keep the soft fallback background if public artwork images are unavailable.
            }
        };

        void loadBackgroundImages();

        return () => {
            isMounted = false;
        };
    }, [artworkImages.length, fetchedImages.length]);

    useEffect(() => {
        setIndex(0);
    }, [images.length]);

    useEffect(() => {
        if (images.length <= 1) return;
        
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % images.length);
        }, 5500);
        
        return () => clearInterval(timer);
    }, [images]);

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-[#F5F4F2]">
            <AnimatePresence mode="wait">
                {images.length > 0 ? (
                    <motion.div
                        key={images[index]}
                        initial={{ opacity: 0, scale: 1.06 }}
                        animate={{ opacity: 0.52, scale: 1.01 }}
                        exit={{ opacity: 0, scale: 1 }}
                        transition={{ duration: 1.8, ease: "easeInOut" }}
                        className="absolute inset-0"
                    >
                        <img 
                            src={images[index]} 
                            alt="" 
                            className="w-full h-full object-cover blur-[3px] scale-[1.025] grayscale-[12%] saturate-[92%] contrast-[104%] brightness-[98%]"
                        />
                    </motion.div>
                ) : (
                    /* Fallback to original watercolor washes if no images available */
                    <>
                        <motion.div
                            animate={{
                                x: [-100, 100, -100],
                                y: [-50, 50, -50],
                                scale: [1, 1.15, 1],
                                rotate: [0, 5, 0]
                            }}
                            transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] rounded-full bg-orange-100/10 blur-[120px] mix-blend-multiply"
                        />
                        <motion.div
                            animate={{
                                x: [100, -100, 100],
                                y: [50, -50, 50],
                                scale: [1.1, 1, 1.1],
                                rotate: [0, -8, 0]
                            }}
                            transition={{ duration: 45, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-[20%] -right-[15%] w-[60%] h-[60%] rounded-full bg-indigo-50/20 blur-[100px] mix-blend-multiply"
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Canvas Texture Overlay - Subtle Linen Grain */}
            <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply" 
                style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='canvasNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23canvasNoise)'/%3E%3C/svg%3E")`,
                }} 
            />

            {/* Vignette and Depth Overlays - Darkened slightly */}
            <div className="absolute inset-0 bg-white/34 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-neutral-100/25 via-white/10 to-neutral-200/28 pointer-events-none" />
            <div className="absolute inset-0 backdrop-blur-[0.5px]" />
            <div className="absolute inset-0 shadow-[inner_0_0_150px_rgba(0,0,0,0.03)] pointer-events-none" />
        </div>
    );
};

export default AnimatedBackground;
