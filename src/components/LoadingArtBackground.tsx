import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Illustrations (using SVGs for robust loading)
import bg1 from '../assets/art_bg_1.svg';
import bg2 from '../assets/art_bg_2.svg';
import bg3 from '../assets/art_bg_3.svg';

const backgrounds = [bg1, bg2, bg3];

const LoadingArtBackground: React.FC = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % backgrounds.length);
        }, 4000); // Cycle every 4 seconds
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="fixed inset-0 -z-10 bg-[#FDFCFB] overflow-hidden">
            <AnimatePresence mode='popLayout'>
                <motion.img
                    key={index}
                    src={backgrounds[index]}
                    alt="Artistic Background"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 0.6, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full object-cover grayscale-[20%] contrast-[90%]"
                />
            </AnimatePresence>

            {/* Canvas Texture Overlay - Subtle Linen Grain */}
            <div 
                className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-multiply" 
                style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='canvasNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23canvasNoise)'/%3E%3C/svg%3E")`,
                }} 
            />

            {/* Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[4px]" />

            {/* Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-100/40 via-transparent to-neutral-100/40" />
        </div>
    );
};

export default LoadingArtBackground;
