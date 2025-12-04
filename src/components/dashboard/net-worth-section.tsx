'use client';

import React, { useState } from 'react';
import { useFlameStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
    ChevronDown, 
    ChevronUp, 
    Wallet, 
    PiggyBank, 
    Landmark, 
    Building2,
    Banknote,
    TrendingUp
} from 'lucide-react';

interface CategoryData {
    name: string;
    icon: React.ReactNode;
    total: number;
    color: string;
    accounts: { name: string; balance: number; detail?: string }[];
}

export const NetWorthSection: React.FC = () => {
    const { state } = useFlameStore();
    const { accounts, liabilities, retirementWork, settings } = state;
    const currencySymbol = settings?.currencySymbol || '$';
    
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    // Calculate totals
    const totalAssets = accounts.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const netWorth = totalAssets - totalLiabilities;

    // Categorize accounts
    const taxAdvantagedTypes = ['401k', 'IRA', 'Roth IRA', 'HSA'];
    const brokerageTypes = ['Brokerage'];
    const cashTypes = ['Cash', 'Cash (HYSA)'];
    const otherTypes = ['529', 'Real Estate', 'Other'];

    const taxAdvantagedAccounts = accounts.filter(a => taxAdvantagedTypes.includes(a.type));
    const brokerageAccounts = accounts.filter(a => brokerageTypes.includes(a.type));
    const cashAccounts = accounts.filter(a => cashTypes.includes(a.type));
    const otherAccounts = accounts.filter(a => otherTypes.includes(a.type));

    // Calculate 401k Pre-tax vs Roth breakdown
    const preTaxBalance = retirementWork.currentPreTaxBalance || 0;
    const rothBalance = retirementWork.currentRothBalance || 0;
    const total401k = preTaxBalance + rothBalance;
    const preTaxPercent = total401k > 0 ? ((preTaxBalance / total401k) * 100).toFixed(0) : '0';
    const rothPercent = total401k > 0 ? ((rothBalance / total401k) * 100).toFixed(0) : '0';

    // Build category data
    const categories: CategoryData[] = [
        {
            name: 'Tax-Advantaged',
            icon: <Landmark className="h-4 w-4" />,
            total: taxAdvantagedAccounts.reduce((sum, a) => sum + a.balance, 0),
            color: 'bg-orange-500',
            accounts: taxAdvantagedAccounts.map(a => ({
                name: a.name || a.type,
                balance: a.balance,
                detail: a.type === '401k' && total401k > 0 
                    ? `Pre-tax ${preTaxPercent}% · Roth ${rothPercent}%`
                    : undefined
            }))
        },
        {
            name: 'Brokerage',
            icon: <TrendingUp className="h-4 w-4" />,
            total: brokerageAccounts.reduce((sum, a) => sum + a.balance, 0),
            color: 'bg-emerald-500',
            accounts: brokerageAccounts.map(a => ({
                name: a.name || 'Brokerage',
                balance: a.balance
            }))
        },
        {
            name: 'Cash',
            icon: <Banknote className="h-4 w-4" />,
            total: cashAccounts.reduce((sum, a) => sum + a.balance, 0),
            color: 'bg-sky-500',
            accounts: cashAccounts.map(a => ({
                name: a.name || a.type,
                balance: a.balance
            }))
        },
        {
            name: 'Other Assets',
            icon: <Building2 className="h-4 w-4" />,
            total: otherAccounts.reduce((sum, a) => sum + a.balance, 0),
            color: 'bg-violet-500',
            accounts: otherAccounts.map(a => ({
                name: a.name || a.type,
                balance: a.balance
            }))
        }
    ].filter(cat => cat.total > 0 || cat.accounts.length > 0);

    // Add liabilities as a category
    if (totalLiabilities > 0) {
        categories.push({
            name: 'Liabilities',
            icon: <Wallet className="h-4 w-4" />,
            total: -totalLiabilities,
            color: 'bg-red-500',
            accounts: liabilities.map(l => ({
                name: l.name,
                balance: -l.balance,
                detail: l.interestRate > 0 ? `${l.interestRate}% APR` : undefined
            }))
        });
    }

    const formatCurrency = (val: number) => {
        const absVal = Math.abs(val);
        if (absVal >= 1000000) return `${currencySymbol}${(val / 1000000).toFixed(2)}M`;
        if (absVal >= 1000) return `${currencySymbol}${(val / 1000).toFixed(1)}k`;
        return `${currencySymbol}${val.toLocaleString()}`;
    };

    const formatFullCurrency = (val: number) => {
        return `${currencySymbol}${val.toLocaleString()}`;
    };

    const toggleCategory = (name: string) => {
        setExpandedCategory(expandedCategory === name ? null : name);
    };

    return (
        <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <PiggyBank className="h-5 w-5 text-orange-500" />
                    Net Worth Overview
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Total Net Worth */}
                <div className="text-center py-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                    <p className="text-sm text-zinc-400 mb-1">Total Net Worth</p>
                    <p className={cn(
                        "text-4xl font-bold",
                        netWorth >= 0 ? "text-white" : "text-red-400"
                    )}>
                        {formatFullCurrency(netWorth)}
                    </p>
                    <div className="flex justify-center gap-6 mt-3 text-sm">
                        <span className="text-zinc-400">
                            Assets: <span className="text-green-400">{formatCurrency(totalAssets)}</span>
                        </span>
                        <span className="text-zinc-400">
                            Debt: <span className="text-red-400">{formatCurrency(totalLiabilities)}</span>
                        </span>
                    </div>
                </div>

                {/* Stacked Bar Overview */}
                {totalAssets > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-zinc-400">
                            <span>Asset Allocation</span>
                            <span>{formatCurrency(totalAssets)}</span>
                        </div>
                        <div className="h-4 rounded-full overflow-hidden flex bg-zinc-800">
                            {categories.filter(c => c.total > 0).map((cat) => {
                                const percent = (cat.total / totalAssets) * 100;
                                return (
                                    <div
                                        key={cat.name}
                                        className={cn(cat.color, "h-full transition-all relative group")}
                                        style={{ width: `${percent}%` }}
                                        title={`${cat.name}: ${formatCurrency(cat.total)} (${percent.toFixed(1)}%)`}
                                    >
                                        {percent > 10 && (
                                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/90">
                                                {percent.toFixed(0)}%
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 text-xs">
                            {categories.filter(c => c.total > 0).map(cat => (
                                <div key={cat.name} className="flex items-center gap-1.5">
                                    <div className={cn("w-2.5 h-2.5 rounded-full", cat.color)} />
                                    <span className="text-zinc-400">{cat.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Category Breakdown */}
                <div className="space-y-2">
                    {categories.map(cat => (
                        <div key={cat.name} className="border border-zinc-800 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleCategory(cat.name)}
                                className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-1.5 rounded", cat.color + "/20")}>
                                        <span className={cat.total < 0 ? "text-red-400" : "text-zinc-300"}>
                                            {cat.icon}
                                        </span>
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-sm text-white">{cat.name}</p>
                                        <p className="text-xs text-zinc-500">{cat.accounts.length} account{cat.accounts.length !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className={cn(
                                            "font-semibold",
                                            cat.total < 0 ? "text-red-400" : "text-white"
                                        )}>
                                            {formatCurrency(cat.total)}
                                        </p>
                                        {totalAssets > 0 && cat.total > 0 && (
                                            <p className="text-xs text-zinc-500">
                                                {((cat.total / totalAssets) * 100).toFixed(1)}% of assets
                                            </p>
                                        )}
                                    </div>
                                    {expandedCategory === cat.name 
                                        ? <ChevronUp className="h-4 w-4 text-zinc-400" />
                                        : <ChevronDown className="h-4 w-4 text-zinc-400" />
                                    }
                                </div>
                            </button>
                            
                            {/* Expanded Account List */}
                            {expandedCategory === cat.name && cat.accounts.length > 0 && (
                                <div className="border-t border-zinc-800 bg-zinc-950/30">
                                    {cat.accounts.map((acc, idx) => (
                                        <div 
                                            key={idx}
                                            className={cn(
                                                "flex items-center justify-between px-4 py-2.5",
                                                idx !== cat.accounts.length - 1 && "border-b border-zinc-800/50"
                                            )}
                                        >
                                            <div>
                                                <p className="text-sm text-zinc-300">{acc.name}</p>
                                                {acc.detail && (
                                                    <p className="text-xs text-zinc-500">{acc.detail}</p>
                                                )}
                                            </div>
                                            <p className={cn(
                                                "font-medium text-sm",
                                                acc.balance < 0 ? "text-red-400" : "text-zinc-200"
                                            )}>
                                                {formatFullCurrency(Math.abs(acc.balance))}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {expandedCategory === cat.name && cat.accounts.length === 0 && (
                                <div className="border-t border-zinc-800 bg-zinc-950/30 p-4">
                                    <p className="text-sm text-zinc-500 italic text-center">No accounts in this category</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

