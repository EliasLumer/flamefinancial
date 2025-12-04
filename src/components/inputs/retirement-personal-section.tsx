'use client';

import React from 'react';
import { useFlameStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormattedInput } from '@/components/ui/formatted-input';
import { SectionHeader } from '@/components/ui/section-header';
import { AccountType, TaxTreatment } from '@/types/flame';

export const RetirementPersonalSection = () => {
    const { state, updateSection, updateState } = useFlameStore();
    const { retirementPersonal, accounts } = state;

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

    const update = (field: keyof typeof retirementPersonal, value: any) => {
        updateSection('retirementPersonal', { [field]: value });

        if (field === 'rothIraBalance') {
            syncAccount('sys-personal-roth', 'Roth IRA', 'Roth IRA', 'Roth', value);
        } else if (field === 'traditionalIraBalance') {
            syncAccount('sys-personal-traditional', 'Traditional IRA', 'IRA', 'Pre-tax', value);
        }
    };

    return (
        <div className="space-y-6">
            <SectionHeader title="Personal Retirement" description="IRAs and other individual accounts." />
            
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Roth IRA</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Annual Contribution</label>
                            <FormattedInput 
                                variant="currency"
                                value={retirementPersonal.rothIraContribution} 
                                onChange={(val) => update('rothIraContribution', val)} 
                            />
                             <p className="text-xs text-zinc-500">2025 Limit: $7,000 ($8,000 if 50+)</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Current Balance</label>
                            <FormattedInput 
                                variant="currency"
                                value={retirementPersonal.rothIraBalance} 
                                onChange={(val) => update('rothIraBalance', val)} 
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Traditional IRA</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Annual Contribution</label>
                            <FormattedInput 
                                variant="currency"
                                value={retirementPersonal.traditionalIraContribution} 
                                onChange={(val) => update('traditionalIraContribution', val)} 
                            />
                            <p className="text-xs text-zinc-500">Shared limit with Roth IRA.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Current Balance</label>
                            <FormattedInput 
                                variant="currency"
                                value={retirementPersonal.traditionalIraBalance} 
                                onChange={(val) => update('traditionalIraBalance', val)} 
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
