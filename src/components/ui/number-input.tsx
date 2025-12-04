'use client';

import * as React from "react"
import { useState, useEffect } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
    ({ className, value, onChange, min = 0, max = 100, step = 1, ...props }, ref) => {
        // Use controlled local state for display to prevent browser showing invalid input
        const [displayValue, setDisplayValue] = useState(String(value));
        const [isFocused, setIsFocused] = useState(false);
        
        // Sync display with external value when not focused
        useEffect(() => {
            if (!isFocused) {
                setDisplayValue(String(value));
            }
        }, [value, isFocused]);
        
        const increment = (e: React.MouseEvent) => {
            e.preventDefault();
            const newValue = value + step;
            if (max !== undefined && newValue > max) return;
            onChange(newValue);
            setDisplayValue(String(newValue));
        };

        const decrement = (e: React.MouseEvent) => {
            e.preventDefault();
            const newValue = value - step;
            if (min !== undefined && newValue < min) return;
            onChange(newValue);
            setDisplayValue(String(newValue));
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            
            // Handle empty input
            if (val === '') {
                setDisplayValue('');
                onChange(min ?? 0); 
                return;
            }
            
            // Only allow digits (no negatives, no decimals for integer input)
            const cleanedVal = val.replace(/[^0-9]/g, '');
            if (cleanedVal === '') {
                return;
            }
            
            // Parse and clamp to min/max
            let num = parseInt(cleanedVal, 10);
            if (isNaN(num)) return;
            
            // Clamp to bounds
            if (min !== undefined && num < min) num = min;
            if (max !== undefined && num > max) num = max;
            
            // Update both display and value - display shows the cleaned number (no leading zeros)
            setDisplayValue(String(num));
            onChange(num);
        };
        
        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(true);
            props.onFocus?.(e);
        };
        
        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);
            // Ensure display matches value on blur
            setDisplayValue(String(value));
            props.onBlur?.(e);
        };

        return (
            <div className="relative group">
                <input
                    ref={ref}
                    type="text" 
                    inputMode="numeric"
                    className={cn(
                        "flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white ring-offset-zinc-950 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        "pr-10",
                        className
                    )}
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...props}
                />
                <div className="absolute right-0 top-0 h-full flex flex-col border-l border-zinc-800 w-9">
                   <button 
                     type="button"
                     className="flex-1 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-tr-md transition-colors focus:outline-none"
                     onClick={increment}
                     tabIndex={-1}
                   >
                     <ChevronUp className="h-3 w-3" />
                   </button>
                   <div className="h-[1px] bg-zinc-800 w-full"></div>
                   <button 
                     type="button"
                     className="flex-1 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-br-md transition-colors focus:outline-none"
                     onClick={decrement}
                     tabIndex={-1}
                   >
                     <ChevronDown className="h-3 w-3" />
                   </button>
                </div>
            </div>
        )
    }
)
NumberInput.displayName = "NumberInput"

