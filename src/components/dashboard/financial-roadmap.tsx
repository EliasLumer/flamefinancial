'use client';

import React, { useState } from 'react';
import { FireReadiness } from '@/lib/engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
    CheckCircle2, 
    Circle, 
    AlertCircle,
    CreditCard,
    Shield,
    Briefcase,
    Landmark,
    PiggyBank,
    TrendingUp,
    Wallet,
    Map
} from 'lucide-react';

interface FinancialRoadmapProps {
    readiness: FireReadiness;
    currencySymbol?: string;
}

interface StepConfig {
    id: string;
    title: string;
    shortTitle: string;
    icon: React.ReactNode;
    description: string;
    getStatus: (r: FireReadiness) => 'complete' | 'partial' | 'incomplete';
    getDetail: (r: FireReadiness, currencySymbol: string) => string;
    getProgress?: (r: FireReadiness) => { current: number; target: number } | null;
}

const STEPS: StepConfig[] = [
    {
        id: 'debt',
        title: 'Eliminate High-Interest Debt',
        shortTitle: 'Debt',
        icon: <CreditCard className="h-4 w-4" />,
        description: 'Pay off debt with interest > 4-5%',
        getStatus: (r) => r.debtFree.isPaidOff ? 'complete' : 'incomplete',
        getDetail: (r, currencySymbol) => r.debtFree.isPaidOff 
            ? 'No high-interest debt!' 
            : `${currencySymbol}${r.debtFree.highInterestDebt.toLocaleString()} remaining`
    },
    {
        id: 'emergency',
        title: 'Emergency Fund',
        shortTitle: 'Emergency',
        icon: <Shield className="h-4 w-4" />,
        description: '3-6 months expenses in HYSA',
        getStatus: (r) => r.emergencyFund.has3Months ? 'complete' : r.emergencyFund.monthsCovered > 0 ? 'partial' : 'incomplete',
        getDetail: (r, currencySymbol) => `${r.emergencyFund.monthsCovered.toFixed(1)} months covered`,
        getProgress: (r) => ({ current: r.emergencyFund.currentCash, target: r.emergencyFund.target3Months })
    },
    {
        id: 'match',
        title: 'Employer Match',
        shortTitle: 'Match',
        icon: <Briefcase className="h-4 w-4" />,
        description: 'Capture full 401k employer match',
        getStatus: (r) => !r.match.hasMatchOffered 
            ? 'incomplete' 
            : r.match.gettingFullMatch ? 'complete' : 'incomplete',
        getDetail: (r, currencySymbol) => !r.match.hasMatchOffered 
            ? 'No match offered'
            : r.match.gettingFullMatch 
                ? `Getting ${currencySymbol}${Math.round(r.match.matchAmount).toLocaleString()}/yr` 
                : 'Not maximizing match'
    },
    {
        id: 'hsa',
        title: 'HSA',
        shortTitle: 'HSA',
        icon: <Landmark className="h-4 w-4" />,
        description: 'Max HSA if eligible (triple tax advantage)',
        getStatus: (r) => !r.hsa.enabled ? 'incomplete' : r.hsa.isMaxed ? 'complete' : r.hsa.currentContribution > 0 ? 'partial' : 'incomplete',
        getDetail: (r, currencySymbol) => !r.hsa.enabled ? 'Not enabled' : `${currencySymbol}${r.hsa.currentContribution.toLocaleString()} / ${currencySymbol}${r.hsa.limit.toLocaleString()}`,
        getProgress: (r) => r.hsa.enabled ? { current: r.hsa.currentContribution, target: r.hsa.limit } : null
    },
    {
        id: 'roth',
        title: 'Roth IRA',
        shortTitle: 'Roth',
        icon: <PiggyBank className="h-4 w-4" />,
        description: 'Max Roth IRA contribution',
        getStatus: (r) => r.rothIra.isMaxed ? 'complete' : r.rothIra.currentContribution > 0 ? 'partial' : 'incomplete',
        getDetail: (r, currencySymbol) => `${currencySymbol}${r.rothIra.currentContribution.toLocaleString()} / ${currencySymbol}${r.rothIra.limit.toLocaleString()}`,
        getProgress: (r) => ({ current: r.rothIra.currentContribution, target: r.rothIra.limit })
    },
    {
        id: '401k',
        title: 'Max 401k',
        shortTitle: '401k',
        icon: <TrendingUp className="h-4 w-4" />,
        description: 'Max employee 401k contribution',
        getStatus: (r) => r.work401k.isMaxed ? 'complete' : r.work401k.currentContribution > 0 ? 'partial' : 'incomplete',
        getDetail: (r, currencySymbol) => `${currencySymbol}${Math.round(r.work401k.currentContribution).toLocaleString()} / ${currencySymbol}${r.work401k.limit.toLocaleString()}`,
        getProgress: (r) => ({ current: r.work401k.currentContribution, target: r.work401k.limit })
    },
    {
        id: 'brokerage',
        title: 'Taxable Brokerage',
        shortTitle: 'Brokerage',
        icon: <Wallet className="h-4 w-4" />,
        description: 'Invest surplus in brokerage',
        getStatus: (r) => r.brokerage.hasAccount ? 'complete' : 'incomplete',
        getDetail: (r, currencySymbol) => r.brokerage.hasAccount 
            ? `${currencySymbol}${Math.round(r.brokerage.balance).toLocaleString()} balance` 
            : 'No brokerage account'
    }
];

