'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useFlameStore } from '@/lib/store';
import { calculateProjections, calculateFireNumbers, calculateFireReadiness } from '@/lib/engine';
import { validateAndParseState } from '@/lib/persistence';
import { AppState } from '@/types/flame';
import { ProjectionChart } from '@/components/charts/projection-chart';
import { FireControls } from '@/components/dashboard/fire-controls';
import { AgeRangeSlider } from '@/components/dashboard/age-range-slider';
import { NetWorthSection } from '@/components/dashboard/net-worth-section';
import { FinancialRoadmap } from '@/components/dashboard/financial-roadmap';
import { FinancialStats } from '@/components/dashboard/financial-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, LineChart, Pencil, Info, Check } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { useToast } from '@/components/ui/toast';

interface LoadedScenario {
    id: 'B' | 'C';
    state: AppState;
    name: string;
}

// Compare two scenarios and return differences
interface ScenarioDifference {
    field: string;
    label: string;
    values: { scenarioId: string; scenarioName: string; value: string; color: string }[];
}

function compareScenarios(
    currentState: AppState,
    scenarios: LoadedScenario[],
    currencySymbol: string
): ScenarioDifference[] {
    const differences: ScenarioDifference[] = [];
    
    const allScenarios = [
        { id: 'A', name: 'Current Plan', state: currentState, color: '#f97316' },
        ...scenarios.map(s => ({ id: s.id, name: s.name, state: s.state, color: s.id === 'B' ? '#22c55e' : '#06b6d4' }))
    ];
    
    // Helper to format currency
    const fmt = (val: number) => `${currencySymbol}${val.toLocaleString()}`;
    const fmtPct = (val: number) => `${val}%`;
    
    // Fields to compare
    const fields: { key: string; label: string; getValue: (s: AppState) => number; format: (v: number) => string }[] = [
        { key: 'salary', label: 'Annual Salary', getValue: s => s.income.salary, format: fmt },
        { key: 'bonus', label: 'Annual Bonus', getValue: s => s.income.bonus, format: fmt },
        { key: 'preTax401k', label: 'Pre-Tax 401k Rate', getValue: s => s.retirementWork.preTax401kRate, format: fmtPct },
        { key: 'roth401k', label: 'Roth 401k Rate', getValue: s => s.retirementWork.roth401kRate, format: fmtPct },
        { key: 'brokerageRate', label: 'Brokerage Savings Rate', getValue: s => s.savings.brokerageRate, format: fmtPct },
        { key: 'rent', label: 'Monthly Rent', getValue: s => s.expenses.rent, format: fmt },
        { key: 'marketReturn', label: 'Expected Market Return', getValue: s => s.assumptions.marketReturn, format: fmtPct },
        { key: 'salaryGrowth', label: 'Salary Growth Rate', getValue: s => s.assumptions.salaryGrowth, format: fmtPct },
        { key: 'targetSpending', label: 'Target Annual Spending', getValue: s => s.fire.targetAnnualSpending, format: fmt },
        { key: 'swr', label: 'Safe Withdrawal Rate', getValue: s => s.fire.safeWithdrawalRate, format: fmtPct },
        { key: 'retirementAge', label: 'Target Retirement Age', getValue: s => s.fire.retirementAge, format: v => `${v}` },
        { key: 'effectiveTax', label: 'Effective Tax Rate', getValue: s => s.tax.effectiveRate, format: fmtPct },
    ];
    
    for (const field of fields) {
        const values = allScenarios.map(s => ({
            scenarioId: s.id,
            scenarioName: s.name,
            value: field.format(field.getValue(s.state)),
            rawValue: field.getValue(s.state),
            color: s.color
        }));
        
        // Check if there are differences
        const uniqueValues = new Set(values.map(v => v.rawValue));
        if (uniqueValues.size > 1) {
            differences.push({
                field: field.key,
                label: field.label,
                values: values.map(v => ({ scenarioId: v.scenarioId, scenarioName: v.scenarioName, value: v.value, color: v.color }))
            });
        }
    }
    
    return differences;
}

