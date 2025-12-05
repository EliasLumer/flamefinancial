'use client';

import React from 'react';
import { CashFlow } from '@/lib/engine';
import { cn } from '@/lib/utils';
import { Gift } from 'lucide-react';

interface CashFlowTableProps {
    data: CashFlow;
    currencySymbol?: string;
    excludedBonus?: number;
    effectiveTaxRate?: number;
    isMonthly?: boolean;
}

type RowType = 'income' | 'deduction' | 'subtotal' | 'result' | 'info';

interface RowProps {
    label: string;
    value: number;
    gross: number;
    type?: RowType;
    color?: string;
    currencySymbol?: string;
    index?: number;
    isMonthly?: boolean;
}

const Row = ({ label, value, gross, type = 'deduction', color, currencySymbol = '$', index = 0, isMonthly = false }: RowProps) => {
    const displayValue = isMonthly ? value / 12 : value;
    const percentage = gross > 0 ? (value / gross) * 100 : 0; // Percentage stays the same
    
    const getBgClass = () => {
        if (type === 'income') return 'bg-zinc-800/40 border-l-2 border-white/30';
        if (type === 'subtotal') return 'bg-zinc-800/60 border-l-2 border-zinc-500 mt-1.5 mb-1.5';
        if (type === 'result') return 'bg-zinc-800/80 border-l-2 border-emerald-500 mt-2';
        if (type === 'info') return 'bg-blue-500/10 border border-blue-500/20 mt-2';
        // Alternating for deductions
        return index % 2 === 0 ? 'bg-zinc-900/30' : '';
    };
    
    const getTextColor = () => {
        if (color) return color;
        if (type === 'income') return 'text-white';
        if (type === 'subtotal') return 'text-zinc-200';
        if (type === 'result') return value >= 0 ? 'text-emerald-400' : 'text-red-400';
        return 'text-zinc-300';
    };
    
    const getBarColor = () => {
        if (type === 'result') return value >= 0 ? 'bg-emerald-500' : 'bg-red-500';
        if (type === 'income' || type === 'subtotal') return 'bg-zinc-500';
        return 'bg-zinc-600';
    };
    
    return (
        <div className={cn(
            "flex items-center justify-between py-1.5 px-3 rounded text-xs",
            getBgClass(),
            type === 'result' && 'py-2'
        )}>
            <div className="flex items-center gap-1.5 min-w-0">
                {type === 'deduction' && <span className="text-zinc-600 text-[10px]">−</span>}
                {type === 'subtotal' && <span className="text-zinc-500 text-[10px]">=</span>}
                {type === 'result' && <span className="text-zinc-400 text-[10px] font-bold">=</span>}
                <span className={cn(
                    "truncate",
                    type === 'result' && 'font-semibold',
                    getTextColor()
                )}>
                    {label}
                </span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
                {/* Mini progress bar */}
                <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden hidden sm:block">
                    <div 
                        className={cn("h-full rounded-full", getBarColor())}
                        style={{ width: `${Math.min(Math.abs(percentage), 100)}%` }}
                    />
                </div>
                {/* Percentage */}
                <span className={cn("text-[10px] w-10 text-right", color || 'text-zinc-500')}>
                    {value === 0 ? '-' : `${type === 'deduction' ? '-' : ''}${Math.abs(Math.round(percentage))}%`}
                </span>
                {/* Amount */}
                <span className={cn("font-mono w-20 text-right", type === 'result' ? 'font-bold' : '', getTextColor())}>
                    {value === 0 ? '-' : `${currencySymbol}${Math.round(displayValue).toLocaleString()}`}
                </span>
            </div>
        </div>
    );
};

