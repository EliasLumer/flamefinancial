'use client';

import React, { useMemo, useState } from 'react';
import { useFlameStore } from '@/lib/store';
import { calculateCashFlow } from '@/lib/engine';
import { SankeyDiagram } from '@/components/charts/sankey-diagram';
import { CashFlowTable } from '@/components/cash-flow-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Gift, 
    Wallet, 
    TrendingDown, 
    PiggyBank, 
    Receipt,
    Workflow,
    TableProperties
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CashFlowPage() {
    const { state } = useFlameStore();
    const [isMonthly, setIsMonthly] = useState(false);
    const [includeBonus, setIncludeBonus] = useState(true);
    const currencySymbol = state.settings?.currencySymbol || '$';
    const hasBonus = state.income.bonus > 0;

    const annualData = useMemo(() => calculateCashFlow(state), [state]);

    // Calculate bonus-adjusted data
    const adjustedData = useMemo(() => {
        if (includeBonus) return annualData;
        
        // Exclude bonus from calculations
        const effectiveTaxRate = state.tax.effectiveRate / 100;
        const bonusTax = state.income.bonus * effectiveTaxRate;
        const netBonus = state.income.bonus - bonusTax;
        
        return {
            ...annualData,
            grossIncome: annualData.grossIncome - state.income.bonus,
            bonus: 0,
            taxes: annualData.taxes - bonusTax,
            netAfterTax: annualData.netAfterTax - netBonus,
        };
    }, [annualData, includeBonus, state.income.bonus, state.tax.effectiveRate]);

    const displayData = useMemo(() => {
        if (!isMonthly) return adjustedData;
        
        // Divide all fields by 12
        const monthly = { ...adjustedData };
        (Object.keys(monthly) as (keyof typeof monthly)[]).forEach(key => {
            monthly[key] = monthly[key] / 12;
        });
        return monthly;
    }, [adjustedData, isMonthly]);

    // Calculate totals for stats
    const totalSavings = 
        (displayData.preTax401k || 0) + 
        (displayData.roth401k || 0) + 
        (displayData.rothIra || 0) + 
        (displayData.hsaContribution || 0) + 
        (displayData.totalAfterTax || 0) + 
        (displayData.brokerageContribution || 0) + 
        (displayData.education529 || 0);
    
    const totalExpenses = displayData.fixedExpenses + displayData.variableExpenses + displayData.debtPayments;
    const savingsRate = displayData.grossIncome > 0 ? (totalSavings / displayData.grossIncome) * 100 : 0;
    const taxRate = displayData.grossIncome > 0 ? (displayData.taxes / displayData.grossIncome) * 100 : 0;

    return (
        <div className="space-y-8 pb-20">
            {/* Header - Consistent with other pages */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Cash Flow</h1>
                    <p className="text-zinc-400">Trace every dollar from income to savings.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Monthly/Annual Toggle */}
                    <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2 py-1.5 rounded-lg border border-zinc-800">
                        <button
                            onClick={() => setIsMonthly(false)}
                            className={cn(
                                "px-2.5 py-1 rounded text-xs font-medium transition-all",
                                !isMonthly 
                                    ? "bg-emerald-500/20 text-emerald-400" 
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Annual
                        </button>
                        <span className="text-zinc-700">/</span>
                        <button
                            onClick={() => setIsMonthly(true)}
                            className={cn(
                                "px-2.5 py-1 rounded text-xs font-medium transition-all",
                                isMonthly 
                                    ? "bg-emerald-500/20 text-emerald-400" 
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Monthly
                        </button>
                    </div>
                    
                    {/* Bonus Toggle */}
                    {hasBonus && (
                        <button
                            onClick={() => setIncludeBonus(!includeBonus)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                includeBonus 
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                                    : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-amber-500/30 hover:text-amber-400"
                            )}
                            title={includeBonus ? "Bonus included in calculations" : "Bonus excluded from calculations"}
                        >
                            <Gift className="h-3.5 w-3.5" />
                            <span>{includeBonus ? 'Bonus included' : 'Include bonus'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {/* Income Card */}
                <Card className="relative overflow-hidden border-zinc-800 bg-zinc-900/60">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 to-emerald-400" />
                    <CardHeader className="pb-2 pt-5">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                            <Wallet className="h-4 w-4 text-green-500" />
                            {includeBonus ? 'Total Compensation' : 'Base Compensation'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{currencySymbol}{Math.round(displayData.grossIncome).toLocaleString()}</div>
                        <p className="text-xs text-zinc-500 mt-1">
                            {includeBonus ? (
                                <>
                                    Base: {currencySymbol}{Math.round(displayData.salary).toLocaleString()}
                                    {displayData.bonus > 0 && ` + Bonus: ${currencySymbol}${Math.round(displayData.bonus).toLocaleString()}`}
                                </>
                            ) : hasBonus ? (
                                <span className="text-amber-400">+{currencySymbol}{Math.round(isMonthly ? state.income.bonus / 12 : state.income.bonus).toLocaleString()} bonus excluded</span>
                            ) : (
                                `Base salary only`
                            )}
                        </p>
                    </CardContent>
                </Card>

                {/* Taxes Card */}
                <Card className="relative overflow-hidden border-zinc-800 bg-zinc-900/60">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-rose-400" />
                    <CardHeader className="pb-2 pt-5">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            Taxes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-400">
                            {currencySymbol}{Math.round(displayData.taxes).toLocaleString()}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            {taxRate.toFixed(1)}% of gross income
                        </p>
                    </CardContent>
                </Card>

                {/* Savings Card */}
                <Card className="relative overflow-hidden border-zinc-800 bg-zinc-900/60">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-violet-400" />
                    <CardHeader className="pb-2 pt-5">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                            <PiggyBank className="h-4 w-4 text-purple-500" />
                            Total Savings (Invested)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-400">
                            {currencySymbol}{Math.round(totalSavings).toLocaleString()}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            {savingsRate.toFixed(1)}% savings rate
                        </p>
                    </CardContent>
                </Card>

                {/* Expenses Card */}
                <Card className="relative overflow-hidden border-zinc-800 bg-zinc-900/60">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-500 to-zinc-400" />
                    <CardHeader className="pb-2 pt-5">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                            <Receipt className="h-4 w-4 text-slate-400" />
                            Total Expenses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-300">
                            {currencySymbol}{Math.round(totalExpenses).toLocaleString()}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            Excludes taxes
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Flow Diagram Section */}
            <Card className="overflow-hidden border-zinc-800 bg-zinc-900/50">
                <CardHeader className="border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Workflow className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Flow Diagram</CardTitle>
                            <p className="text-xs text-zinc-500 mt-0.5">Visualize how your money flows through different categories</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <SankeyDiagram data={displayData} currencySymbol={currencySymbol} />
                </CardContent>
            </Card>

            {/* Detailed Breakdown Section */}
            <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader className="border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <TableProperties className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
                            <p className="text-xs text-zinc-500 mt-0.5">Line-by-line analysis of your cash flow</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <CashFlowTable 
                        data={adjustedData} 
                        currencySymbol={currencySymbol}
                        excludedBonus={!includeBonus && hasBonus ? state.income.bonus : undefined}
                        effectiveTaxRate={state.tax.effectiveRate}
                        isMonthly={isMonthly}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
