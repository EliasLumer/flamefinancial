'use client';

import React, { useMemo, useState } from 'react';
import { useFlameStore } from '@/lib/store';
import { calculateCashFlow } from '@/lib/engine';
import { ChevronUp, ChevronDown, TrendingDown, TrendingUp, Wallet, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

type Position = 'floating-bottom' | 'sidebar' | 'inline';

interface BudgetTrackerProps {
    position?: Position;
}

interface BudgetLine {
    label: string;
    amount: number;
    percentage: number;
    type: 'income' | 'deduction' | 'subtotal' | 'result' | 'info';
    color?: string;
}

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({ position = 'floating-bottom' }) => {
    const { state, isHydrated } = useFlameStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [includeBonus, setIncludeBonus] = useState(false);
    const [isAnnualView, setIsAnnualView] = useState(false);
    
    const currencySymbol = state.settings?.currencySymbol || '$';
    const hasBonus = state.income.bonus > 0;
    
    const budget = useMemo(() => {
        if (!isHydrated) return null;
        
        const cf = calculateCashFlow(state);
        const effectiveTaxRate = state.tax.effectiveRate / 100;
        
        // Bonus handling - calculate bonus impact separately
        const annualBonus = state.income.bonus;
        const bonusTaxes = annualBonus * effectiveTaxRate;
        const netBonus = annualBonus - bonusTaxes;
        
        // Base amounts (without bonus)
        const grossAnnualWithoutBonus = cf.grossIncome - annualBonus;
        const taxesAnnualWithoutBonus = cf.taxes - bonusTaxes;
        const netAnnualWithoutBonus = cf.netAfterTax - netBonus;
        
        // Calculate base monthly values first (before view multiplier)
        const baseGrossMonthly = includeBonus ? cf.grossIncome / 12 : grossAnnualWithoutBonus / 12;
        const baseTaxesMonthly = includeBonus ? cf.taxes / 12 : taxesAnnualWithoutBonus / 12;
        const basePreTax401kMonthly = cf.preTax401k / 12;
        const baseEmployerMatchMonthly = cf.employerMatch / 12;
        const baseHsaMonthly = cf.hsaContribution / 12;
        const baseTraditionalIraMonthly = cf.traditionalIra / 12;
        const baseNetMonthly = includeBonus ? cf.netAfterTax / 12 : netAnnualWithoutBonus / 12;
        const baseRoth401kMonthly = cf.roth401k / 12;
        const baseRothIraMonthly = cf.rothIra / 12;
        const baseEdu529Monthly = cf.education529 / 12;
        const baseAfterTax401kMonthly = cf.totalAfterTax / 12;
        const baseBrokerageMonthly = cf.brokerageContribution / 12;
        const baseExpensesMonthly = (cf.fixedExpenses + cf.variableExpenses) / 12;
        
        // Get individual expense breakdown from CashFlow
        const baseHousingMonthly = cf.housing / 12;
        const baseNeedsMonthly = cf.needsOther / 12;
        const baseWantsMonthly = cf.wants / 12;
        const baseDebtMonthly = cf.debtPayments / 12;
        
        // Apply view multiplier (12 for annual, 1 for monthly)
        const multiplier = isAnnualView ? 12 : 1;
        
        const grossDisplay = baseGrossMonthly * multiplier;
        const taxesDisplay = baseTaxesMonthly * multiplier;
        const preTax401kDisplay = basePreTax401kMonthly * multiplier;
        const employerMatchDisplay = baseEmployerMatchMonthly * multiplier;
        const hsaDisplay = baseHsaMonthly * multiplier;
        const traditionalIraDisplay = baseTraditionalIraMonthly * multiplier;
        const netDisplay = baseNetMonthly * multiplier;
        const roth401kDisplay = baseRoth401kMonthly * multiplier;
        const rothIraDisplay = baseRothIraMonthly * multiplier;
        const edu529Display = baseEdu529Monthly * multiplier;
        const afterTax401kDisplay = baseAfterTax401kMonthly * multiplier;
        const brokerageDisplay = baseBrokerageMonthly * multiplier;
        const expensesDisplay = baseExpensesMonthly * multiplier;
        const housingDisplay = baseHousingMonthly * multiplier;
        const needsDisplay = baseNeedsMonthly * multiplier;
        const wantsDisplay = baseWantsMonthly * multiplier;
        const debtDisplay = baseDebtMonthly * multiplier;
        
        // Total outflows from net income
        const totalPostTaxOutflows = roth401kDisplay + rothIraDisplay + edu529Display + afterTax401kDisplay + brokerageDisplay + expensesDisplay + debtDisplay;
        const remainingDisplay = netDisplay - totalPostTaxOutflows;
        
        // Calculate percentages relative to gross (percentages stay the same regardless of view)
        const pct = (val: number) => grossDisplay > 0 ? (val / grossDisplay) * 100 : 0;
        
        // Period label for display
        const periodLabel = isAnnualView ? 'Annual' : 'Monthly';
        
        // Build the waterfall lines
        const lines: BudgetLine[] = [
            { label: `Gross ${periodLabel} Income`, amount: grossDisplay, percentage: 100, type: 'income', color: 'text-white' },
        ];
        
        // Pre-tax deductions
        if (taxesDisplay > 0) {
            lines.push({ label: 'Taxes', amount: -taxesDisplay, percentage: pct(taxesDisplay), type: 'deduction', color: 'text-red-400' });
        }
        if (preTax401kDisplay > 0) {
            lines.push({ label: 'Pre-tax 401k', amount: -preTax401kDisplay, percentage: pct(preTax401kDisplay), type: 'deduction', color: 'text-blue-400' });
        }
        if (employerMatchDisplay > 0) {
            lines.push({ label: '401k (Employer Match)', amount: employerMatchDisplay, percentage: pct(employerMatchDisplay), type: 'deduction', color: 'text-blue-400' });
        }
        if (hsaDisplay > 0) {
            lines.push({ label: 'HSA', amount: -hsaDisplay, percentage: pct(hsaDisplay), type: 'deduction', color: 'text-blue-400' });
        }
        if (traditionalIraDisplay > 0) {
            lines.push({ label: 'Traditional IRA', amount: -traditionalIraDisplay, percentage: pct(traditionalIraDisplay), type: 'deduction', color: 'text-blue-400' });
        }
        
        // Net take-home subtotal
        lines.push({ label: 'Net Take-Home', amount: netDisplay, percentage: pct(netDisplay), type: 'subtotal', color: 'text-zinc-200' });
        
        // Post-tax allocations - Expenses breakdown
        if (housingDisplay > 0) {
            lines.push({ label: 'Needs (Housing)', amount: -housingDisplay, percentage: pct(housingDisplay), type: 'deduction', color: 'text-orange-400' });
        }
        if (needsDisplay > 0) {
            lines.push({ label: 'Needs (Other)', amount: -needsDisplay, percentage: pct(needsDisplay), type: 'deduction', color: 'text-orange-300' });
        }
        if (wantsDisplay > 0) {
            lines.push({ label: 'Wants', amount: -wantsDisplay, percentage: pct(wantsDisplay), type: 'deduction', color: 'text-amber-400' });
        }
        if (debtDisplay > 0) {
            lines.push({ label: 'Debt Payments', amount: -debtDisplay, percentage: pct(debtDisplay), type: 'deduction', color: 'text-red-400' });
        }
        if (roth401kDisplay > 0) {
            lines.push({ label: 'Roth 401k', amount: -roth401kDisplay, percentage: pct(roth401kDisplay), type: 'deduction', color: 'text-emerald-400' });
        }
        if (afterTax401kDisplay > 0) {
            lines.push({ label: 'After-tax 401k / Mega-backdoor', amount: -afterTax401kDisplay, percentage: pct(afterTax401kDisplay), type: 'deduction', color: 'text-emerald-400' });
        }
        if (rothIraDisplay > 0) {
            lines.push({ label: 'Roth IRA', amount: -rothIraDisplay, percentage: pct(rothIraDisplay), type: 'deduction', color: 'text-emerald-400' });
        }
        if (edu529Display > 0) {
            lines.push({ label: '529 Plans', amount: -edu529Display, percentage: pct(edu529Display), type: 'deduction', color: 'text-purple-400' });
        }
        if (brokerageDisplay > 0) {
            lines.push({ label: 'Brokerage', amount: -brokerageDisplay, percentage: pct(brokerageDisplay), type: 'deduction', color: 'text-blue-400' });
        }
        
        // Final remaining
        lines.push({ 
            label: 'Residual Cash', 
            amount: remainingDisplay, 
            percentage: pct(remainingDisplay), 
            type: 'result',
            color: remainingDisplay >= 0 ? 'text-emerald-400' : 'text-red-400'
        });
        
        // Add bonus info line when bonus exists but is excluded
        // Show monthly portion when in monthly view, full annual when in annual view
        if (annualBonus > 0 && !includeBonus) {
            const bonusDisplayAmount = isAnnualView ? netBonus : netBonus / 12;
            const bonusLabel = isAnnualView 
                ? 'Annual Bonus (received separately)' 
                : 'Monthly Bonus (received separately)';
            lines.push({
                label: bonusLabel,
                amount: bonusDisplayAmount,
                percentage: 0, // Not part of the regular budget %
                type: 'info',
                color: 'text-amber-400'
            });
        }
        
        return {
            grossDisplay,
            netDisplay,
            remainingDisplay,
            remainingPercentage: pct(remainingDisplay),
            lines,
            isOverAllocated: remainingDisplay < 0,
            isLow: remainingDisplay >= 0 && pct(remainingDisplay) < 10,
            // Bonus info
            hasBonus: annualBonus > 0,
            netBonus,
            annualBonus,
            // Period info for labels
            isAnnualView,
            periodLabel,
            periodSuffix: isAnnualView ? '/yr' : '/mo',
        };
    }, [state, isHydrated, includeBonus, isAnnualView]);
    
    if (!budget || !isHydrated) {
        return null;
    }
    
    // Determine status color
    const getStatusColor = () => {
        if (budget.isOverAllocated) return 'from-red-600 to-red-500';
        if (budget.isLow) return 'from-amber-600 to-amber-500';
        return 'from-emerald-600 to-emerald-500';
    };
    
    const getStatusBg = () => {
        if (budget.isOverAllocated) return 'bg-red-500/10 border-red-500/30';
        if (budget.isLow) return 'bg-amber-500/10 border-amber-500/30';
        return 'bg-emerald-500/10 border-emerald-500/30';
    };
    
    // Calculate progress bar width (capped at 100% for display)
    const allocatedPercentage = 100 - budget.remainingPercentage;
    const progressWidth = Math.min(Math.max(allocatedPercentage, 0), 100);
    
    // Position-specific wrapper classes
    // z-[9999] to ensure it's above the BMC widget when expanded
    const getWrapperClasses = () => {
        switch (position) {
            case 'floating-bottom':
                return 'fixed bottom-0 left-0 right-0 z-[9999]';
            case 'sidebar':
                return 'fixed top-20 right-4 w-80 z-[9999]';
            case 'inline':
                return 'relative w-full';
            default:
                return 'fixed bottom-0 left-0 right-0 z-[9999]';
        }
    };
    
    return (
        <div className={getWrapperClasses()}>
            <div className={`
                bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800
                ${position === 'sidebar' ? 'rounded-lg border shadow-2xl' : ''}
                ${position === 'inline' ? 'rounded-lg border border-zinc-800 shadow-lg' : ''}
            `}>
                {/* Collapsed View - Always Visible */}
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                        <div className={`p-2 rounded-lg ${getStatusBg()}`}>
                            <Wallet className={`h-4 w-4 ${budget.isOverAllocated ? 'text-red-400' : budget.isLow ? 'text-amber-400' : 'text-emerald-400'}`} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">
                                {budget.periodLabel} Budget {!includeBonus && hasBonus && <span className="text-amber-500">(excl. bonus)</span>}
                            </p>
                            <p className="text-sm font-medium text-zinc-200">
                                Net: {currencySymbol}{Math.round(budget.netDisplay).toLocaleString()}
                            </p>
                        </div>
                    </button>
                    
                    {/* Monthly/Annual Toggle - always visible */}
                    <div 
                        className="flex items-center gap-1.5 bg-zinc-900/80 px-2 py-1 rounded-lg border border-zinc-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsAnnualView(false)}
                            className={cn(
                                "px-2 py-1 rounded text-xs font-medium transition-all",
                                !isAnnualView 
                                    ? "bg-emerald-500/20 text-emerald-400" 
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Mo
                        </button>
                        <span className="text-zinc-700">/</span>
                        <button
                            onClick={() => setIsAnnualView(true)}
                            className={cn(
                                "px-2 py-1 rounded text-xs font-medium transition-all",
                                isAnnualView 
                                    ? "bg-emerald-500/20 text-emerald-400" 
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Yr
                        </button>
                    </div>
                    
                    {/* Bonus Toggle - only show if there's a bonus */}
                    {hasBonus && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIncludeBonus(!includeBonus);
                            }}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                ${includeBonus 
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-amber-500/30 hover:text-amber-400'
                                }
                            `}
                            title={includeBonus ? "Bonus is spread across 12 months" : "Bonus excluded from monthly view"}
                        >
                            <Gift className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{includeBonus ? 'Bonus included' : 'Include bonus'}</span>
                            <span className="sm:hidden">{includeBonus ? 'On' : 'Off'}</span>
                        </button>
                    )}
                    
                    {/* Progress Bar Section */}
                    <div className="flex-1 max-w-md hidden lg:block">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full bg-gradient-to-r ${getStatusColor()} transition-all duration-500`}
                                    style={{ width: `${progressWidth}%` }}
                                />
                            </div>
                            <span className="text-xs text-zinc-500 w-12 text-right">
                                {Math.round(allocatedPercentage)}%
                            </span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5">allocated</p>
                    </div>
                    
                    {/* Remaining Amount */}
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                        <div className="text-right">
                            <p className="text-xs text-zinc-500">Remaining{budget.periodSuffix}</p>
                            <div className="flex items-center gap-1.5">
                                {budget.isOverAllocated ? (
                                    <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                                ) : (
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                                )}
                                <p className={`text-lg font-bold ${budget.isOverAllocated ? 'text-red-400' : budget.isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {currencySymbol}{Math.abs(Math.round(budget.remainingDisplay)).toLocaleString()}
                                </p>
                                <span className={`text-xs ${budget.isOverAllocated ? 'text-red-400' : budget.isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    ({budget.remainingPercentage >= 0 ? '' : '-'}{Math.abs(Math.round(budget.remainingPercentage))}%)
                                </span>
                            </div>
                        </div>
                        <div className="p-1 rounded hover:bg-zinc-800 transition-colors">
                            {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-zinc-400" />
                            ) : (
                                <ChevronUp className="h-5 w-5 text-zinc-400" />
                            )}
                        </div>
                    </button>
                </div>
                
                {/* Expanded View - Waterfall Breakdown */}
                {isExpanded && (
                    <div className="px-4 pb-3 border-t border-zinc-800/50 max-h-[50vh] overflow-y-auto">
                        <div className="pt-3 space-y-0.5">
                            {budget.lines.map((line, index) => (
                                <div 
                                    key={index}
                                    className={`
                                        flex items-center justify-between py-1 px-2 rounded
                                        ${line.type === 'subtotal' ? 'bg-zinc-800/60 mt-1.5 mb-1.5 border-l-2 border-zinc-500' : ''}
                                        ${line.type === 'result' ? 'bg-zinc-800/80 mt-2 py-1.5 border-l-2 border-emerald-500' : ''}
                                        ${line.type === 'income' ? 'bg-zinc-800/40 border-l-2 border-white/30' : ''}
                                        ${line.type === 'info' ? 'bg-amber-500/10 border border-amber-500/20 mt-2 py-1.5' : ''}
                                        ${line.type === 'deduction' && index % 2 === 0 ? 'bg-zinc-900/30' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {line.type === 'deduction' && (
                                            <span className="text-zinc-600 text-xs">−</span>
                                        )}
                                        {line.type === 'subtotal' && (
                                            <span className="text-zinc-500 text-xs">=</span>
                                        )}
                                        {line.type === 'result' && (
                                            <span className="text-zinc-400 text-xs font-bold">=</span>
                                        )}
                                        {line.type === 'info' && (
                                            <Gift className="h-3 w-3 text-amber-400" />
                                        )}
                                        <span className={`text-xs ${line.type === 'result' ? 'font-semibold' : ''} ${line.color || 'text-zinc-400'}`}>
                                            {line.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Mini progress bar for each line (hide for info type) */}
                                        {line.type !== 'info' && (
                                            <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden hidden md:block">
                                                <div 
                                                    className={`h-full rounded-full ${
                                                        line.type === 'deduction' ? 'bg-zinc-600' :
                                                        line.type === 'result' && line.amount >= 0 ? 'bg-emerald-500' :
                                                        line.type === 'result' && line.amount < 0 ? 'bg-red-500' :
                                                        'bg-zinc-500'
                                                    }`}
                                                    style={{ width: `${Math.min(Math.abs(line.percentage), 100)}%` }}
                                                />
                                            </div>
                                        )}
                                        {line.type === 'info' ? (
                                            <span className="text-[10px] text-amber-400/70 hidden md:inline">{isAnnualView ? 'annual' : 'monthly'}</span>
                                        ) : (
                                            <span className={`text-[10px] w-10 text-right ${line.color || 'text-zinc-500'}`}>
                                                {line.type === 'deduction' ? '-' : ''}{Math.abs(Math.round(line.percentage))}%
                                            </span>
                                        )}
                                        <span className={`text-xs font-mono w-20 text-right ${line.type === 'result' || line.type === 'info' ? 'font-bold' : ''} ${line.color || 'text-zinc-300'}`}>
                                            {line.amount < 0 ? '-' : ''}{line.type === 'info' ? '+' : ''}{currencySymbol}{Math.abs(Math.round(line.amount)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Warning message if over-allocated */}
                        {budget.isOverAllocated && (
                            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-2">
                                <span className="text-red-400 text-xs">⚠️</span>
                                <div className="text-xs text-red-300">
                                    <p className="font-medium">Over-allocated by {currencySymbol}{Math.abs(Math.round(budget.remainingDisplay)).toLocaleString()}{budget.periodSuffix}</p>
                                    <p className="text-red-400/70 text-[10px] mt-0.5">Reduce contributions or expenses to balance.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

