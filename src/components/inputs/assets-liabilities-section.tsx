'use client';

import React from 'react';
import { useFlameStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormattedInput } from '@/components/ui/formatted-input';
import { SectionHeader } from '@/components/ui/section-header';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Landmark } from 'lucide-react';
import { AccountType, TaxTreatment } from '@/types/flame';
import { cn } from '@/lib/utils';

const ACCOUNT_TYPES: AccountType[] = ['401k', 'IRA', 'Roth IRA', 'HSA', '529', 'Brokerage', 'Cash', 'Cash (HYSA)', 'Real Estate', 'Other'];
const TAX_TREATMENTS: TaxTreatment[] = ['Pre-tax', 'Roth', 'After-tax', 'Taxable'];

// Account types that use per-account expected return (taxable accounts)
const TAXABLE_ACCOUNT_TYPES: AccountType[] = ['Brokerage', 'Cash', 'Cash (HYSA)'];

// Default expected returns by account type
const getDefaultExpectedReturn = (type: AccountType): number => {
    switch(type) {
        case 'Cash': return 0;           // Checking = 0%
        case 'Cash (HYSA)': return 3;    // High-yield savings ~3%
        case 'Brokerage': return 7;      // Stocks (uses market return)
        default: return 7;
    }
};

export const AssetsLiabilitiesSection = () => {
    const { state, updateState, updateSection } = useFlameStore();
    const { accounts, liabilities, settings, retirementWork, retirementPersonal, hsa, education529 } = state;
    const currencySymbol = settings?.currencySymbol || '$';

    // Assets
    const addAccount = () => {
        const defaultType: AccountType = 'Brokerage';
        updateState({
            accounts: [
                ...accounts,
                { 
                    id: Math.random().toString(), 
                    name: 'New Account', 
                    type: defaultType, 
                    balance: 0, 
                    taxTreatment: 'Taxable',
                    expectedReturn: getDefaultExpectedReturn(defaultType)
                }
            ]
        });
    };

    const updateAccount = (id: string, field: string, value: any) => {
        updateState({
            accounts: accounts.map(a => {
                if (a.id !== id) return a;
                
                // When type changes, update expectedReturn to the default for the new type
                if (field === 'type') {
                    const newType = value as AccountType;
                    return { 
                        ...a, 
                        [field]: value,
                        expectedReturn: TAXABLE_ACCOUNT_TYPES.includes(newType) 
                            ? getDefaultExpectedReturn(newType)
                            : undefined
                    };
                }
                
                return { ...a, [field]: value };
            })
        });

        // Reverse sync: If updating balance in Assets list, update the source config if it's a system account
        if (field === 'balance') {
            if (id === 'sys-work-pretax') {
                updateSection('retirementWork', { currentPreTaxBalance: value });
            } else if (id === 'sys-work-roth') {
                updateSection('retirementWork', { currentRothBalance: value });
            } else if (id === 'sys-personal-roth') {
                updateSection('retirementPersonal', { rothIraBalance: value });
            } else if (id === 'sys-personal-traditional') {
                updateSection('retirementPersonal', { traditionalIraBalance: value });
            } else if (id === 'sys-hsa') {
                updateSection('hsa', { currentBalance: value });
            } else if (id.startsWith('sys-529-')) {
                 const planId = id.replace('sys-529-', '');
                 const plan = education529.plans.find(p => p.id === planId);
                 if (plan) {
                     const newPlans = education529.plans.map(p => p.id === planId ? { ...p, currentBalance: value } : p);
                     updateSection('education529', { plans: newPlans });
                 }
            }
        }
    };

    const removeAccount = (id: string) => {
        updateState({
            accounts: accounts.filter(a => a.id !== id)
        });

        // Reset the corresponding config value to 0 if it's a system account
        if (id === 'sys-work-pretax') {
            updateSection('retirementWork', { currentPreTaxBalance: 0 });
        } else if (id === 'sys-work-roth') {
            updateSection('retirementWork', { currentRothBalance: 0 });
        } else if (id === 'sys-personal-roth') {
            updateSection('retirementPersonal', { rothIraBalance: 0 });
        } else if (id === 'sys-personal-traditional') {
            updateSection('retirementPersonal', { traditionalIraBalance: 0 });
        } else if (id === 'sys-hsa') {
            updateSection('hsa', { currentBalance: 0 });
        } else if (id.startsWith('sys-529-')) {
             const planId = id.replace('sys-529-', '');
             // For 529s, we don't remove the plan itself, just zero out the balance? 
             // Or maybe we assume the user wants to zero out the balance for that plan.
             const plan = education529.plans.find(p => p.id === planId);
             if (plan) {
                 const newPlans = education529.plans.map(p => p.id === planId ? { ...p, currentBalance: 0 } : p);
                 updateSection('education529', { plans: newPlans });
             }
        }
    };

    // Liabilities
    const addLiability = () => {
        updateState({
            liabilities: [
                ...liabilities,
                { id: Math.random().toString(), name: 'New Debt', balance: 0, interestRate: 0 }
            ]
        });
    };

    const updateLiability = (id: string, field: string, value: any) => {
        updateState({
            liabilities: liabilities.map(l => l.id === id ? { ...l, [field]: value } : l)
        });
    };

    const removeLiability = (id: string) => {
        updateState({
            liabilities: liabilities.filter(l => l.id !== id)
        });
    };

    const totalAssets = accounts.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const netWorth = totalAssets - totalLiabilities;

    return (
        <div className="space-y-6">
            <SectionHeader title="Assets & Liabilities" description="Your net worth snapshot." icon={Landmark} accentColor="amber" />

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Assets</CardTitle>
                    <Button size="sm" variant="outline" onClick={addAccount}><Plus className="h-4 w-4 mr-2"/> Add Account</Button>
                </CardHeader>
                <CardContent>
                     {accounts.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic">No accounts added.</p>
                    ) : (
                        <div className="space-y-4">
                            {accounts.map(acc => {
                                const isTaxable = TAXABLE_ACCOUNT_TYPES.includes(acc.type);
                                return (
                                    <div key={acc.id} className={cn(
                                        "grid gap-4 p-4 bg-zinc-950/30 rounded-md border border-zinc-800",
                                        isTaxable 
                                            ? "md:grid-cols-[1fr_120px_120px_80px_120px_auto]" 
                                            : "md:grid-cols-[1fr_120px_120px_120px_auto]"
                                    )}>
                                        <div className="space-y-1">
                                            <label className="text-xs text-zinc-400 block md:hidden">Name</label>
                                            <Input 
                                                placeholder="Account Name" 
                                                value={acc.name} 
                                                onChange={(e) => updateAccount(acc.id, 'name', e.target.value)} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-zinc-400 block md:hidden">Type</label>
                                            <select 
                                                className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                                                value={acc.type}
                                                onChange={(e) => updateAccount(acc.id, 'type', e.target.value)}
                                            >
                                                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-zinc-400 block md:hidden">Tax Label</label>
                                            <select 
                                                className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                                                value={acc.taxTreatment}
                                                onChange={(e) => updateAccount(acc.id, 'taxTreatment', e.target.value)}
                                            >
                                                {TAX_TREATMENTS.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        {isTaxable && (
                                            <div className="space-y-1">
                                                <label className="text-xs text-zinc-400 block md:hidden">Return %</label>
                                                <FormattedInput 
                                                    variant="percent"
                                                    placeholder="Return" 
                                                    value={acc.expectedReturn ?? getDefaultExpectedReturn(acc.type)} 
                                                    onChange={(val) => updateAccount(acc.id, 'expectedReturn', val)} 
                                                    decimalScale={1}
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <label className="text-xs text-zinc-400 block md:hidden">Balance</label>
                                            <FormattedInput 
                                                variant="currency"
                                                placeholder="Balance" 
                                                value={acc.balance} 
                                                onChange={(val) => updateAccount(acc.id, 'balance', val)} 
                                            />
                                        </div>
                                        <div className="flex items-center justify-end">
                                            <Button size="icon" variant="ghost" onClick={() => removeAccount(acc.id)}>
                                                <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Liabilities</CardTitle>
                    <Button size="sm" variant="outline" onClick={addLiability}><Plus className="h-4 w-4 mr-2"/> Add Debt</Button>
                </CardHeader>
                <CardContent>
                     {liabilities.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic">No liabilities added.</p>
                    ) : (
                        <div className="space-y-4">
                            {liabilities.map(debt => (
                                <div key={debt.id} className="grid gap-4 p-4 bg-zinc-950/30 rounded-md border border-zinc-800 md:grid-cols-[1fr_120px_100px_120px_auto]">
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-400 block md:hidden">Name</label>
                                        <Input 
                                            placeholder="Debt Name" 
                                            value={debt.name} 
                                            onChange={(e) => updateLiability(debt.id, 'name', e.target.value)} 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-400 block md:hidden">Balance</label>
                                        <FormattedInput 
                                            variant="currency"
                                            placeholder="Balance" 
                                            value={debt.balance} 
                                            onChange={(val) => updateLiability(debt.id, 'balance', val)} 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-400 block md:hidden">Rate</label>
                                        <FormattedInput 
                                            variant="percent"
                                            placeholder="Rate" 
                                            value={debt.interestRate} 
                                            onChange={(val) => updateLiability(debt.id, 'interestRate', val)} 
                                            decimalScale={2}
                                        />
                                    </div>
                                     <div className="space-y-1">
                                        <label className="text-xs text-zinc-400 block md:hidden">Payment/mo</label>
                                        <FormattedInput 
                                            variant="currency"
                                            placeholder="Payment" 
                                            value={debt.monthlyPayment} 
                                            onChange={(val) => updateLiability(debt.id, 'monthlyPayment', val)} 
                                        />
                                    </div>
                                    <div className="flex items-center justify-end">
                                        <Button size="icon" variant="ghost" onClick={() => removeLiability(debt.id)}>
                                            <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
                <div>
                    <p className="text-sm text-zinc-400">Net Worth</p>
                    <p className={cn("text-2xl font-bold", netWorth >= 0 ? "text-white" : "text-red-400")}>
                        {currencySymbol}{netWorth.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
};
