'use client';

import React from 'react';
import { useFlameStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormattedInput } from '@/components/ui/formatted-input';
import { SectionHeader } from '@/components/ui/section-header';
import { Toggle } from '@/components/ui/toggle';
import { Rocket, TrendingUp, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, ArrowDown } from 'lucide-react';
import { AccountType, TaxTreatment } from '@/types/flame';

export const RetirementWorkSection = () => {
    const { state, updateSection, updateState } = useFlameStore();
    const { retirementWork, income, settings, accounts } = state;
    const currencySymbol = settings?.currencySymbol || '$';

    // Helper to sync balance to Accounts list
    const syncAccount = (id: string, name: string, type: AccountType, taxTreatment: TaxTreatment, balance: number) => {
        const existingAccount = accounts.find(a => a.id === id);
        
        let newAccounts = accounts;
        if (existingAccount) {
            newAccounts = accounts.map(a => a.id === id ? { ...a, balance } : a);
        } else if (balance > 0) {
            newAccounts = [
                ...accounts,
                { id, name, type, balance, taxTreatment }
            ];
        }

        if (newAccounts !== accounts) {
            updateState({ accounts: newAccounts });
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update = (field: keyof typeof retirementWork, value: any) => {
        updateSection('retirementWork', { [field]: value });

        // Sync specific fields to accounts
        if (field === 'currentPreTaxBalance') {
            syncAccount('sys-work-pretax', '401k Pre-tax', '401k', 'Pre-tax', value);
        } else if (field === 'currentRothBalance') {
            syncAccount('sys-work-roth', '401k Roth', '401k', 'Roth', value);
        } else if (field === 'currentAfterTaxBalance') {
            syncAccount('sys-work-aftertax', '401k After-tax', '401k', 'After-tax', value);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateNested = (parent: 'employerMatch' | 'megaBackdoorRoth', field: string, value: any) => {
        updateSection('retirementWork', {
            [parent]: {
                ...retirementWork[parent],
                [field]: value
            }
        });
    };
    
    // Derived values for display
    const electedPreTax = income.salary * (retirementWork.preTax401kRate / 100);
    const electedRoth = income.salary * (retirementWork.roth401kRate / 100);
    const totalElected = electedPreTax + electedRoth;
    const maxLimit = retirementWork.maxEmployeeContribution;
    
    // Check if over the employee limit
    const isOverLimit = totalElected > maxLimit;
    const ratio = isOverLimit ? maxLimit / totalElected : 1;
    const cappedPreTax = electedPreTax * ratio;
    const cappedRoth = electedRoth * ratio;
    
    // Spillover: excess from pre-tax + Roth elections that goes to after-tax
    const spilloverAmount = isOverLimit ? totalElected - maxLimit : 0;
    
    // Progress toward limit
    const cappedContribution = Math.min(totalElected, maxLimit);
    const progressPercent = maxLimit > 0 ? Math.min((totalElected / maxLimit) * 100, 100) : 0;
    const isMaxed = totalElected >= maxLimit;
    const isNearMax = progressPercent >= 80 && !isMaxed;
    const remainingRoom = Math.max(0, maxLimit - totalElected);

    // Calculate Match (based on CAPPED contributions)
    const hasMatchConfigured = retirementWork.employerMatch.matchLimit > 0 && retirementWork.employerMatch.matchRatio > 0;
    const totalContributionRate = retirementWork.preTax401kRate + retirementWork.roth401kRate;
    const isCapturingFullMatch = hasMatchConfigured && totalContributionRate >= retirementWork.employerMatch.matchLimit;
    
    const estimatedMatch = (hasMatchConfigured ? 
        Math.min(Math.min(totalContributionRate, 100) * ratio, retirementWork.employerMatch.matchLimit) 
        / 100 * (retirementWork.employerMatch.matchRatio / 100) * income.salary
    : 0);

    // After-tax room calculation (for ADDITIONAL after-tax beyond spillover)
    const totalPlanLimit = retirementWork.maxTotal401kLimit || 70000;
    const usedByEmployeeMatchAndSpillover = cappedContribution + estimatedMatch + spilloverAmount;
    const additionalAfterTaxRoom = Math.max(0, totalPlanLimit - usedByEmployeeMatchAndSpillover);
    
    // Additional after-tax contribution (explicit election beyond spillover)
    const electedAdditionalAfterTax = income.salary * (retirementWork.afterTax401kRate / 100);
    const actualAdditionalAfterTax = Math.min(electedAdditionalAfterTax, additionalAfterTaxRoom);
    
    // Total after-tax = spillover + additional
    const totalAfterTax = spilloverAmount + actualAdditionalAfterTax;

    // Effective Roth (if mega-backdoor enabled)
    const effectiveRothAmount = cappedRoth + (retirementWork.megaBackdoorRoth.enabled ? totalAfterTax : 0);
    const effectiveRothRate = (income.salary > 0) ? (effectiveRothAmount / income.salary) * 100 : 0;

    return (
        <div className="space-y-6">
            <SectionHeader title="Work Retirement (401k)" description="Configure your employer-sponsored plan contributions." />
            
            <div className="grid gap-4 md:grid-cols-2">
                {/* Employee Contributions Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Employee Contributions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Pre-tax Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Pre-tax Rate</label>
                                <FormattedInput 
                                    variant="percent"
                                    value={retirementWork.preTax401kRate} 
                                    onChange={(val) => update('preTax401kRate', val)}
                                    min={0}
                                    max={100}
                                    withSpinner 
                                />
                                <p className="text-xs text-zinc-500">
                                    {isOverLimit 
                                        ? <span className="text-amber-400">{currencySymbol}{Math.round(cappedPreTax).toLocaleString()}/yr (capped)</span>
                                        : `${currencySymbol}${Math.round(electedPreTax).toLocaleString()}/yr`
                                    }
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Current Pre-tax Balance</label>
                                <FormattedInput 
                                    variant="currency"
                                    value={retirementWork.currentPreTaxBalance} 
                                    onChange={(val) => update('currentPreTaxBalance', val)} 
                                />
                            </div>
                        </div>

                        {/* Roth Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Roth Rate</label>
                                <FormattedInput 
                                    variant="percent"
                                    value={retirementWork.roth401kRate} 
                                    onChange={(val) => update('roth401kRate', val)}
                                    min={0}
                                    max={100}
                                    withSpinner 
                                />
                                <p className="text-xs text-zinc-500">
                                    {isOverLimit 
                                        ? <span className="text-amber-400">{currencySymbol}{Math.round(cappedRoth).toLocaleString()}/yr (capped)</span>
                                        : `${currencySymbol}${Math.round(electedRoth).toLocaleString()}/yr`
                                    }
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Current Roth Balance</label>
                                <FormattedInput 
                                    variant="currency"
                                    value={retirementWork.currentRothBalance} 
                                    onChange={(val) => update('currentRothBalance', val)} 
                                />
                            </div>
                        </div>
                        
                        {/* Progress toward limit */}
                        <div className="pt-4 mt-2 border-t border-zinc-800">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-300">Employee Limit</span>
                                    <span className={`text-sm font-mono ${isMaxed ? 'text-emerald-400' : isNearMax ? 'text-amber-400' : 'text-zinc-400'}`}>
                                        {currencySymbol}{Math.round(cappedContribution).toLocaleString()} / {currencySymbol}{maxLimit.toLocaleString()}
                                    </span>
                                </div>
                                
                                {/* Progress bar */}
                                <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                                            isMaxed 
                                                ? 'bg-emerald-500' 
                                                : isNearMax 
                                                    ? 'bg-amber-500' 
                                                    : 'bg-orange-500'
                                        }`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                
                                {/* Spillover info */}
                                {isOverLimit && (
                                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <ArrowDown className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                                        <div className="text-sm">
                                            <p className="text-amber-300 font-medium">
                                                {currencySymbol}{Math.round(spilloverAmount).toLocaleString()} spillover → After-tax
                                            </p>
                                            <p className="text-amber-400/70 text-xs mt-0.5">
                                                Your elections exceed {currencySymbol}{maxLimit.toLocaleString()}. The excess automatically goes to after-tax contributions.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                
                                {!isMaxed && !isOverLimit && (
                                    <p className="text-xs text-zinc-500">
                                        {currencySymbol}{Math.round(remainingRoom).toLocaleString()} remaining to reach employee limit.
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        {/* IRS Limits - collapsed */}
                        <details className="group">
                            <summary className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer hover:text-zinc-400 transition-colors">
                                <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                                <span>Edit IRS limits</span>
                            </summary>
                            <div className="mt-3 grid grid-cols-2 gap-4 pl-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">Employee Limit</label>
                                    <FormattedInput 
                                        variant="currency"
                                        value={retirementWork.maxEmployeeContribution} 
                                        onChange={(val) => update('maxEmployeeContribution', val)} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">Total Plan Limit</label>
                                    <FormattedInput 
                                        variant="currency"
                                        value={retirementWork.maxTotal401kLimit || 70000} 
                                        onChange={(val) => update('maxTotal401kLimit', val)} 
                                    />
                                </div>
                            </div>
                        </details>
                    </CardContent>
                </Card>

                {/* Employer Match Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Employer Match</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Match Ratio</label>
                                <FormattedInput 
                                    variant="percent"
                                    value={retirementWork.employerMatch.matchRatio} 
                                    onChange={(val) => updateNested('employerMatch', 'matchRatio', val)} 
                                    min={0}
                                    max={200}
                                    withSpinner
                                />
                                <p className="text-xs text-zinc-500">e.g. 100% or 50%</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Up to % of Salary</label>
                                <FormattedInput 
                                    variant="percent"
                                    value={retirementWork.employerMatch.matchLimit} 
                                    onChange={(val) => updateNested('employerMatch', 'matchLimit', val)} 
                                    min={0}
                                    max={100}
                                    withSpinner
                                />
                                <p className="text-xs text-zinc-500">e.g. up to 6%</p>
                            </div>
                        </div>
                        
                        <div className="pt-3 border-t border-zinc-800 space-y-3">
                            <p className="text-sm text-zinc-400">
                                Estimated Match: <span className="text-zinc-200 font-medium">
                                {currencySymbol}{Math.round(estimatedMatch).toLocaleString()}/yr
                                </span>
                            </p>
                            
                            {hasMatchConfigured && (
                                <div className={`flex items-center gap-2 p-2 rounded-md ${
                                    isCapturingFullMatch 
                                        ? 'bg-emerald-500/10 border border-emerald-500/30' 
                                        : 'bg-amber-500/10 border border-amber-500/30'
                                }`}>
                                    {isCapturingFullMatch ? (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                            <span className="text-xs text-emerald-300">Full match captured!</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                                            <span className="text-xs text-amber-300">
                                                Contribute {Math.max(0, retirementWork.employerMatch.matchLimit - totalContributionRate)}% more to get full match
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* After-tax 401k Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <TrendingUp className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <CardTitle>After-tax 401k & Mega-backdoor Roth</CardTitle>
                            <p className="text-sm text-zinc-500 mt-0.5">
                                Contributions beyond the {currencySymbol}{maxLimit.toLocaleString()} employee limit.
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Plan capacity info */}
                    <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Employee (Pre-tax + Roth)</span>
                                <span className="text-zinc-200">{currencySymbol}{Math.round(cappedContribution).toLocaleString()}</span>
                            </div>
                            {spilloverAmount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-amber-400">↳ Spillover (auto → after-tax)</span>
                                    <span className="text-amber-400">{currencySymbol}{Math.round(spilloverAmount).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Employer Match</span>
                                <span className="text-zinc-200">{currencySymbol}{Math.round(estimatedMatch).toLocaleString()}</span>
                            </div>
                            <div className="h-px bg-zinc-700 my-2" />
                            <div className="flex justify-between text-zinc-300">
                                <span className="font-medium">Subtotal used</span>
                                <span className="font-medium">{currencySymbol}{Math.round(usedByEmployeeMatchAndSpillover).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-purple-400 font-medium">Room for Extra After-tax</span>
                                <span className="text-purple-400 font-bold">{currencySymbol}{Math.round(additionalAfterTaxRoom).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs text-zinc-500 pt-1">
                                <span>Total plan limit (2025)</span>
                                <span>{currencySymbol}{totalPlanLimit.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Spillover explanation */}
                    {spilloverAmount > 0 && (
                        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-sm">
                            <p className="text-amber-200/80">
                                <span className="font-medium">Spillover:</span> Your {retirementWork.preTax401kRate}% + {retirementWork.roth401kRate}% elections 
                                = {currencySymbol}{Math.round(totalElected).toLocaleString()}, which exceeds the {currencySymbol}{maxLimit.toLocaleString()} limit. 
                                The excess {currencySymbol}{Math.round(spilloverAmount).toLocaleString()} automatically goes to after-tax.
                            </p>
                        </div>
                    )}

                    {/* Additional after-tax input */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Extra After-tax Rate</label>
                                <FormattedInput 
                                    variant="percent"
                                    value={retirementWork.afterTax401kRate} 
                                    onChange={(val) => update('afterTax401kRate', val)}
                                    min={0}
                                    max={100}
                                    withSpinner 
                                />
                                <p className="text-xs text-zinc-500">
                                    {electedAdditionalAfterTax > additionalAfterTaxRoom 
                                        ? <span className="text-amber-400">{currencySymbol}{Math.round(actualAdditionalAfterTax).toLocaleString()}/yr (capped)</span>
                                        : `${currencySymbol}${Math.round(actualAdditionalAfterTax).toLocaleString()}/yr`
                                    }
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Current After-tax Balance</label>
                                <FormattedInput 
                                    variant="currency"
                                    value={retirementWork.currentAfterTaxBalance || 0} 
                                    onChange={(val) => update('currentAfterTaxBalance', val)} 
                                />
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500 bg-zinc-900/40 p-2 rounded border border-zinc-800">
                            💡 <span className="text-zinc-400">Spillover is automatic</span> when your elections exceed {currencySymbol}{maxLimit.toLocaleString()}. 
                            This "extra" rate is for contributing <em>even more</em> after-tax beyond that spillover.
                        </p>
                    </div>

                    {/* Total after-tax summary */}
                    {totalAfterTax > 0 && (
                        <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-700">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-300">Total After-tax Contributions</span>
                                <span className="text-lg font-bold text-purple-400">
                                    {currencySymbol}{Math.round(totalAfterTax).toLocaleString()}/yr
                                </span>
                            </div>
                            {spilloverAmount > 0 && actualAdditionalAfterTax > 0 && (
                                <p className="text-xs text-zinc-500 mt-1">
                                    = {currencySymbol}{Math.round(spilloverAmount).toLocaleString()} spillover + {currencySymbol}{Math.round(actualAdditionalAfterTax).toLocaleString()} extra
                                </p>
                            )}
                        </div>
                    )}

                    {/* Mega-backdoor Roth toggle */}
                    {totalAfterTax > 0 && (
                        <div className="pt-4 border-t border-zinc-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="h-4 w-4 text-emerald-400" />
                                        <label className="text-base font-medium text-zinc-200">Convert After-tax → Roth</label>
                                    </div>
                                    <p className="text-sm text-zinc-500">
                                        Convert {spilloverAmount > 0 && actualAdditionalAfterTax > 0 
                                            ? `spillover (${currencySymbol}${Math.round(spilloverAmount).toLocaleString()}) + extra (${currencySymbol}${Math.round(actualAdditionalAfterTax).toLocaleString()})` 
                                            : spilloverAmount > 0 
                                                ? `spillover (${currencySymbol}${Math.round(spilloverAmount).toLocaleString()})` 
                                                : `${currencySymbol}${Math.round(actualAdditionalAfterTax).toLocaleString()} extra after-tax`
                                        } to Roth.
                                    </p>
                                </div>
                                <Toggle 
                                    checked={retirementWork.megaBackdoorRoth.enabled} 
                                    onCheckedChange={(checked) => updateNested('megaBackdoorRoth', 'enabled', checked)}
                                />
                            </div>
                            
                            {!retirementWork.megaBackdoorRoth.enabled && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-200/80 text-sm flex gap-2">
                                    <span>⚠️</span>
                                    <span>Without conversion, earnings on after-tax contributions are taxed as ordinary income.</span>
                                </div>
                            )}

                            {retirementWork.megaBackdoorRoth.enabled && (
                                <div className="p-4 bg-gradient-to-r from-emerald-950/50 to-zinc-900 border border-emerald-500/20 rounded-lg">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Rocket className="h-4 w-4 text-emerald-400" />
                                                <p className="text-sm font-medium text-emerald-200">Total Roth Contribution</p>
                                            </div>
                                            <span className="text-emerald-400 font-bold text-lg">{effectiveRothRate.toFixed(1)}%</span>
                                        </div>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between text-zinc-400">
                                                <span>Direct Roth 401k:</span>
                                                <span>{currencySymbol}{Math.round(cappedRoth).toLocaleString()}</span>
                                            </div>
                                            {spilloverAmount > 0 && (
                                                <div className="flex justify-between text-amber-400/80">
                                                    <span>Spillover → Roth:</span>
                                                    <span>{currencySymbol}{Math.round(spilloverAmount).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {actualAdditionalAfterTax > 0 && (
                                                <div className="flex justify-between text-purple-400/80">
                                                    <span>Extra After-tax → Roth:</span>
                                                    <span>{currencySymbol}{Math.round(actualAdditionalAfterTax).toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="pt-2 mt-2 border-t border-emerald-500/20 flex justify-between text-sm font-medium text-emerald-300">
                                                <span>Total Roth Inflow:</span>
                                                <span>{currencySymbol}{Math.round(effectiveRothAmount).toLocaleString()}/yr</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {totalAfterTax === 0 && (
                        <p className="text-sm text-zinc-500 text-center py-4">
                            {isOverLimit 
                                ? "Your spillover will appear here when you exceed the employee limit."
                                : "Increase your contribution rates above the employee limit, or set an additional after-tax rate."
                            }
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
