import React from 'react';
import { motion } from 'framer-motion';

const AnimatedBackground: React.FC = () => {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-[#FDFCFB]">
            {/* Canvas Texture Overlay - Subtle Linen Grain */}
            <div 
                className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-multiply" 
                style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='canvasNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23canvasNoise)'/%3E%3C/svg%3E")`,
                }} 
            />

            {/* Soft Watercolor Washes - Drift slowly like drying ink */}
            <motion.div
                animate={{
                    x: [-100, 100, -100],
                    y: [-50, 50, -50],
                    scale: [1, 1.15, 1],
                    rotate: [0, 5, 0]
                }}
                transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] rounded-full bg-orange-100/20 blur-[120px] mix-blend-multiply"
            />
            
            <motion.div
                animate={{
                    x: [100, -100, 100],
                    y: [50, -50, 50],
                    scale: [1.1, 1, 1.1],
                    rotate: [0, -8, 0]
                }}
                transition={{ duration: 45, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[20%] -right-[15%] w-[60%] h-[60%] rounded-full bg-indigo-50/30 blur-[100px] mix-blend-multiply"
            />

            <motion.div
                animate={{
                    scale: [1.2, 1, 1.2],
                    x: [0, 80, 0],
                    y: [120, -120, 120],
                }}
                transition={{ duration: 35, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-[15%] left-[10%] w-[55%] h-[55%] rounded-full bg-slate-100/40 blur-[110px] mix-blend-multiply"
            />

            {/* Artistic Elements: Subtle "Charcoal" Marks */}
            <motion.div
                animate={{ 
                    opacity: [0.05, 0.15, 0.05],
                    x: [0, 20, 0]
                }}
                transition={{ duration: 20, repeat: Infinity }}
                className="absolute top-[15%] left-[20%] w-48 h-[1px] bg-neutral-900/10 rounded-full rotate-[15deg]"
            />
            
            <motion.div
                animate={{ 
                    opacity: [0.03, 0.1, 0.03],
                    x: [0, -30, 0]
                }}
                transition={{ duration: 25, repeat: Infinity, delay: 5 }}
                className="absolute bottom-[20%] right-[15%] w-64 h-[1px] bg-neutral-900/10 rounded-full -rotate-[10deg]"
            />

            {/* Minimalist "Paint Splatters" */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{ 
                        opacity: [0, 0.12, 0],
                        scale: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                        duration: 12 + i * 3, 
                        repeat: Infinity, 
                        delay: i * 4 
                    }}
                    className="absolute rounded-full bg-neutral-800/5"
                    style={{
                        width: (Math.random() * 3 + 1) + 'px',
                        height: (Math.random() * 3 + 1) + 'px',
                        top: (10 + Math.random() * 80) + '%',
                        left: (10 + Math.random() * 80) + '%',
                    }}
                />
            ))}

            {/* Vignette for depth */}
            <div className="absolute inset-0 bg-gradient-to-tr from-neutral-100/10 via-transparent to-neutral-200/10 pointer-events-none" />
            
            {/* Inner frame shadow */}
            <div className="absolute inset-0 shadow-[inner_0_0_150px_rgba(0,0,0,0.02)] pointer-events-none" />
        </div>
    );
};

export default AnimatedBackground;