export default function FireDashboardPage() {
    const { state: currentState } = useFlameStore();
    const { showToast } = useToast();
    const [showComparison, setShowComparison] = useState(false);
    const [scenarios, setScenarios] = useState<LoadedScenario[]>([]);
    const currencySymbol = currentState.settings?.currencySymbol || '$';
    
    // Age range for chart
    const [ageRange, setAgeRange] = useState<[number, number]>([
        currentState.fire.currentAge,
        Math.min(currentState.fire.retirementAge + 10, 90)
    ]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeSlot, setActiveSlot] = useState<'B' | 'C' | null>(null);
    
    // Scenario renaming state
    const [editingScenario, setEditingScenario] = useState<'B' | 'C' | null>(null);
    const [editName, setEditName] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);
    
    // Comparison info popup
    const [showDiffInfo, setShowDiffInfo] = useState(false);
    const diffPopupRef = useRef<HTMLDivElement>(null);
    
    // Handle clicks outside diff popup to close it
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (diffPopupRef.current && !diffPopupRef.current.contains(e.target as Node)) {
                setShowDiffInfo(false);
            }
        };
        if (showDiffInfo) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDiffInfo]);
    
    // Calculate scenario differences
    const scenarioDifferences = useMemo(() => {
        if (scenarios.length === 0) return [];
        return compareScenarios(currentState, scenarios, currencySymbol);
    }, [currentState, scenarios, currencySymbol]);
    
    // Start editing a scenario name
    const startEditingScenario = (id: 'B' | 'C') => {
        const scenario = scenarios.find(s => s.id === id);
        if (scenario) {
            setEditingScenario(id);
            setEditName(scenario.name);
            setTimeout(() => editInputRef.current?.focus(), 0);
        }
    };
    
    // Save edited scenario name
    const saveScenarioName = () => {
        if (editingScenario && editName.trim()) {
            setScenarios(prev => prev.map(s => 
                s.id === editingScenario ? { ...s, name: editName.trim() } : s
            ));
        }
        setEditingScenario(null);
        setEditName('');
    };
    
    // Cancel editing
    const cancelEditing = () => {
        setEditingScenario(null);
        setEditName('');
    };
    
    // Check if two states are essentially identical (for key financial fields)
    const areStatesIdentical = (a: AppState, b: AppState): boolean => {
        // Compare the key fields that affect projections
        const fieldsToCompare = [
            a.income.salary === b.income.salary,
            a.income.bonus === b.income.bonus,
            a.tax.effectiveRate === b.tax.effectiveRate,
            a.retirementWork.preTax401kRate === b.retirementWork.preTax401kRate,
            a.retirementWork.roth401kRate === b.retirementWork.roth401kRate,
            a.retirementWork.afterTax401kRate === b.retirementWork.afterTax401kRate,
            a.retirementWork.currentPreTaxBalance === b.retirementWork.currentPreTaxBalance,
            a.retirementWork.currentRothBalance === b.retirementWork.currentRothBalance,
            a.savings.brokerageRate === b.savings.brokerageRate,
            a.savings.brokerageBalance === b.savings.brokerageBalance,
            a.retirementPersonal.rothIraContribution === b.retirementPersonal.rothIraContribution,
            a.retirementPersonal.rothIraBalance === b.retirementPersonal.rothIraBalance,
            a.expenses.rent === b.expenses.rent,
            a.assumptions.marketReturn === b.assumptions.marketReturn,
            a.assumptions.salaryGrowth === b.assumptions.salaryGrowth,
            a.assumptions.inflation === b.assumptions.inflation,
            a.fire.currentAge === b.fire.currentAge,
            a.fire.retirementAge === b.fire.retirementAge,
            a.fire.targetAnnualSpending === b.fire.targetAnnualSpending,
            a.fire.safeWithdrawalRate === b.fire.safeWithdrawalRate,
        ];
        return fieldsToCompare.every(match => match);
    };

    // Compute Current Plan (A)
    const projectionA = useMemo(() => calculateProjections(currentState), [currentState]);
    const fireNumbersA = useMemo(() => calculateFireNumbers(currentState), [currentState]);
    const readiness = useMemo(() => calculateFireReadiness(currentState), [currentState]);

    // Calculate FIRE age (when investable assets cross FIRE number)
    const fireAge = useMemo(() => {
        const point = projectionA.find(p => p.investableAssets >= fireNumbersA.fireNumber);
        return point ? point.age : null;
    }, [projectionA, fireNumbersA.fireNumber]);

    // Compute Scenarios
    const scenarioData = useMemo(() => {
        const base = [{
            id: 'A',
            name: 'Current Plan',
            color: '#f97316', // Orange
            data: projectionA,
            fireNumber: fireNumbersA.fireNumber
        }];

        if (showComparison) {
            scenarios.forEach(s => {
                base.push({
                    id: s.id,
                    name: s.name,
                    color: s.id === 'B' ? '#22c55e' : '#06b6d4', // Green, Cyan
                    data: calculateProjections(s.state),
                    fireNumber: calculateFireNumbers(s.state).fireNumber
                });
            });
        }
        return base;
    }, [projectionA, fireNumbersA, showComparison, scenarios]);

    // File handling
    const handleLoadScenario = (slot: 'B' | 'C') => {
        setActiveSlot(slot);
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeSlot) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const { valid, data, error } = validateAndParseState(content);
            
            if (valid && data) {
                // Check if this scenario is identical to current plan
                if (areStatesIdentical(currentState, data)) {
                    showToast({
                        type: 'warning',
                        title: 'Duplicate Scenario Detected',
                        message: `"${data.metadata.planName || 'Scenario'}" has identical values to your Current Plan.\n\nTry loading a scenario with different income, expenses, or growth assumptions.`
                    });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    setActiveSlot(null);
                    return;
                }
                
                // Check if this scenario is identical to any already loaded scenario
                const duplicateScenario = scenarios.find(s => s.id !== activeSlot && areStatesIdentical(s.state, data));
                if (duplicateScenario) {
                    showToast({
                        type: 'warning',
                        title: 'Duplicate Scenario Detected',
                        message: `"${data.metadata.planName || 'Scenario'}" has identical values to "${duplicateScenario.name}".`
                    });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    setActiveSlot(null);
                    return;
                }
                
                const newScenario: LoadedScenario = {
                    id: activeSlot,
                    state: data,
                    name: data.metadata.planName || `Scenario ${activeSlot}`
                };
                setScenarios(prev => [...prev.filter(s => s.id !== activeSlot), newScenario]);
            } else {
                showToast({
                    type: 'error',
                    title: 'Failed to Load Scenario',
                    message: error || 'Unknown error occurred'
                });
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
            setActiveSlot(null);
        };
        reader.readAsText(file);
    };

    const removeScenario = (id: 'B' | 'C') => {
        setScenarios(prev => prev.filter(s => s.id !== id));
    };

    // Update age range when current age changes
    React.useEffect(() => {
        const minAge = currentState.fire.currentAge;
        const maxAge = Math.min(currentState.fire.retirementAge + 10, 90);
        setAgeRange([minAge, maxAge]);
    }, [currentState.fire.currentAge, currentState.fire.retirementAge]);

    return (
        <div className="space-y-8 pb-20">
            {/* Header - Consistent with other pages */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">FIRE Dashboard</h1>
                    <p className="text-zinc-400">Track your progress towards financial independence.</p>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
                    <span className="text-sm font-medium text-zinc-300 mr-2">Compare Scenarios</span>
                    <Toggle checked={showComparison} onCheckedChange={setShowComparison} />
                </div>
            </div>

            {/* Scenario Manager - Shows when comparison mode is on */}
            {showComparison && (
                <Card className="relative overflow-hidden border-zinc-800 bg-zinc-900/50">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 to-amber-400" />
                    <CardHeader className="pb-3 pt-5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                                Scenario Manager
                            </CardTitle>
                            {/* Info button for scenario comparison */}
                            {scenarios.length > 0 && (
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowDiffInfo(!showDiffInfo)}
                                        className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none p-1 rounded hover:bg-zinc-800"
                                        title="View differences between scenarios"
                                    >
                                        <Info className="h-4 w-4" />
                                    </button>
                                    
                                    {/* Differences Popup */}
                                    {showDiffInfo && (
                                        <div ref={diffPopupRef} className="absolute top-full right-0 mt-2 w-96 max-w-[90vw] bg-zinc-950 border border-zinc-800 p-4 rounded-lg shadow-2xl z-50">
                                            <div className="flex justify-between items-start mb-3">
                                                <p className="text-sm font-semibold text-zinc-200">Scenario Differences</p>
                                                <button onClick={() => setShowDiffInfo(false)} className="text-zinc-500 hover:text-zinc-300">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                            
                                            {scenarioDifferences.length === 0 ? (
                                                <p className="text-xs text-zinc-400">All scenarios have identical values for key fields.</p>
                                            ) : (
                                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                                    {scenarioDifferences.slice(0, 8).map((diff) => (
                                                        <div key={diff.field} className="text-xs">
                                                            <div className="font-medium text-zinc-300 mb-1">{diff.label}</div>
                                                            <div className="grid gap-1">
                                                                {diff.values.map((v) => (
                                                                    <div key={v.scenarioId} className="flex items-center gap-2 pl-2">
                                                                        <div 
                                                                            className="w-2 h-2 rounded-full shrink-0" 
                                                                            style={{ backgroundColor: v.color }}
                                                                        />
                                                                        <span className="text-zinc-400 truncate flex-1">{v.scenarioName}:</span>
                                                                        <span className="font-mono text-zinc-200">{v.value}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {scenarioDifferences.length > 8 && (
                                                <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
                                                    +{scenarioDifferences.length - 8} more differences...
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".json" 
                            onChange={handleFileChange} 
                        />
                        <div className="grid gap-4 md:grid-cols-3">
                            {/* Scenario A */}
                            <div className="p-3 rounded border border-orange-500/30 bg-orange-500/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                    <span className="font-medium text-orange-200">Current Plan</span>
                                </div>
                                <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">Active</span>
                            </div>

                            {/* Scenario B */}
                            {scenarios.find(s => s.id === 'B') ? (
                                <div className="p-3 rounded border border-green-500/30 bg-green-500/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-3 h-3 rounded-full bg-green-500 shrink-0"></div>
                                        {editingScenario === 'B' ? (
                                            <div className="flex items-center gap-1 flex-1">
                                                <input
                                                    ref={editInputRef}
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveScenarioName();
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    onBlur={saveScenarioName}
                                                    className="bg-zinc-900 border border-green-500/50 rounded px-2 py-0.5 text-sm text-green-200 w-full focus:outline-none focus:border-green-400"
                                                />
                                                <button onClick={saveScenarioName} className="text-green-400 hover:text-green-300 shrink-0">
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-medium text-green-200 truncate">{scenarios.find(s => s.id === 'B')?.name}</span>
                                                <button 
                                                    onClick={() => startEditingScenario('B')} 
                                                    className="text-zinc-500 hover:text-green-300 shrink-0 ml-1"
                                                    title="Rename scenario"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-red-400 shrink-0" onClick={() => removeScenario('B')}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="outline" className="border-dashed text-zinc-500 hover:text-zinc-300 h-full min-h-[52px]" onClick={() => handleLoadScenario('B')}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Scenario B
                                </Button>
                            )}

                            {/* Scenario C */}
                            {scenarios.find(s => s.id === 'C') ? (
                                <div className="p-3 rounded border border-cyan-500/30 bg-cyan-500/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-3 h-3 rounded-full bg-cyan-500 shrink-0"></div>
                                        {editingScenario === 'C' ? (
                                            <div className="flex items-center gap-1 flex-1">
                                                <input
                                                    ref={editInputRef}
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveScenarioName();
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    onBlur={saveScenarioName}
                                                    className="bg-zinc-900 border border-cyan-500/50 rounded px-2 py-0.5 text-sm text-cyan-200 w-full focus:outline-none focus:border-cyan-400"
                                                />
                                                <button onClick={saveScenarioName} className="text-cyan-400 hover:text-cyan-300 shrink-0">
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-medium text-cyan-200 truncate">{scenarios.find(s => s.id === 'C')?.name}</span>
                                                <button 
                                                    onClick={() => startEditingScenario('C')} 
                                                    className="text-zinc-500 hover:text-cyan-300 shrink-0 ml-1"
                                                    title="Rename scenario"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-red-400 shrink-0" onClick={() => removeScenario('C')}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="outline" className="border-dashed text-zinc-500 hover:text-zinc-300 h-full min-h-[52px]" onClick={() => handleLoadScenario('C')}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Scenario C
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-3">
                            Load exported .json files to compare different financial scenarios side-by-side.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Main Content Grid: Chart + Controls */}
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                {/* Chart Section */}
                <div className="space-y-4">
                    {/* Chart Header with Age Range */}
                    <Card className="border-zinc-800 bg-zinc-900/50">
                        <CardHeader className="pb-3 border-b border-zinc-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                    <LineChart className="h-5 w-5 text-orange-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Wealth Projection</CardTitle>
                                    <p className="text-xs text-zinc-500 mt-0.5">Adjust the age range to explore your timeline</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <AgeRangeSlider
                                minAge={currentState.fire.currentAge}
                                maxAge={90}
                                value={ageRange}
                                onChange={setAgeRange}
                            />
                        </CardContent>
                    </Card>

                    {/* Chart */}
                    <ProjectionChart 
                        scenarios={scenarioData} 
                        fireTarget={fireNumbersA.fireNumber}
                        ageRange={ageRange}
                        fireAge={fireAge}
                        currencySymbol={currencySymbol}
                    />
                </div>

                {/* Sidebar: FIRE Controls */}
                <div className="space-y-6">
                    <FireControls fireNumber={fireNumbersA.fireNumber} fireAge={fireAge} />
                </div>
            </div>

            {/* Financial Snapshot - Key Stats */}
            <FinancialStats />

            {/* Lower Section: Net Worth & Roadmap */}
            <div className="border-t border-zinc-800 pt-8">
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Net Worth Overview */}
                    <NetWorthSection />
                    
                    {/* Financial Roadmap */}
                    <FinancialRoadmap readiness={readiness} currencySymbol={currencySymbol} />
                </div>
            </div>
        </div>
    );
}
