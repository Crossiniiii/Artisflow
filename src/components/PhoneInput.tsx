import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const COUNTRIES = [
  { code: '+63', name: 'Philippines', flag: '🇵🇭', example: '977 000 0000' },
  { code: '+1', name: 'USA/Canada', flag: '🇺🇸', example: '202 555 0123' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', example: '8123 4567' },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰', example: '9123 4567' },
  { code: '+81', name: 'Japan', flag: '🇯🇵', example: '090 1234 5678' },
  { code: '+61', name: 'Australia', flag: '🇦🇺', example: '0412 345 678' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', example: '7911 123456' },
  { code: '+971', name: 'UAE', flag: '🇦🇪', example: '50 123 4567' },
  { code: '+886', name: 'Taiwan', flag: '🇹🇼', example: '0912 345 678' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷', example: '010 1234 5678' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾', example: '012 345 6789' },
];

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse current value to split country code and number
  const findCountry = () => {
    const sortedCountries = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    const matched = sortedCountries.find(c => value.startsWith(c.code));
    return matched || COUNTRIES[0];
  };

  const selectedCountry = findCountry();
  
  // Extract number part
  const getRawNumber = () => {
    if (value.startsWith(selectedCountry.code)) {
      return value.slice(selectedCountry.code.length).trim();
    }
    return value.replace(/^\+\d+\s*/, '').trim();
  };

  const rawNumber = getRawNumber();
  const isInvalidLength = rawNumber.length > 0 && rawNumber.length < 10;

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    onChange(`${country.code} ${rawNumber}`);
    setIsOpen(false);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    onChange(`${selectedCountry.code} ${val}`);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative flex items-stretch h-10 w-full ${className}`} ref={dropdownRef}>
      {/* Country Selector */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 px-3 bg-[#F9F9F9] border border-[#8A8886] border-r-0 rounded-l-sm hover:bg-[#F3F3F3] transition-all min-w-[90px] outline-none group"
      >
        <span className="text-lg grayscale group-hover:grayscale-0 transition-all leading-none">{selectedCountry.flag}</span>
        <span className="text-xs font-black text-[#323130] leading-none">{selectedCountry.code}</span>
        <ChevronDown size={12} className={`text-[#605E5C] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Number Input */}
      <input
        type="text"
        inputMode="numeric"
        maxLength={10}
        value={rawNumber}
        onChange={handleNumberChange}
        placeholder={placeholder || selectedCountry.example}
        className={`flex-1 min-w-0 px-3 bg-white border border-l-0 rounded-r-sm text-sm font-bold text-[#323130] placeholder-[#A19F9D] focus:outline-none focus:ring-1 transition-all ${
          isInvalidLength 
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50' 
            : 'border-[#8A8886] focus:border-[#0078D4] focus:ring-[#0078D4]'
        }`}
      />

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-neutral-200 rounded-lg shadow-2xl z-[500] max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar border-t-4 border-t-[#0078d4]">
          <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-neutral-100 z-10">
            <span className="text-[10px] font-black text-[#0078d4] uppercase tracking-[0.2em]">Select Region</span>
          </div>
          <div className="py-2">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleCountrySelect(c)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-all text-left group ${selectedCountry.code === c.code ? 'bg-[#f0f7ff]' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl transition-all shadow-sm ${selectedCountry.code === c.code ? 'bg-white scale-110 shadow-md ring-1 ring-[#0078d4]/10' : 'bg-neutral-50 grayscale group-hover:grayscale-0 group-hover:bg-white group-hover:scale-110'}`}>
                    {c.flag}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[12px] font-black tracking-tight ${selectedCountry.code === c.code ? 'text-[#0078d4]' : 'text-neutral-900'}`}>{c.name}</span>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{c.code}</span>
                  </div>
                </div>
                {selectedCountry.code === c.code && (
                  <div className="w-2 h-2 rounded-full bg-[#0078d4] shadow-[0_0_8px_rgba(0,120,212,0.4)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
