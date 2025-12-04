'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useFlameStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormattedInput } from '@/components/ui/formatted-input';
import { NumberInput } from '@/components/ui/number-input';
import { SectionHeader } from '@/components/ui/section-header';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Info, Calculator, Pencil, X, TrendingUp } from 'lucide-react';

type SpendingMode = 'auto' | 'custom';

export const GrowthSection = () => {
    const { state, updateSection } = useFlameStore();
    const { assumptions, fire, settings, expenses, liabilities } = state;
    const currencySymbol = settings?.currencySymbol || '$';
    
    // Spending mode state
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

    const updateAssumptions = (field: keyof typeof assumptions, value: number | string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateSection('assumptions', { [field]: value } as any);
    };

    const updateFire = (field: keyof typeof fire, value: number | string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateSection('fire', { [field]: value } as any);
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

    const addPromotion = () => {
        updateSection('assumptions', {
            promotions: [
                ...assumptions.promotions,
                { yearOffset: 1, newSalary: state.income.salary * 1.1 }
            ]
        });
    };

    const updatePromotion = (index: number, field: string, value: number) => {
        const newPromos = [...assumptions.promotions];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newPromos[index] as any)[field] = value;
        updateSection('assumptions', { promotions: newPromos });
    };

    const removePromotion = (index: number) => {
        const newPromos = assumptions.promotions.filter((_, i) => i !== index);
        updateSection('assumptions', { promotions: newPromos });
    };

    const fireNumber = fire.targetAnnualSpending / (fire.safeWithdrawalRate / 100);
    
    // Calculate breakdown for tooltip
    const monthlyRent = expenses.rent || 0;
    const monthlyCategories = expenses.categories.reduce((sum, cat) => sum + (cat.amount || 0), 0);
    const monthlyDebtPayments = liabilities.reduce((sum, l) => sum + (l.monthlyPayment || 0), 0);
    const monthlyTotal = monthlyRent + monthlyCategories + monthlyDebtPayments;

    return (
        <div className="space-y-6">
            <SectionHeader title="Growth & FIRE Goals" description="Assumptions for the future." icon={TrendingUp} accentColor="orange" />

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Market Assumptions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Exp. Nominal Return</label>
                            <FormattedInput 
                                variant="percent"
                                value={assumptions.marketReturn} 
                                onChange={(val) => updateAssumptions('marketReturn', val)} 
                            />
                            <p className="text-xs text-zinc-500">Expected stock market return before inflation (e.g., S&P 500 historical avg is ~10%).</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Inflation Rate</label>
                            <FormattedInput 
                                variant="percent"
                                value={assumptions.inflation} 
                                onChange={(val) => updateAssumptions('inflation', val)} 
                            />
                            <p className="text-xs text-zinc-500">Expected annual decrease in purchasing power (Fed target is 2%).</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Tax Drag on Brokerage</label>
                            <FormattedInput 
                                variant="percent"
                                value={assumptions.taxDrag} 
                                onChange={(val) => updateAssumptions('taxDrag', val)} 
                                decimalScale={2}
                            />
                            <p className="text-xs text-zinc-500">Estimated annual tax cost on brokerage growth (dividends/rebalancing). Usually 0.3-0.6%.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Retirement Tax Rate</label>
                            <FormattedInput 
                                variant="percent"
                                value={assumptions.retirementTaxRate} 
                                onChange={(val) => updateAssumptions('retirementTaxRate', val)} 
                            />
                            <p className="text-xs text-zinc-500">Effective tax rate on pre-tax 401k/IRA withdrawals in retirement (typically 15-22%).</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Career Growth</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Annual Salary Raise</label>
                            <FormattedInput 
                                variant="percent"
                                value={assumptions.salaryGrowth} 
                                onChange={(val) => updateAssumptions('salaryGrowth', val)} 
                            />
                            <p className="text-xs text-zinc-500">Expected annual base salary increase (inflation adjustment + merit).</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Bonus Growth Rate</label>
                            <FormattedInput 
                                variant="percent"
                                value={assumptions.bonusGrowthRate ?? assumptions.salaryGrowth} 
                                onChange={(val) => updateAssumptions('bonusGrowthRate', val)} 
                            />
                            <p className="text-xs text-zinc-500">Annual bonus growth rate (defaults to salary growth if not set).</p>
                        </div>
                        <div className="space-y-2 border-t border-zinc-800 pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-zinc-300">Promotions / Big Jumps</label>
                                <Button size="sm" variant="outline" onClick={addPromotion}><Plus className="h-3 w-3 mr-1"/> Add</Button>
                            </div>
                            {assumptions.promotions.length === 0 ? (
                                <p className="text-xs text-zinc-500 italic">No promotions defined.</p>
                            ) : (
                                <div className="space-y-2">
                                    {assumptions.promotions.map((p, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-xs text-zinc-400 whitespace-nowrap">In year</span>
                                            <div className="w-20">
                                                <NumberInput 
                                                    value={p.yearOffset} 
                                                    onChange={(val) => updatePromotion(i, 'yearOffset', val)}
                                                    min={1}
                                                    max={50}
                                                />
                                            </div>
                                            <span className="text-xs text-zinc-400 whitespace-nowrap">Salary:</span>
                                            <div className="flex-1">
                                                <FormattedInput 
                                                    variant="currency"
                                                    value={p.newSalary} 
                                                    onChange={(val) => updatePromotion(i, 'newSalary', val)} 
                                                />
                                            </div>
                                            <Button size="icon" variant="ghost" onClick={() => removePromotion(i)} className="h-9 w-9">
                                                <Trash2 className="h-3 w-3 text-zinc-400 hover:text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>FIRE Targets</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                     <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Current Age</label>
                        <NumberInput 
                            value={fire.currentAge} 
                            onChange={(val) => updateFire('currentAge', val)} 
                            min={0}
                            max={100}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Target Retirement Age</label>
                        <NumberInput 
                            value={fire.retirementAge} 
                            onChange={(val) => updateFire('retirementAge', val)} 
                            min={0}
                            max={100}
                        />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                        <div className="relative">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-zinc-300">Target Annual Spend (Today&apos;s $)</label>
                                <button 
                                    onClick={() => setShowAutoCalcInfo(!showAutoCalcInfo)}
                                    className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                                >
                                    <Info className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            
                            {showAutoCalcInfo && (
                                <div ref={autoCalcPopupRef} className="absolute top-full left-0 mt-2 w-80 bg-zinc-950 border border-zinc-800 p-4 rounded-lg shadow-2xl z-50">
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
                        </div>
                        
                        {/* Mode Toggle */}
                        <div className="flex rounded-lg border border-zinc-700 p-0.5 bg-zinc-800/50 w-fit">
                            <button
                                onClick={() => handleSpendingModeChange('auto')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
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
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
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
                            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 w-fit min-w-[200px]">
                                <div className="flex items-center justify-between gap-8">
                                    <span className="text-sm text-zinc-400">Calculated:</span>
                                    <span className="text-lg font-semibold text-zinc-200">
                                        {currencySymbol}{autoSpending.toLocaleString()}
                                    </span>
                                </div>
                                {autoSpending === 0 && (
                                    <p className="text-xs text-amber-400 mt-2">
                                        Add expenses above to auto-calculate.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="max-w-[200px]">
                                <FormattedInput 
                                    variant="currency"
                                    value={fire.targetAnnualSpending} 
                                    onChange={handleCustomSpendingChange} 
                                />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 relative">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-zinc-300">Safe Withdrawal Rate</label>
                            <button 
                                onClick={() => setShowSwrInfo(!showSwrInfo)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                            >
                                <Info className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        
                        {showSwrInfo && (
                            <div ref={swrPopupRef} className="absolute top-full left-0 mt-2 w-80 bg-zinc-950 border border-zinc-800 p-4 rounded-lg shadow-2xl z-50">
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
                            decimalScale={2}
                        />
                        <p className="text-xs text-orange-400 mt-1">FIRE Number: {currencySymbol}{Math.round(fireNumber).toLocaleString()}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
