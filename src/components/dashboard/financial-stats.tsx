'use client';

import React, { useMemo, useState } from 'react';
import { useFlameStore } from '@/lib/store';
import { calculateCashFlow } from '@/lib/engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { 
    Wallet,
    TrendingUp,
    PiggyBank,
    Receipt,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: string;
    subtext?: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    trend?: 'up' | 'down' | 'neutral';
    highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
    label, 
    value, 
    subtext, 
    icon, 
    iconBg, 
    iconColor,
    trend,
    highlight 
}) => (
    <div className={cn(
        "relative p-4 rounded-xl border transition-all",
        highlight 
            ? "bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/30" 
            : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
    )}>
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                    {label}
                </p>
                <div className="flex items-baseline gap-2">
                    <p className={cn(
                        "text-2xl font-bold tracking-tight",
                        highlight ? "text-orange-300" : "text-white"
                    )}>
                        {value}
                    </p>
                    {trend && (
                        <span className={cn(
                            "text-xs font-medium flex items-center",
                            trend === 'up' ? "text-green-400" : trend === 'down' ? "text-red-400" : "text-zinc-500"
                        )}>
                            {trend === 'up' && <ArrowUpRight className="h-3 w-3" />}
                            {trend === 'down' && <ArrowDownRight className="h-3 w-3" />}
                        </span>
                    )}
                </div>
                {subtext && (
                    <p className="text-xs text-zinc-500 mt-1">{subtext}</p>
                )}
            </div>
            <div className={cn(
                "p-2 rounded-lg",
                iconBg
            )}>
                <span className={iconColor}>{icon}</span>
            </div>
        </div>
    </div>
);

export const FinancialStats: React.FC = () => {
    const { state } = useFlameStore();
    const [isMonthly, setIsMonthly] = useState(false);
    const currencySymbol = state.settings?.currencySymbol || '$';

    const annualData = useMemo(() => calculateCashFlow(state), [state]);

    const stats = useMemo(() => {
        const divisor = isMonthly ? 12 : 1;
        
        // Total Savings = all investment contributions + residual cash (with fallbacks for undefined)
        // residualCash is money left over after all expenses that gets invested
        const totalSavings = 
            (annualData.preTax401k || 0) + 
            (annualData.roth401k || 0) + 
            (annualData.rothIra || 0) + 
            (annualData.hsaContribution || 0) + 
            (annualData.totalAfterTax || 0) + 
            (annualData.brokerageContribution || 0) + 
            (annualData.education529 || 0) +
            (annualData.residualCash || 0);
        
        const totalExpenses = 
            (annualData.fixedExpenses || 0) + 
            (annualData.variableExpenses || 0) + 
            (annualData.debtPayments || 0);

        const grossIncome = annualData.grossIncome || 0;
        const savingsRate = grossIncome > 0 
            ? (totalSavings / grossIncome) * 100 
            : 0;
        
        const taxRate = grossIncome > 0
            ? ((annualData.taxes || 0) / grossIncome) * 100
            : 0;

        return {
            income: grossIncome / divisor,
            savings: totalSavings / divisor,
            savingsRate,
            expenses: totalExpenses / divisor,
            taxes: (annualData.taxes || 0) / divisor,
            taxRate,
            netAfterTax: (annualData.netAfterTax || 0) / divisor
        };
    }, [annualData, isMonthly]);

    const formatCurrency = (val: number) => {
        if (val >= 1000000) return `${currencySymbol}${(val / 1000000).toFixed(2)}M`;
        if (val >= 1000) return `${currencySymbol}${(val / 1000).toFixed(1)}k`;
        return `${currencySymbol}${Math.round(val).toLocaleString()}`;
    };

    const periodLabel = isMonthly ? '/mo' : '/yr';

    return (
        <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-orange-500" />
                        Financial Snapshot
                    </CardTitle>
                    <div className="flex items-center gap-2 bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-zinc-800">
                        <span className={cn(
                            "text-xs font-medium transition-colors",
                            !isMonthly ? "text-orange-400" : "text-zinc-500"
                        )}>
                            Annual
                        </span>
                        <Toggle 
                            checked={isMonthly} 
                            onCheckedChange={setIsMonthly}
                            className="scale-90"
                        />
                        <span className={cn(
                            "text-xs font-medium transition-colors",
                            isMonthly ? "text-orange-400" : "text-zinc-500"
                        )}>
                            Monthly
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard
                        label="Total Income"
                        value={formatCurrency(stats.income)}
                        subtext={`Gross compensation${periodLabel}`}
                        icon={<Wallet className="h-4 w-4" />}
                        iconBg="bg-blue-500/10"
                        iconColor="text-blue-400"
                    />
                    <StatCard
                        label="Total Savings"
                        value={formatCurrency(stats.savings)}
                        subtext={`${stats.savingsRate.toFixed(1)}% savings rate`}
                        icon={<PiggyBank className="h-4 w-4" />}
                        iconBg="bg-emerald-500/10"
                        iconColor="text-emerald-400"
                        trend={stats.savingsRate >= 20 ? 'up' : stats.savingsRate > 0 ? 'neutral' : 'down'}
                        highlight
                    />
                    <StatCard
                        label="Taxes"
                        value={formatCurrency(stats.taxes)}
                        subtext={`${stats.taxRate.toFixed(1)}% effective rate`}
                        icon={<Receipt className="h-4 w-4" />}
                        iconBg="bg-red-500/10"
                        iconColor="text-red-400"
                    />
                    <StatCard
                        label="Expenses"
                        value={formatCurrency(stats.expenses)}
                        subtext={`Living costs${periodLabel}`}
                        icon={<ArrowDownRight className="h-4 w-4" />}
                        iconBg="bg-amber-500/10"
                        iconColor="text-amber-400"
                    />
                </div>

                {/* Savings Rate Visual */}
                <div className="mt-4 p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-300">
                            Savings Rate
                        </span>
                        <span className={cn(
                            "text-sm font-bold",
                            stats.savingsRate >= 50 ? "text-emerald-400" :
                            stats.savingsRate >= 25 ? "text-green-400" :
                            stats.savingsRate >= 15 ? "text-yellow-400" :
                            "text-red-400"
                        )}>
                            {stats.savingsRate.toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                        <div 
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                stats.savingsRate >= 50 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                                stats.savingsRate >= 25 ? "bg-gradient-to-r from-green-500 to-green-400" :
                                stats.savingsRate >= 15 ? "bg-gradient-to-r from-yellow-500 to-yellow-400" :
                                "bg-gradient-to-r from-red-500 to-red-400"
                            )}
                            style={{ width: `${Math.min(stats.savingsRate, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-zinc-500">
                        <span>0%</span>
                        <span className="text-zinc-600">|</span>
                        <span>15%</span>
                        <span className="text-zinc-600">|</span>
                        <span>25%</span>
                        <span className="text-zinc-600">|</span>
                        <span>50%+</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2 text-center">
                        {stats.savingsRate >= 50 
                            ? "🔥 Exceptional! You're on the fast track to FIRE."
                            : stats.savingsRate >= 25 
                            ? "💪 Great progress! You're ahead of most."
                            : stats.savingsRate >= 15 
                            ? "👍 Solid foundation. Consider increasing if possible."
                            : "📈 Room to grow. Every dollar saved accelerates your journey."}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

