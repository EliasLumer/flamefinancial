'use client';

import React from 'react';
import { useFlameStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormattedInput } from '@/components/ui/formatted-input';
import { SectionHeader } from '@/components/ui/section-header';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Info, HeartPulse } from 'lucide-react';
import { AccountType, TaxTreatment } from '@/types/flame';

export const Hsa529Section = () => {
    const { state, updateSection, updateState } = useFlameStore();
    const { hsa, education529, accounts } = state;

     // Helper to sync balance to Accounts list
     const syncAccount = (id: string, name: string, type: AccountType, taxTreatment: TaxTreatment, balance: number) => {
        const existingAccount = accounts.find(a => a.id === id);
        
        let newAccounts = accounts;
        if (existingAccount) {
            newAccounts = accounts.map(a => a.id === id ? { ...a, balance } : a);
        } else if (balance > 0) {
            // Only create if balance > 0
             newAccounts = [
                ...accounts,
                { id, name, type, balance, taxTreatment }
            ];
        }

        if (newAccounts !== accounts) {
            updateState({ accounts: newAccounts });
        }
    };

    // Also remove account if plan/item is removed
    const removeAccount = (id: string) => {
        const newAccounts = accounts.filter(a => a.id !== id);
        if (newAccounts.length !== accounts.length) {
            updateState({ accounts: newAccounts });
        }
    }

    const updateHsa = (field: keyof typeof hsa, value: any) => {
        updateSection('hsa', { [field]: value });
        
        if (field === 'currentBalance') {
            syncAccount('sys-hsa', 'HSA', 'HSA', 'Pre-tax', value);
        }
    };

    const add529 = () => {
        updateSection('education529', {
            enabled: true,
            plans: [
                ...education529.plans,
                { id: Math.random().toString(), name: 'New Plan', currentBalance: 0, annualContribution: 0 }
            ]
        });
    };

    const update529Plan = (id: string, field: string, value: any) => {
        const plan = education529.plans.find(p => p.id === id);
        const newPlans = education529.plans.map(p => p.id === id ? { ...p, [field]: value } : p);
        
        updateSection('education529', { plans: newPlans });

        // Sync with accounts
        // We need a stable ID for the account. We can prefix the plan ID.
        // If we are updating balance or name, we sync.
        if (plan) {
            const accountId = `sys-529-${id}`;
            const name = field === 'name' ? value : plan.name;
            const balance = field === 'currentBalance' ? value : plan.currentBalance;
            
            // Only sync if we have a balance or are updating balance
            if (field === 'currentBalance' || (field === 'name' && plan.currentBalance > 0)) {
                 syncAccount(accountId, `529 - ${name}`, '529', 'After-tax', balance);
            }
        }
    };

    const remove529 = (id: string) => {
        updateSection('education529', {
            plans: education529.plans.filter(p => p.id !== id)
        });
        removeAccount(`sys-529-${id}`);
    };

    return (
        <div className="space-y-6">
            <SectionHeader title="HSA & Education" description="Health Savings Accounts and 529 plans." icon={HeartPulse} accentColor="cyan" />
            
            {/* HSA Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Health Savings Account (HSA)</CardTitle>
                    <Toggle 
                        label="Enable"
                        checked={hsa.enabled} 
                        onCheckedChange={(c) => updateHsa('enabled', c)} 
                    />
                </CardHeader>
                {hsa.enabled && (
                    <CardContent className="space-y-4 border-t border-zinc-800 pt-4">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Current Balance</label>
                                <FormattedInput 
                                    variant="currency"
                                    value={hsa.currentBalance} 
                                    onChange={(val) => updateHsa('currentBalance', val)} 
                                />
                            </div>
                             {/* Placeholder for alignment or 4th element */}
                            <div className="hidden md:block"></div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Employee Contribution (/yr)</label>
                                <FormattedInput 
                                    variant="currency"
                                    value={hsa.employeeContribution} 
                                    onChange={(val) => updateHsa('employeeContribution', val)} 
                                />
                                <p className="text-xs text-zinc-500">Reduces taxable income.</p>
                            </div>

                             <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Employer Contribution (/yr)</label>
                                <FormattedInput 
                                    variant="currency"
                                    value={hsa.employerContribution} 
                                    onChange={(val) => updateHsa('employerContribution', val)} 
                                />
                            </div>
                        </div>

                        {/* Limit Info Box */}
                        <div className="mt-4 bg-zinc-900/50 border border-zinc-800 rounded-md p-3 flex gap-3">
                            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                            <div className="space-y-1 text-sm">
                                <p className="font-medium text-zinc-200">2025 Contribution Limits</p>
                                <p className="text-zinc-400">
                                    Self-only: <span className="text-zinc-200">$4,300</span> | 
                                    Family: <span className="text-zinc-200">$8,550</span> | 
                                    55+ Catch-up: <span className="text-zinc-200">+$1,000</span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* 529 Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>529 Education Plans</CardTitle>
                    <div className="flex items-center gap-4">
                        <Toggle 
                            label="Enable"
                            checked={education529.enabled} 
                            onCheckedChange={(c) => updateSection('education529', { enabled: c })} 
                        />
                         {education529.enabled && (
                            <Button size="sm" variant="outline" onClick={add529} className="h-8">
                                <Plus className="h-4 w-4 mr-1.5"/> Add Plan
                            </Button>
                        )}
                    </div>
                </CardHeader>
                 {education529.enabled && (
                    <CardContent className="space-y-4 border-t border-zinc-800 pt-4">
                        {education529.plans.length === 0 ? (
                            <div className="text-center py-6 text-zinc-500 bg-zinc-950/30 rounded-md border border-zinc-800 border-dashed">
                                <p>No 529 plans added yet.</p>
                                <Button variant="link" onClick={add529} className="mt-2 text-orange-500">Add a plan</Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {education529.plans.map((plan) => (
                                    <div key={plan.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-zinc-950/30 rounded-md border border-zinc-800 items-end">
                                        <div className="md:col-span-4 space-y-2">
                                            <label className="text-xs font-medium text-zinc-400">Plan / Beneficiary Name</label>
                                            <Input 
                                                value={plan.name} 
                                                onChange={(e) => update529Plan(plan.id, 'name', e.target.value)} 
                                                placeholder="e.g. Child 1"
                                            />
                                        </div>
                                        <div className="md:col-span-3 space-y-2">
                                            <label className="text-xs font-medium text-zinc-400">Current Balance</label>
                                            <FormattedInput 
                                                variant="currency"
                                                value={plan.currentBalance} 
                                                onChange={(val) => update529Plan(plan.id, 'currentBalance', val)} 
                                            />
                                        </div>
                                        <div className="md:col-span-3 space-y-2">
                                            <label className="text-xs font-medium text-zinc-400">Annual Contribution</label>
                                            <FormattedInput 
                                                variant="currency"
                                                value={plan.annualContribution} 
                                                onChange={(val) => update529Plan(plan.id, 'annualContribution', val)} 
                                            />
                                        </div>
                                         <div className="md:col-span-2 flex justify-end md:justify-center pb-1">
                                            <Button size="sm" variant="ghost" onClick={() => remove529(plan.id)} className="text-zinc-400 hover:text-red-500 hover:bg-red-500/10">
                                                <Trash2 className="h-4 w-4 mr-2 md:mr-0" />
                                                <span className="md:hidden">Remove</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div className="mt-4 bg-zinc-900/50 border border-zinc-800 rounded-md p-3 flex gap-3">
                            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                            <div className="space-y-1 text-sm">
                                <p className="font-medium text-zinc-200">Contribution Rules</p>
                                <p className="text-zinc-400">
                                    Contributions are post-tax federal (some states offer deductions). 
                                    Gift tax exclusion: <span className="text-zinc-200">$19,000</span>/yr per beneficiary (2025).
                                </p>
                            </div>
                        </div>
                    </CardContent>
                 )}
            </Card>
        </div>
    );
};
