import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface PriceRangeFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  average?: number;
  className?: string;
}

export const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  min,
  max,
  value,
  onChange,
  average,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [minVal, setMinVal] = useState(value[0]);
  const [maxVal, setMaxVal] = useState(value[1]);
  const minValRef = useRef(value[0]);
  const maxValRef = useRef(value[1]);
  const range = useRef<HTMLDivElement>(null);

  // Sync internal state with props
  useEffect(() => {
    setMinVal(value[0]);
    setMaxVal(value[1]);
    minValRef.current = value[0];
    maxValRef.current = value[1];
  }, [value]);

  // Convert to percentage
  const getPercent = useCallback(
    (value: number) => Math.round(((value - min) / (max - min)) * 100),
    [min, max]
  );

  // Set width of the range to decrease from the left side
  useEffect(() => {
    const minPercent = getPercent(minVal);
    const maxPercent = getPercent(maxValRef.current);

    if (range.current) {
      range.current.style.left = `${minPercent}%`;
      range.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [minVal, getPercent]);

  // Set width of the range to decrease from the right side
  useEffect(() => {
    const minPercent = getPercent(minValRef.current);
    const maxPercent = getPercent(maxVal);

    if (range.current) {
      range.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [maxVal, getPercent]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
    setIsOpen(!isOpen);
  };

  const formatPrice = (p: number) => `₱${p.toLocaleString()}`;

  return (
    <div className={`relative z-30 ${className || ''}`} ref={containerRef}>
      <button
        onClick={toggleOpen}
        className={`w-full bg-white border ${isOpen ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'} rounded-xl px-4 py-3.5 text-sm font-bold text-neutral-700 focus:outline-none hover:shadow-md transition-all flex items-center gap-2 justify-between group h-full`}
      >
        <div className="flex flex-col items-start text-left overflow-hidden w-full">
           <span className="truncate w-full block">
            {minVal === min && maxVal === max 
                ? 'Any Price' 
                : `${formatPrice(minVal)} - ${formatPrice(maxVal)}`}
           </span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''} flex-shrink-0`}><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="absolute mt-2 w-[85vw] sm:w-80 bg-white rounded-2xl shadow-xl border border-neutral-100 p-4 sm:p-6 z-[9999] animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: dropdownPos.top,
            left: window.innerWidth < 640 ? '50%' : Math.max(10, Math.min(dropdownPos.left, window.innerWidth - 340)),
            transform: window.innerWidth < 640 ? 'translateX(-50%)' : 'none'
          }}
        >
          <div className="mb-8 text-center">
            <h3 className="text-lg font-bold text-neutral-900">Price Range</h3>
            <p className="text-neutral-900 font-black mt-1 text-xl tracking-tight">
              {formatPrice(minVal)} - {formatPrice(maxVal)}
            </p>
            {average !== undefined && (
              <p className="text-xs text-neutral-400 mt-2 font-medium">
                Average price: {formatPrice(average)}
              </p>
            )}
          </div>

          <div className="relative h-10 mb-4">
            <input
              type="range"
              min={min}
              max={max}
              value={minVal}
              onChange={(event) => {
                const value = Math.min(Number(event.target.value), maxVal - 1);
                setMinVal(value);
                minValRef.current = value;
                onChange([value, maxVal]);
              }}
              className="thumb thumb--left"
              style={{ zIndex: minVal > max - 100 ? 5 : undefined }}
            />
            <input
              type="range"
              min={min}
              max={max}
              value={maxVal}
              onChange={(event) => {
                const value = Math.max(Number(event.target.value), minVal + 1);
                setMaxVal(value);
                maxValRef.current = value;
                onChange([minVal, value]);
              }}
              className="thumb thumb--right"
            />

            <div className="slider">
              <div className="slider__track" />
              <div ref={range} className="slider__range" />
            </div>
          </div>
            
          <style>{`
            .slider {
              position: relative;
              width: 100%;
            }
            .slider__track,
            .slider__range {
              position: absolute;
              border-radius: 3px;
              height: 4px;
            }
            .slider__track {
              background-color: #e5e5e5;
              width: 100%;
              z-index: 1;
            }
            .slider__range {
              background-color: #262626;
              z-index: 2;
            }
            .thumb {
              pointer-events: none;
              position: absolute;
              height: 0;
              width: 100%;
              outline: none;
              z-index: 3;
            }
            .thumb::-webkit-slider-thumb {
              -webkit-appearance: none;
              -webkit-tap-highlight-color: transparent;
              background-color: #ffffff;
              border: 2px solid #262626;
              border-radius: 50%;
              box-shadow: 0 0 1px rgba(0, 0, 0, 0.3);
              cursor: pointer;
              height: 20px;
              width: 20px;
              margin-top: 4px;
              pointer-events: all;
              position: relative;
            }
            .thumb::-moz-range-thumb {
              background-color: #ffffff;
              border: 2px solid #262626;
              border-radius: 50%;
              box-shadow: 0 0 1px rgba(0, 0, 0, 0.3);
              cursor: pointer;
              height: 20px;
              width: 20px;
              margin-top: 4px;
              pointer-events: all;
              position: relative;
            }
          `}</style>
          
          <div className="flex justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-6">
              <span>Min: {formatPrice(min)}</span>
              <span>Max: {formatPrice(max)}</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
