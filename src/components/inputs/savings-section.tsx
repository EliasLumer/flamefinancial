'use client';

import React, { useState } from 'react';
import { useFlameStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormattedInput } from '@/components/ui/formatted-input';
import { SectionHeader } from '@/components/ui/section-header';
import { Toggle } from '@/components/ui/toggle';
import { calculateCashFlow } from '@/lib/engine';
import { TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountType, TaxTreatment } from '@/types/flame';

export const SavingsSection = () => {
    const { state, updateSection, updateState } = useFlameStore();
    const { savings, settings, accounts } = state;
    const currencySymbol = settings?.currencySymbol || '$';
    const [isMonthly, setIsMonthly] = useState(false);

    // Calculate cash flow to show residual
    const cashFlow = calculateCashFlow(state);

    // Helper to sync balance to Accounts list
    const syncAccount = (id: string, name: string, type: AccountType, taxTreatment: TaxTreatment, balance: number, expectedReturn?: number) => {
        const existingAccount = accounts.find(a => a.id === id);
        
        let newAccounts = accounts;
        if (existingAccount) {
            newAccounts = accounts.map(a => a.id === id ? { ...a, balance } : a);
        } else if (balance > 0) {
            newAccounts = [
                ...accounts,
                { id, name, type, balance, taxTreatment, expectedReturn }
            ];
        }

        if (newAccounts !== accounts) {
            updateState({ accounts: newAccounts });
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update = (field: keyof typeof savings, value: any) => {
        updateSection('savings', { [field]: value });
        
        // Sync balance to accounts (Brokerage uses market return ~7% by default)
        if (field === 'brokerageBalance') {
            syncAccount('sys-brokerage', 'Taxable Brokerage', 'Brokerage', 'Taxable', value, state.assumptions.marketReturn);
        }
    };

    // Calculate actual brokerage contribution
    const brokerageFromRate = cashFlow.netAfterTax * ((savings?.brokerageRate || 0) / 100);
    const brokerageFromFixed = savings?.brokerageFixedAmount || 0;
    const actualBrokerage = brokerageFromFixed > 0 ? brokerageFromFixed : brokerageFromRate;

    return (
        <div className="space-y-6">
            <SectionHeader 
                title="Taxable Savings" 
                description="Configure contributions to taxable brokerage accounts."
                icon={PiggyBank}
                accentColor="emerald"
            />
            
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-500/20">
                                <Wallet className="h-5 w-5 text-orange-400" />
                            </div>
                            <CardTitle>Taxable Brokerage</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Contribution Rate</label>
                                <FormattedInput 
                                    variant="percent"
                                    value={savings?.brokerageRate || 0} 
                                    onChange={(val) => update('brokerageRate', val)}
                                    min={0}
                                    max={100}
                                    withSpinner 
                                />
                                <p className="text-xs text-zinc-500">
                                    % of net income
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">OR Fixed Amount</label>
                                <FormattedInput 
                                    variant="currency"
                                    value={savings?.brokerageFixedAmount || 0} 
                                    onChange={(val) => update('brokerageFixedAmount', val)}
                                    min={0}
                                />
                                <p className="text-xs text-zinc-500">
                                    {brokerageFromFixed > 0 ? 'Using fixed' : 'Optional override'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Current Balance</label>
                            <FormattedInput 
                                variant="currency"
                                value={savings?.brokerageBalance || 0} 
                                onChange={(val) => update('brokerageBalance', val)}
                                min={0}
                            />
                        </div>

                        <div className="pt-4 border-t border-zinc-800">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-400">Annual Contribution:</span>
                                <span className="text-lg font-bold text-orange-400">
                                    {currencySymbol}{Math.round(actualBrokerage).toLocaleString()}/yr
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/20">
                                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                                </div>
                                <CardTitle>Residual Cash</CardTitle>
                            </div>
                            {/* Monthly/Annual Toggle */}
                            <div className="flex items-center gap-2 bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-zinc-800">
                                <span className={cn(
                                    "text-xs font-medium transition-colors",
                                    !isMonthly ? "text-emerald-400" : "text-zinc-500"
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
                                    isMonthly ? "text-emerald-400" : "text-zinc-500"
                                )}>
                                    Monthly
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-zinc-400">
                            What remains after all contributions and expenses{isMonthly ? ' (monthly)' : ' (annual)'}.
                        </p>

                        {(() => {
                            const divisor = isMonthly ? 12 : 1;
                            const periodLabel = isMonthly ? '/mo' : '/yr';
                            const netAfterTax = (cashFlow.netAfterTax || 0) / divisor;
                            const retirement = ((cashFlow.roth401k || 0) + (cashFlow.rothIra || 0) + (cashFlow.totalAfterTax || 0)) / divisor;
                            const expenses = ((cashFlow.fixedExpenses || 0) + (cashFlow.variableExpenses || 0)) / divisor;
                            const brokerage = (cashFlow.brokerageContribution || 0) / divisor;
                            const residual = (cashFlow.residualCash || 0) / divisor;
                            
                            return (
                                <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Net After Tax</span>
                                        <span className="text-zinc-200">{currencySymbol}{Math.round(netAfterTax).toLocaleString()}{periodLabel}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">− Retirement (Roth 401k + IRA + After-tax)</span>
                                        <span className="text-red-400">−{currencySymbol}{Math.round(retirement).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">− Living Expenses</span>
                                        <span className="text-red-400">−{currencySymbol}{Math.round(expenses).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">− Brokerage</span>
                                        <span className="text-red-400">−{currencySymbol}{Math.round(brokerage).toLocaleString()}</span>
                                    </div>
                                    <div className="h-px bg-zinc-700 my-2" />
                                    <div className="flex justify-between">
                                        <span className={`font-medium ${residual >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            Residual{periodLabel}
                                        </span>
                                        <span className={`text-lg font-bold ${residual >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {residual >= 0 ? '' : '−'}{currencySymbol}{Math.abs(Math.round(residual)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        {cashFlow.residualCash < 0 && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-200/80 text-sm">
                                ⚠️ You&apos;re over-allocated. Reduce contributions or expenses.
                            </div>
                        )}

                        {cashFlow.residualCash > 0 && (
                            <p className="text-xs text-zinc-500">
                                This residual can be added to your brokerage or kept as cash buffer.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

