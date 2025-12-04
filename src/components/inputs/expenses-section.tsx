'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useFlameStore } from '@/lib/store';
import { calculateCashFlow } from '@/lib/engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormattedInput } from '@/components/ui/formatted-input';
import { SectionHeader } from '@/components/ui/section-header';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Info, X } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

export const ExpensesSection = () => {
    const { state, updateSection } = useFlameStore();
    const { expenses, settings } = state;
    const currencySymbol = settings?.currencySymbol || '$';
    
    const [showIncomeBreakdown, setShowIncomeBreakdown] = React.useState(false);
    const [showExpenseBreakdown, setShowExpenseBreakdown] = React.useState(false);
    
    const incomePopupRef = useRef<HTMLDivElement>(null);
    const expensePopupRef = useRef<HTMLDivElement>(null);
    
    // Close popups when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (incomePopupRef.current && !incomePopupRef.current.contains(event.target as Node)) {
                setShowIncomeBreakdown(false);
            }
            if (expensePopupRef.current && !expensePopupRef.current.contains(event.target as Node)) {
                setShowExpenseBreakdown(false);
            }
        };
        
        if (showIncomeBreakdown || showExpenseBreakdown) {
            // Use setTimeout to avoid immediate trigger from the click that opened it
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 0);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showIncomeBreakdown, showExpenseBreakdown]);

    const cashFlow = useMemo(() => calculateCashFlow(state), [state]);
    
    // Split Bonus from Regular Income for clearer monthly view
    const effectiveTaxRate = state.tax.effectiveRate / 100;
    const bonusNet = state.income.bonus * (1 - effectiveTaxRate);
    const regularNetAnnual = cashFlow.netAfterTax - bonusNet;
    const monthlyNetIncome = regularNetAnnual / 12; // This is now "Regular Monthly Pay"
    
    const hasBonus = state.income.bonus > 0;

    const updateRent = (val: number) => updateSection('expenses', { rent: val });

    const addCategory = () => {
        updateSection('expenses', {
            categories: [
                ...expenses.categories,
                { id: Math.random().toString(), name: 'New Category', amount: 0, isFixed: true }
            ]
        });
    };

    const updateCategory = (id: string, field: string, value: any) => {
        updateSection('expenses', {
            categories: expenses.categories.map(c => c.id === id ? { ...c, [field]: value } : c)
        });
    };

    const removeCategory = (id: string) => {
        updateSection('expenses', {
            categories: expenses.categories.filter(c => c.id !== id)
        });
    };

    const totalMonthly = expenses.rent + expenses.categories.reduce((sum, c) => sum + c.amount, 0);
    const totalAnnual = totalMonthly * 12;
    const expenseRatio = monthlyNetIncome > 0 ? (totalMonthly / monthlyNetIncome) * 100 : 0;

    return (
        <div className="space-y-6">
            <SectionHeader title="Expenses" description="Monthly spending breakdown." />

            <Card>
                <CardHeader>
                     <CardTitle>Housing</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Monthly Rent / Mortgage</label>
                        <FormattedInput 
                            variant="currency"
                            value={expenses.rent} 
                            onChange={updateRent} 
                        />
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Other Monthly Expenses</CardTitle>
                    <Button size="sm" variant="outline" onClick={addCategory}><Plus className="h-4 w-4 mr-2"/> Add Category</Button>
                </CardHeader>
                <CardContent>
                     {expenses.categories.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic">No other expenses added.</p>
                    ) : (
                        <div className="space-y-4">
                            {expenses.categories.map(cat => (
                                <div key={cat.id} className="flex items-center gap-4">
                                    <Input 
                                        className="flex-1" 
                                        placeholder="Category Name" 
                                        value={cat.name} 
                                        onChange={(e) => updateCategory(cat.id, 'name', e.target.value)} 
                                    />
                                    <div className="w-32">
                                        <FormattedInput 
                                            variant="currency"
                                            placeholder="Amount" 
                                            value={cat.amount} 
                                            onChange={(val) => updateCategory(cat.id, 'amount', val)} 
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Toggle 
                                            checked={cat.isFixed} 
                                            onCheckedChange={(c) => updateCategory(cat.id, 'isFixed', c)} 
                                            label={cat.isFixed ? "Need" : "Want"}
                                        />
                                    </div>
                                    <Button size="icon" variant="ghost" onClick={() => removeCategory(cat.id)}>
                                        <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-zinc-400">{hasBonus ? "Regular Monthly Pay" : "Net Monthly Income"}</p>
                        <button 
                            onClick={() => setShowIncomeBreakdown(!showIncomeBreakdown)}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                        >
                            <Info className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {showIncomeBreakdown && (
                        <div ref={incomePopupRef} className="absolute top-full left-0 mt-2 w-80 bg-zinc-950 border border-zinc-800 p-4 rounded-lg shadow-2xl z-50">
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-sm font-semibold text-zinc-200">Income Breakdown</p>
                                <button onClick={() => setShowIncomeBreakdown(false)} className="text-zinc-500 hover:text-zinc-300">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="space-y-2 text-xs text-zinc-300">
                                <p className="text-zinc-400 mb-2">
                                    Calculated from annual gross salary (excluding bonus), minus pre-tax deductions and taxes.
                                </p>
                                <div className="grid grid-cols-[1fr_auto] gap-y-1">
                                    <span>Gross Salary:</span>
                                    <span className="text-right">{currencySymbol}{(cashFlow.salary + cashFlow.additionalIncome).toLocaleString()}</span>
                                    
                                    <span className="text-zinc-400">Pre-tax Deductions:</span>
                                    <span className="text-right text-red-400">-{currencySymbol}{(cashFlow.preTax401k + cashFlow.hsaContribution + cashFlow.traditionalIra).toLocaleString()}</span>
                                    
                                    <span className="text-zinc-400">Est. Taxes:</span>
                                    <span className="text-right text-red-400">-{currencySymbol}{(cashFlow.taxes - (state.income.bonus * effectiveTaxRate)).toLocaleString()}</span>
                                    
                                    <div className="col-span-2 h-px bg-zinc-800 my-1"></div>
                                    
                                    <span className="font-medium text-zinc-200">Net Annual Pay:</span>
                                    <span className="text-right font-medium text-zinc-200">{currencySymbol}{Math.round(regularNetAnnual).toLocaleString()}</span>
                                    
                                    <span className="text-zinc-500">÷ 12 Months</span>
                                    <span className="text-right text-zinc-500"></span>

                                    <div className="col-span-2 h-px bg-zinc-800 my-1"></div>

                                    <span className="font-bold text-white">Regular Monthly:</span>
                                    <span className="text-right font-bold text-white">{currencySymbol}{Math.round(monthlyNetIncome).toLocaleString()}</span>
                                </div>

                                {hasBonus && (
                                    <div className="mt-3 pt-2 border-t border-zinc-800">
                                        <p className="text-zinc-400 mb-1">Annual Bonus</p>
                                        <div className="grid grid-cols-[1fr_auto] gap-y-1">
                                            <span>Gross Bonus:</span>
                                            <span className="text-right">{currencySymbol}{state.income.bonus.toLocaleString()}</span>
                                            <span className="text-zinc-400">Est. Tax ({state.tax.effectiveRate}%):</span>
                                            <span className="text-right text-red-400">-{currencySymbol}{Math.round(state.income.bonus * effectiveTaxRate).toLocaleString()}</span>
                                            <div className="col-span-2 h-px bg-zinc-800 my-1"></div>
                                            <span className="font-medium text-emerald-400">Net Bonus:</span>
                                            <span className="text-right font-medium text-emerald-400">{currencySymbol}{Math.round(bonusNet).toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-baseline gap-2">
                        <p className="text-xl font-semibold text-zinc-200">{currencySymbol}{Math.round(monthlyNetIncome).toLocaleString()}</p>
                        {hasBonus && (
                            <span className="text-xs text-emerald-400 font-medium">
                                + {currencySymbol}{Math.round(bonusNet).toLocaleString()} / yr Bonus
                            </span>
                        )}
                    </div>
                </div>
                <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-zinc-400">Total Monthly Expenses</p>
                        <div className="flex items-center gap-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${expenseRatio > 50 ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                                {expenseRatio.toFixed(1)}%
                            </span>
                            <button 
                                onClick={() => setShowExpenseBreakdown(!showExpenseBreakdown)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                            >
                                <Info className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {showExpenseBreakdown && (
                        <div ref={expensePopupRef} className="absolute top-full left-0 mt-2 w-72 bg-zinc-950 border border-zinc-800 p-4 rounded-lg shadow-2xl z-50">
                             <div className="flex justify-between items-start mb-3">
                                <p className="text-sm font-semibold text-zinc-200">Expense Breakdown</p>
                                <button onClick={() => setShowExpenseBreakdown(false)} className="text-zinc-500 hover:text-zinc-300">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="space-y-2 text-xs text-zinc-300">
                                <p className="text-zinc-400 mb-2">
                                    Comparison of total monthly spending against your {hasBonus ? "Regular Monthly Pay" : "Net Monthly Income"}.
                                </p>
                                <div className="grid grid-cols-[1fr_auto] gap-y-1">
                                    <span>Needs (Housing):</span>
                                    <span className="text-right">{currencySymbol}{expenses.rent.toLocaleString()}</span>
                                    
                                    <span>Needs (Other):</span>
                                    <span className="text-right">{currencySymbol}{expenses.categories.filter(c => c.isFixed).reduce((sum, c) => sum + c.amount, 0).toLocaleString()}</span>
                                    
                                    <span>Wants:</span>
                                    <span className="text-right">{currencySymbol}{expenses.categories.filter(c => !c.isFixed).reduce((sum, c) => sum + c.amount, 0).toLocaleString()}</span>
                                    
                                    <div className="col-span-2 h-px bg-zinc-800 my-1"></div>
                                    
                                    <span className="font-bold text-white">Total Monthly:</span>
                                    <span className="text-right font-bold text-white">{currencySymbol}{totalMonthly.toLocaleString()}</span>
                                    
                                    <div className="col-span-2 h-px bg-zinc-800 my-1"></div>

                                    <span className="text-zinc-400">Vs. Monthly Pay:</span>
                                    <span className={`text-right font-medium ${expenseRatio > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {expenseRatio.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-2xl font-bold text-white">{currencySymbol}{totalMonthly.toLocaleString()}</p>
                </div>
                 <div className="md:text-right">
                    <p className="text-sm text-zinc-400">Annual Run-rate</p>
                    <p className="text-xl font-semibold text-zinc-200">{currencySymbol}{totalAnnual.toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
};