export const FinancialRoadmap: React.FC<FinancialRoadmapProps> = ({ readiness, currencySymbol = '$' }) => {
    const [expandedStep, setExpandedStep] = useState<string | null>(null);
    
    const completedCount = STEPS.filter(s => s.getStatus(readiness) === 'complete').length;
    const progressPercent = (completedCount / STEPS.length) * 100;

    const StatusIcon = ({ status }: { status: 'complete' | 'partial' | 'incomplete' }) => {
        if (status === 'complete') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        if (status === 'partial') return <AlertCircle className="h-5 w-5 text-orange-500" />;
        return <Circle className="h-5 w-5 text-zinc-600" />;
    };

    const getStatusColor = (status: 'complete' | 'partial' | 'incomplete') => {
        if (status === 'complete') return 'border-green-500/30 bg-green-500/5';
        if (status === 'partial') return 'border-orange-500/30 bg-orange-500/5';
        return 'border-zinc-700 bg-zinc-900/30';
    };

    return (
        <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-4 border-b border-zinc-800/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Map className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Financial Roadmap</CardTitle>
                            <p className="text-xs text-zinc-500 mt-0.5">Your journey to financial independence</p>
                        </div>
                    </div>
                    <span className="text-sm text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded">
                        {completedCount}/{STEPS.length}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Compact Step Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {STEPS.map((step, idx) => {
                        const status = step.getStatus(readiness);
                        return (
                            <button
                                key={step.id}
                                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                                className={cn(
                                    "flex flex-col items-center p-2 rounded-lg border transition-all",
                                    getStatusColor(status),
                                    expandedStep === step.id && "ring-1 ring-orange-500/50"
                                )}
                                title={step.title}
                            >
                                <span className="text-xs text-zinc-500 mb-1">{idx + 1}</span>
                                <StatusIcon status={status} />
                                <span className="text-[10px] text-zinc-400 mt-1 text-center leading-tight">
                                    {step.shortTitle}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Expanded Detail */}
                {expandedStep && (
                    <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/50 space-y-3">
                        {(() => {
                            const step = STEPS.find(s => s.id === expandedStep);
                            if (!step) return null;
                            const status = step.getStatus(readiness);
                            const progress = step.getProgress?.(readiness);
                            
                            return (
                                <>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                status === 'complete' ? 'bg-green-500/10' : 
                                                status === 'partial' ? 'bg-orange-500/10' : 'bg-zinc-800'
                                            )}>
                                                {step.icon}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{step.title}</p>
                                                <p className="text-xs text-zinc-500">{step.description}</p>
                                            </div>
                                        </div>
                                        <StatusIcon status={status} />
                                    </div>
                                    
                                    {progress && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-zinc-400">Progress</span>
                                                <span className="text-zinc-300">{step.getDetail(readiness, currencySymbol)}</span>
                                            </div>
                                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div 
                                                    className={cn(
                                                        "h-full rounded-full transition-all",
                                                        status === 'complete' ? 'bg-green-500' : 'bg-orange-500'
                                                    )}
                                                    style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!progress && (
                                        <p className={cn(
                                            "text-sm",
                                            status === 'complete' ? 'text-green-400' : 
                                            status === 'partial' ? 'text-orange-400' : 'text-zinc-400'
                                        )}>
                                            {step.getDetail(readiness, currencySymbol)}
                                        </p>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

