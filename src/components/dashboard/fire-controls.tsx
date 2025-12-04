'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useFlameStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormattedInput } from '@/components/ui/formatted-input';
import { NumberInput } from '@/components/ui/number-input';
import { Target, TrendingUp, Flame, Info, Calculator, Pencil, X } from 'lucide-react';

interface FireControlsProps {
    fireNumber: number;
    fireAge: number | null;
}

type SpendingMode = 'auto' | 'custom';

export const FireControls: React.FC<FireControlsProps> = ({ fireNumber, fireAge }) => {
    const { state, updateSection } = useFlameStore();
    const { assumptions, fire, settings, expenses, liabilities } = state;
    const currencySymbol = settings?.currencySymbol || '$';
    
    // Determine if we're in auto or custom mode
    // Auto mode: targetAnnualSpending is 0 or matches auto-calculated value
    const [spendingMode, setSpendingMode] = useState<SpendingMode>('auto');
    
    // Popup states
    const [showAutoCalcInfo, setShowAutoCalcInfo] = useState(false);
    const [showSwrInfo, setShowSwrInfo] = useState(false);
    const autoCalcPopupRef = useRef<HTMLDivElement>(null);
    const swrPopupRef = useRef<HTMLDivElement>(null);
    
    // Close popups on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (autoCalcPopupRef.current && !autoCalcPopupRef.current.contains(event.target as Node)) {
                setShowAutoCalcInfo(false);
            }
            if (swrPopupRef.current && !swrPopupRef.current.contains(event.target as Node)) {
                setShowSwrInfo(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calculate auto-suggested spending from current expenses
    const autoSpending = useMemo(() => {
        const monthlyRent = expenses.rent || 0;
        const monthlyCategories = expenses.categories.reduce((sum, cat) => sum + (cat.amount || 0), 0);
        const monthlyDebtPayments = liabilities.reduce((sum, l) => sum + (l.monthlyPayment || 0), 0);
        
        const monthlyTotal = monthlyRent + monthlyCategories + monthlyDebtPayments;
        const annualBase = monthlyTotal * 12;
        
        // Add 10% buffer for unexpected expenses
        const buffer = 1.10;
        return Math.round(annualBase * buffer);
    }, [expenses, liabilities]);
    
    // Sync mode based on current value
    useEffect(() => {
        if (fire.targetAnnualSpending === 0 || fire.targetAnnualSpending === autoSpending) {
            setSpendingMode('auto');
        } else {
            setSpendingMode('custom');
        }
    }, [fire.targetAnnualSpending, autoSpending]);
    
    // When in auto mode, sync the value
    useEffect(() => {
        if (spendingMode === 'auto' && autoSpending > 0 && fire.targetAnnualSpending !== autoSpending) {
            updateSection('fire', { targetAnnualSpending: autoSpending });
        }
    }, [spendingMode, autoSpending, fire.targetAnnualSpending, updateSection]);

    const updateAssumptions = (field: keyof typeof assumptions, value: number) => {
        updateSection('assumptions', { [field]: value } as Partial<typeof assumptions>);
    };

    const updateFire = (field: keyof typeof fire, value: number) => {
        updateSection('fire', { [field]: value } as Partial<typeof fire>);
    };
    
    const handleSpendingModeChange = (mode: SpendingMode) => {
        setSpendingMode(mode);
        if (mode === 'auto') {
            updateSection('fire', { targetAnnualSpending: autoSpending });
        }
    };
    
    const handleCustomSpendingChange = (value: number) => {
        setSpendingMode('custom');
        updateFire('targetAnnualSpending', value);
    };

    // Calculate breakdown for tooltip
    const monthlyRent = expenses.rent || 0;
    const monthlyCategories = expenses.categories.reduce((sum, cat) => sum + (cat.amount || 0), 0);
    const monthlyDebtPayments = liabilities.reduce((sum, l) => sum + (l.monthlyPayment || 0), 0);
    const monthlyTotal = monthlyRent + monthlyCategories + monthlyDebtPayments;

    return (
        <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    FIRE Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* FIRE Number Display */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-zinc-400 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            FIRE Number
                        </span>
                        {fireAge !== null && (
                            <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 font-medium">
                                Reached @ Age {fireAge}
                            </span>
                        )}
                    </div>
                    <p className="text-3xl font-bold text-orange-400">
                        {currencySymbol}{Math.round(fireNumber).toLocaleString()}
                    </p>
                    {fireNumber === 0 && (
                        <p className="text-xs text-amber-400 mt-2">
                            Add expenses in Inputs to auto-calculate, or set a custom target below.
                        </p>
                    )}
                </div>

                {/* Market Return */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-zinc-400" />
                        Expected Market Return
                    </label>
                    <FormattedInput 
                        variant="percent"
                        value={assumptions.marketReturn} 
                        onChange={(val) => updateAssumptions('marketReturn', val)} 
                        decimalScale={1}
                    />
                    <p className="text-xs text-zinc-500">Nominal return before inflation</p>
                </div>

                {/* Age Inputs */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Current Age</label>
                        <NumberInput 
                            value={fire.currentAge} 
                            onChange={(val) => updateFire('currentAge', val)} 
                            min={18}
                            max={100}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Target Retirement</label>
                        <NumberInput 
                            value={fire.retirementAge} 
                            onChange={(val) => updateFire('retirementAge', val)} 
                            min={fire.currentAge}
                            max={100}
                        />
                    </div>
                </div>

                {/* Annual Spending with Auto/Custom Toggle */}
                <div className="space-y-3 relative">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-zinc-300">Annual Spending Target</label>
                        <button 
                            onClick={() => setShowAutoCalcInfo(!showAutoCalcInfo)}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                        >
                            <Info className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    
                    {showAutoCalcInfo && (
                        <div ref={autoCalcPopupRef} className="absolute top-8 left-0 w-72 bg-zinc-950 border border-zinc-800 p-4 rounded-lg shadow-2xl z-50">
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-sm font-semibold text-zinc-200">How Auto-Calculation Works</p>
                                <button onClick={() => setShowAutoCalcInfo(false)} className="text-zinc-500 hover:text-zinc-300">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="space-y-1 text-xs text-zinc-300">
                                <div className="grid grid-cols-[1fr_auto] gap-y-1">
                                    <span>Monthly Rent:</span>
                                    <span className="text-right">{currencySymbol}{monthlyRent.toLocaleString()}</span>
                                    
                                    <span>Monthly Expenses:</span>
                                    <span className="text-right">{currencySymbol}{monthlyCategories.toLocaleString()}</span>
                                    
                                    {monthlyDebtPayments > 0 && (
                                        <>
                                            <span>Debt Payments:</span>
                                            <span className="text-right">{currencySymbol}{monthlyDebtPayments.toLocaleString()}</span>
                                        </>
                                    )}
                                    
                                    <div className="col-span-2 h-px bg-zinc-800 my-1"></div>
                                    
                                    <span className="font-medium text-zinc-200">Monthly Total:</span>
                                    <span className="text-right font-medium text-zinc-200">{currencySymbol}{monthlyTotal.toLocaleString()}</span>
                                    
                                    <span className="text-zinc-500">× 12 months</span>
                                    <span className="text-right text-zinc-500">{currencySymbol}{(monthlyTotal * 12).toLocaleString()}</span>
                                    
                                    <div className="col-span-2 h-px bg-zinc-800 my-1"></div>
                                    
                                    <span className="font-bold text-amber-400">+ 10% buffer:</span>
                                    <span className="text-right font-bold text-amber-400">{currencySymbol}{autoSpending.toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-zinc-400 mt-3 pt-2 border-t border-zinc-800">
                                    The 10% buffer accounts for unexpected expenses, inflation adjustments, and lifestyle flexibility.
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {/* Mode Toggle */}
                    <div className="flex rounded-lg border border-zinc-700 p-0.5 bg-zinc-800/50">
                        <button
                            onClick={() => handleSpendingModeChange('auto')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                                spendingMode === 'auto' 
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                                    : 'text-zinc-400 hover:text-zinc-300'
                            }`}
                        >
                            <Calculator className="h-3.5 w-3.5" />
                            Auto
                        </button>
                        <button
                            onClick={() => handleSpendingModeChange('custom')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                                spendingMode === 'custom' 
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                                    : 'text-zinc-400 hover:text-zinc-300'
                            }`}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Custom
                        </button>
                    </div>
                    
                    {/* Value Display/Input */}
                    {spendingMode === 'auto' ? (
                        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-zinc-400">Calculated from expenses:</span>
                                <span className="text-lg font-semibold text-zinc-200">
                                    {currencySymbol}{autoSpending.toLocaleString()}
                                </span>
                            </div>
                            {autoSpending === 0 && (
                                <p className="text-xs text-amber-400 mt-2">
                                    No expenses found. Add rent and expenses in the Inputs page.
                                </p>
                            )}
                        </div>
                    ) : (
                        <FormattedInput 
                            variant="currency"
                            value={fire.targetAnnualSpending} 
                            onChange={handleCustomSpendingChange} 
                        />
                    )}
                    <p className="text-xs text-zinc-500">
                        {spendingMode === 'auto' 
                            ? "Based on your current expenses + 10% buffer" 
                            : "Enter your desired annual spending in today's dollars"}
                    </p>
                </div>

                {/* Withdrawal Rate */}
                <div className="space-y-2 relative">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-zinc-300">Withdrawal Rate</label>
                        <button 
                            onClick={() => setShowSwrInfo(!showSwrInfo)}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                        >
                            <Info className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    
                    {showSwrInfo && (
                        <div ref={swrPopupRef} className="absolute top-8 left-0 w-72 bg-zinc-950 border border-zinc-800 p-4 rounded-lg shadow-2xl z-50">
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-sm font-semibold text-zinc-200">Safe Withdrawal Rate (SWR)</p>
                                <button onClick={() => setShowSwrInfo(false)} className="text-zinc-500 hover:text-zinc-300">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="space-y-2 text-xs text-zinc-300">
                                <p>
                                    The percentage of your portfolio you withdraw annually in retirement.
                                </p>
                                <p className="text-zinc-400">
                                    The <span className="text-orange-400 font-medium">&quot;4% rule&quot;</span> suggests a 4% withdrawal rate historically allows a portfolio 
                                    to last 30+ years.
                                </p>
                                <p className="text-zinc-400">
                                    Lower rates (3-3.5%) are more conservative for early retirees with longer retirement horizons.
                                </p>
                                <div className="mt-3 pt-2 border-t border-zinc-800">
                                    <p className="text-zinc-500">Formula: FIRE Number = Annual Spending ÷ SWR%</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <FormattedInput 
                        variant="percent"
                        value={fire.safeWithdrawalRate} 
                        onChange={(val) => updateFire('safeWithdrawalRate', val)} 
                        decimalScale={1}
                    />
                    <p className="text-xs text-zinc-500">
                        FIRE Number = Annual Spending ÷ {fire.safeWithdrawalRate}%
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