export const CashFlowTable: React.FC<CashFlowTableProps> = ({ data, currencySymbol = '$', excludedBonus, effectiveTaxRate = 0, isMonthly = false }) => {
    const gross = data.grossIncome;
    let deductionIndex = 0;
    
    // Calculate net bonus if excluded
    const netBonus = excludedBonus ? excludedBonus * (1 - effectiveTaxRate / 100) : 0;
    const displayNetBonus = isMonthly ? netBonus / 12 : netBonus;
    
    return (
        <div className="w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/30">
            <div className="min-w-[400px] p-3 space-y-0.5">
                {/* Header */}
                <div className="flex items-center justify-between py-2 px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-700/50 mb-2 bg-zinc-800/30 rounded-t -mx-3 -mt-3 px-3">
                    <div>Category</div>
                    <div className="flex items-center gap-3">
                        <span className="w-12 hidden sm:block"></span>
                        <span className="w-10 text-right">%</span>
                        <span className="w-20 text-right">{isMonthly ? 'Monthly' : 'Annual'}</span>
                    </div>
                </div>
                
                {/* Gross Income */}
                <Row label="Gross Income" value={data.grossIncome} gross={gross} type="income" currencySymbol={currencySymbol} isMonthly={isMonthly} />
                
                {/* Pre-tax Deductions */}
                {data.preTax401k > 0 && <Row label="Pre-tax 401k" value={data.preTax401k} gross={gross} color="text-blue-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.employerMatch > 0 && <Row label="401k (Employer Match)" value={data.employerMatch} gross={gross} color="text-blue-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.hsaContribution > 0 && <Row label="HSA" value={data.hsaContribution} gross={gross} color="text-blue-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.traditionalIra > 0 && <Row label="Traditional IRA" value={data.traditionalIra} gross={gross} color="text-blue-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                <Row label="Taxes" value={data.taxes} gross={gross} color="text-red-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />
                
                {/* Net After Tax */}
                <Row label="Net Take-Home" value={data.netAfterTax} gross={gross} type="subtotal" currencySymbol={currencySymbol} isMonthly={isMonthly} />
                
                {/* Post-tax Allocations */}
                {data.roth401k > 0 && <Row label="Roth 401k" value={data.roth401k} gross={gross} color="text-emerald-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.rothIra > 0 && <Row label="Roth IRA" value={data.rothIra} gross={gross} color="text-emerald-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.spilloverAfterTax > 0 && <Row label="Spillover (After-tax)" value={data.spilloverAfterTax} gross={gross} color="text-emerald-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.additionalAfterTax > 0 && <Row label="Additional After-tax" value={data.additionalAfterTax} gross={gross} color="text-emerald-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.megaBackdoorRoth > 0 && <Row label="↳ Mega-backdoor Roth" value={data.megaBackdoorRoth} gross={gross} color="text-emerald-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.postTax401k > 0 && <Row label="↳ Kept as After-tax" value={data.postTax401k} gross={gross} color="text-emerald-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.education529 > 0 && <Row label="529 Plans" value={data.education529} gross={gross} color="text-purple-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                
                {/* Expenses */}
                {data.housing > 0 && <Row label="Needs (Housing)" value={data.housing} gross={gross} color="text-orange-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.needsOther > 0 && <Row label="Needs (Other)" value={data.needsOther} gross={gross} color="text-orange-300" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.wants > 0 && <Row label="Wants" value={data.wants} gross={gross} color="text-amber-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                {data.debtPayments > 0 && <Row label="Debt Payments" value={data.debtPayments} gross={gross} color="text-red-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                
                {/* Brokerage */}
                {data.brokerageContribution > 0 && <Row label="Brokerage" value={data.brokerageContribution} gross={gross} color="text-blue-400" index={deductionIndex++} currencySymbol={currencySymbol} isMonthly={isMonthly} />}
                
                {/* Residual */}
                <Row label="Residual Cash" value={data.residualCash} gross={gross} type="result" currencySymbol={currencySymbol} isMonthly={isMonthly} />
                
                {/* Excluded Bonus Info */}
                {excludedBonus && excludedBonus > 0 && (
                    <div className="flex items-center justify-between py-2 px-3 rounded bg-amber-500/10 border border-amber-500/20 mt-3">
                        <div className="flex items-center gap-2">
                            <Gift className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-xs text-amber-400">{isMonthly ? 'Monthly' : 'Annual'} Bonus (excluded)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] text-amber-400/70">net</span>
                            <span className="text-xs font-mono font-bold text-amber-400 w-20 text-right">
                                +{currencySymbol}{Math.round(displayNetBonus).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
