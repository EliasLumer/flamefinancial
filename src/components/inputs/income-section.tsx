'use client';

import React from 'react';
import { useFlameStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormattedInput } from '@/components/ui/formatted-input';
import { SectionHeader } from '@/components/ui/section-header';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

export const IncomeSection = () => {
    const { state, updateSection } = useFlameStore();
    const { income, tax } = state;

    const handleSalaryChange = (value: number) => {
        updateSection('income', { salary: value });
    };

    const handleBonusChange = (value: number) => {
        updateSection('income', { bonus: value });
    };
    
    const handleBonusContribChange = (checked: boolean) => {
        updateSection('retirementWork', {
            bonusConfig: {
                contribute401k: checked
            }
        });
    };

    const handleTaxRateChange = (value: number) => {
        updateSection('tax', { effectiveRate: value });
    };
    
    const addSource = () => {
        updateSection('income', {
            additionalIncome: [
                ...income.additionalIncome,
                { id: Math.random().toString(), name: 'New Source', amount: 0, isTaxable: true }
            ]
        });
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateSource = (id: string, field: keyof typeof income.additionalIncome[0], value: any) => {
        updateSection('income', {
            additionalIncome: income.additionalIncome.map(src => 
                src.id === id ? { ...src, [field]: value } : src
            )
        });
    };
    
    const removeSource = (id: string) => {
        updateSection('income', {
            additionalIncome: income.additionalIncome.filter(src => src.id !== id)
        });
    };

    const additionalIncomeTotal = income.additionalIncome.reduce((sum, src) => sum + src.amount, 0);
    const totalGross = income.salary + income.bonus + additionalIncomeTotal;
    const totalWithoutBonus = income.salary + additionalIncomeTotal;
    const currencySymbol = state.settings?.currencySymbol || '$';
    
    const hasBonus = income.bonus > 0;
    
    // Monthly calculations
    const monthlyTotal = Math.round(totalGross / 12);
    const monthlyWithoutBonus = Math.round(totalWithoutBonus / 12);

    return (
        <div className="space-y-6">
            <SectionHeader title="Income & Taxes" description="Define your primary earning sources and tax situation." icon={DollarSign} accentColor="green" />
            
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Primary Income</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Base Salary</label>
                            <FormattedInput 
                                variant="currency"
                                value={income.salary} 
                                onChange={handleSalaryChange} 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Annual Bonus</label>
                            <FormattedInput 
                                variant="currency"
                                value={income.bonus} 
                                onChange={handleBonusChange} 
                            />
                            <div className="pt-1">
                                <Toggle
                                    label="Contribute to 401k from Bonus"
                                    checked={state.retirementWork.bonusConfig?.contribute401k || false}
                                    onCheckedChange={handleBonusContribChange}
                                />
                                <p className="text-xs text-zinc-500 mt-1 ml-2">If checked, 401k rates apply to bonus.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Taxes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Effective Tax Rate</label>
                            <FormattedInput 
                                variant="percent"
                                value={tax.effectiveRate} 
                                onChange={handleTaxRateChange} 
                                decimalScale={2}
                            />
                            <p className="text-xs text-zinc-500">Rough estimate of Federal + State + FICA.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Additional Income Streams</CardTitle>
                    <Button size="sm" onClick={addSource} variant="outline"><Plus className="h-4 w-4 mr-2"/> Add Source</Button>
                </CardHeader>
                <CardContent>
                    {income.additionalIncome.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic">No additional income sources.</p>
                    ) : (
                        <div className="space-y-4">
                            {income.additionalIncome.map(src => (
                                <div key={src.id} className="flex items-center gap-4">
                                    <Input 
                                        className="flex-1" 
                                        placeholder="Source Name" 
                                        value={src.name} 
                                        onChange={(e) => updateSource(src.id, 'name', e.target.value)} 
                                    />
                                    <div className="w-32">
                                        <FormattedInput 
                                            variant="currency"
                                            placeholder="Amount" 
                                            value={src.amount} 
                                            onChange={(val) => updateSource(src.id, 'amount', val)} 
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Toggle 
                                            checked={src.isTaxable} 
                                            onCheckedChange={(checked) => updateSource(src.id, 'isTaxable', checked)} 
                                            label="Taxable"
                                        />
                                    </div>
                                    <Button size="icon" variant="ghost" onClick={() => removeSource(src.id)}>
                                        <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            
             <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 flex justify-between items-start">
                <div>
                    <p className="text-sm text-zinc-400">Total Annual Compensation</p>
                    <p className="text-2xl font-bold text-white">{currencySymbol}{totalGross.toLocaleString()}</p>
                    {hasBonus && (
                        <p className="text-xs text-zinc-500 mt-1">
                            {currencySymbol}{totalWithoutBonus.toLocaleString()} without bonus
                        </p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-sm text-zinc-400">Monthly Compensation</p>
                    <p className="text-xl font-semibold text-zinc-200">{currencySymbol}{monthlyTotal.toLocaleString()}</p>
                    {hasBonus && (
                        <p className="text-xs text-zinc-500 mt-1">
                            {currencySymbol}{monthlyWithoutBonus.toLocaleString()} without bonus
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
