'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AgeRangeSliderProps {
    minAge: number;
    maxAge: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
}

export const AgeRangeSlider: React.FC<AgeRangeSliderProps> = ({
    minAge,
    maxAge,
    value,
    onChange
}) => {
    const [startAge, endAge] = value;

    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = Math.min(Number(e.target.value), endAge - 5);
        onChange([newStart, endAge]);
    };

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = Math.max(Number(e.target.value), startAge + 5);
        onChange([startAge, newEnd]);
    };

    // Calculate positions for visual representation
    const startPercent = ((startAge - minAge) / (maxAge - minAge)) * 100;
    const endPercent = ((endAge - minAge) / (maxAge - minAge)) * 100;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Age Range</span>
                <span className="font-medium text-white">{startAge} — {endAge}</span>
            </div>
            
            <div className="relative h-2">
                {/* Track background */}
                <div className="absolute inset-0 bg-zinc-800 rounded-full" />
                
                {/* Active range */}
                <div 
                    className="absolute h-full bg-orange-500/50 rounded-full"
                    style={{ 
                        left: `${startPercent}%`, 
                        width: `${endPercent - startPercent}%` 
                    }}
                />
                
                {/* Range inputs (overlapping) */}
                <input
                    type="range"
                    min={minAge}
                    max={maxAge}
                    value={startAge}
                    onChange={handleStartChange}
                    className={cn(
                        "absolute w-full h-2 appearance-none bg-transparent pointer-events-none z-10",
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto",
                        "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full",
                        "[&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-900",
                        "[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg",
                        "[&::-webkit-slider-thumb]:hover:bg-orange-400",
                        "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto",
                        "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full",
                        "[&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-zinc-900",
                        "[&::-moz-range-thumb]:cursor-pointer"
                    )}
                />
                <input
                    type="range"
                    min={minAge}
                    max={maxAge}
                    value={endAge}
                    onChange={handleEndChange}
                    className={cn(
                        "absolute w-full h-2 appearance-none bg-transparent pointer-events-none z-10",
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto",
                        "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full",
                        "[&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-900",
                        "[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg",
                        "[&::-webkit-slider-thumb]:hover:bg-orange-400",
                        "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto",
                        "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full",
                        "[&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-zinc-900",
                        "[&::-moz-range-thumb]:cursor-pointer"
                    )}
                />
            </div>
            
            {/* Age markers */}
            <div className="flex justify-between text-xs text-zinc-500">
                <span>{minAge}</span>
                <span>{maxAge}</span>
            </div>
        </div>
    );
};

