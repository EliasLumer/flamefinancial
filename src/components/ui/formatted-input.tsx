'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useFlameStore } from '@/lib/store';
import { ChevronUp, ChevronDown } from "lucide-react";

interface FormattedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number | undefined | null;
    onChange: (value: number) => void;
    variant?: 'currency' | 'percent' | 'number';
    decimalScale?: number;
    min?: number;
    max?: number;
    step?: number;
    withSpinner?: boolean;
}

export const FormattedInput = React.forwardRef<HTMLInputElement, FormattedInputProps>(
    ({ className, value, onChange, variant = 'number', decimalScale = 0, min, max, step = 1, withSpinner = false, ...props }, ref) => {
        const { state } = useFlameStore();
        const currencySymbol = state.settings.currencySymbol;
        
        // Set sensible defaults for min based on variant (currency and percent shouldn't be negative)
        const effectiveMin = min ?? (variant === 'currency' || variant === 'percent' ? 0 : undefined);
        // Don't set a default max - allow explicit control per input
        const effectiveMax = max;

        // Internal string state to handle intermediate typing (e.g. "10.")
        const [displayValue, setDisplayValue] = useState('');
        const [isFocused, setIsFocused] = useState(false);

        const formatNumber = (num: number, decimals: number) => {
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: decimals,
            }).format(num);
        };

        // Synchronize internal state with external value prop
        useEffect(() => {
            if (!isFocused) {
                if (value === undefined || value === null) {
                    setDisplayValue('');
                } else {
                    setDisplayValue(formatNumber(value, decimalScale));
                }
            }
        }, [value, isFocused, decimalScale]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value;
            
            // Handle empty input
            if (inputValue === '') {
                setDisplayValue('');
                onChange(0);
                return;
            }

            // Clean input: remove all non-numeric chars except decimal point
            // If there are multiple decimals, keep only the first one
            const parts = inputValue.split('.');
            const wholePart = parts[0].replace(/[^0-9]/g, ''); // remove non-digits
            let decimalPart = parts.length > 1 ? parts[1].replace(/[^0-9]/g, '') : null;

            if (decimalScale === 0) {
                decimalPart = null; // Force no decimals if scale is 0
            }

            // Construct raw number string
            const rawNumberStr = decimalPart !== null ? `${wholePart}.${decimalPart}` : wholePart;
            
            // Parse for the numeric value
            const numberValue = parseFloat(rawNumberStr);
            
            if (!isNaN(numberValue)) {
                // Clamp to min/max bounds
                let clampedValue = numberValue;
                if (effectiveMin !== undefined && clampedValue < effectiveMin) clampedValue = effectiveMin;
                if (effectiveMax !== undefined && clampedValue > effectiveMax) clampedValue = effectiveMax;
                
                const formattedWhole = Number(wholePart).toLocaleString('en-US');
                const newDisplay = decimalPart !== null 
                    ? `${formattedWhole}.${decimalPart}`
                    : inputValue.includes('.') && decimalScale > 0 
                        ? `${formattedWhole}.` 
                        : formattedWhole;

                setDisplayValue(newDisplay);
                onChange(clampedValue);
            } else {
                if (inputValue === '.' && decimalScale > 0) {
                    setDisplayValue('0.');
                    onChange(0);
                }
            }
        };

        const handleIncrement = (e: React.MouseEvent) => {
            e.preventDefault();
            const currentValue = value || 0;
            const newValue = currentValue + step;
            if (effectiveMax !== undefined && newValue > effectiveMax) return;
            onChange(newValue);
            // Also update display immediately to feel responsive
            setDisplayValue(formatNumber(newValue, decimalScale));
        };

        const handleDecrement = (e: React.MouseEvent) => {
            e.preventDefault();
            const currentValue = value || 0;
            const newValue = currentValue - step;
            if (effectiveMin !== undefined && newValue < effectiveMin) return;
            onChange(newValue);
            setDisplayValue(formatNumber(newValue, decimalScale));
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);
            props.onBlur?.(e);
            
            // Re-format fully on blur to ensure clean display (e.g. fix trailing dots)
            if (value !== undefined && value !== null) {
                setDisplayValue(formatNumber(value, decimalScale));
            }
        };

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(true);
            props.onFocus?.(e);
        };

        // Determine visuals
        const prefix = variant === 'currency' ? currencySymbol : undefined;
        const suffix = variant === 'percent' ? '%' : undefined;

        return (
            <div className="relative group">
                {prefix && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium pointer-events-none select-none">
                        {prefix}
                    </div>
                )}
                <input
                    ref={ref}
                    type="text"
                    inputMode={decimalScale > 0 ? "decimal" : "numeric"}
                    className={cn(
                        "flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm shadow-sm transition-colors",
                        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                        "placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50",
                        prefix && "pl-7", 
                        suffix && (withSpinner ? "pr-12" : "pr-8"), // Adjust padding if spinner is present
                        withSpinner && !suffix && "pr-10",
                        className
                    )}
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    {...props}
                />
                {suffix && (
                    <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 text-zinc-400 font-medium pointer-events-none select-none",
                        withSpinner ? "right-11" : "right-3" // Move suffix left if spinner is there
                    )}>
                        {suffix}
                    </div>
                )}
                
                {withSpinner && (
                    <div className="absolute right-0 top-0 h-full flex flex-col border-l border-zinc-800 w-9">
                        <button 
                            type="button"
                            className="flex-1 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-tr-md transition-colors focus:outline-none"
                            onClick={handleIncrement}
                            tabIndex={-1}
                        >
                            <ChevronUp className="h-3 w-3" />
                        </button>
                        <div className="h-[1px] bg-zinc-800 w-full"></div>
                        <button 
                            type="button"
                            className="flex-1 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-br-md transition-colors focus:outline-none"
                            onClick={handleDecrement}
                            tabIndex={-1}
                        >
                            <ChevronDown className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>
        );
    }
);

FormattedInput.displayName = "FormattedInput";
