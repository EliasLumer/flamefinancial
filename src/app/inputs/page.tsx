'use client';

import React, { useRef, useState } from 'react';
import { useFlameStore } from '@/lib/store';
import { downloadStateAsJson, validateAndParseState } from '@/lib/persistence';
import { Button } from '@/components/ui/button';
import { Download, Upload, RotateCcw, X } from 'lucide-react';
import { IncomeSection } from '@/components/inputs/income-section';
import { RetirementWorkSection } from '@/components/inputs/retirement-work-section';
import { RetirementPersonalSection } from '@/components/inputs/retirement-personal-section';
import { Hsa529Section } from '@/components/inputs/hsa-529-section';
import { SavingsSection } from '@/components/inputs/savings-section';
import { ExpensesSection } from '@/components/inputs/expenses-section';
import { AssetsLiabilitiesSection } from '@/components/inputs/assets-liabilities-section';
import { GrowthSection } from '@/components/inputs/growth-section';
import { BudgetTracker } from '@/components/inputs/budget-tracker';
import { useToast } from '@/components/ui/toast';
import { SectionWrapper } from '@/components/ui/section-header';

export default function InputsPage() {
    const { state, replaceState, resetState } = useFlameStore();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Export modal state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportName, setExportName] = useState('');
    
    // Confirm modal state
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ show: false, title: '', message: '', onConfirm: () => {} });

    const handleExport = () => {
        setExportName(state.metadata.planName || 'My Flame Plan');
        setShowExportModal(true);
    };
    
    const confirmExport = () => {
        const name = exportName.trim() || 'My Flame Plan';
        downloadStateAsJson(state, name);
        setShowExportModal(false);
        setExportName('');
        showToast({
            type: 'success',
            title: 'Plan Exported',
            message: `"${name}" has been downloaded.`
        });
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const { valid, data, error } = validateAndParseState(content);
            
            if (valid && data) {
                const planName = data.metadata.planName || 'Unknown';
                setConfirmModal({
                    show: true,
                    title: 'Import Plan',
                    message: `Import "${planName}"? This will overwrite your current settings.`,
                    onConfirm: () => {
                        replaceState(data);
                        showToast({
                            type: 'success',
                            title: 'Plan Imported',
                            message: `"${planName}" has been loaded successfully.`
                        });
                    }
                });
            } else {
                showToast({
                    type: 'error',
                    title: 'Import Failed',
                    message: error || 'Unknown error occurred'
                });
            }
            
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        setConfirmModal({
            show: true,
            title: 'Reset All Data',
            message: 'Are you sure you want to reset all data to defaults? This cannot be undone.',
            onConfirm: () => {
                resetState();
                showToast({
                    type: 'info',
                    title: 'Data Reset',
                    message: 'All settings have been reset to defaults.'
                });
            }
        });
    };
    
    const closeConfirmModal = () => {
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
    };

    return (
        <>
            <div className="space-y-8 pb-32">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Control Panel</h1>
                        <p className="text-zinc-400">Configure your financial simulation parameters.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".json" 
                            onChange={handleFileChange} 
                        />
                        <Button variant="outline" size="sm" onClick={handleImportClick}>
                            <Upload className="h-4 w-4 mr-2" /> Import
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" /> Export
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleReset} className="text-red-400 hover:text-red-300 hover:bg-red-950/30">
                            <RotateCcw className="h-4 w-4 mr-2" /> Reset
                        </Button>
                    </div>
                </div>

                {/* Income Section */}
                <SectionWrapper accentColor="green">
                    <IncomeSection />
                </SectionWrapper>

                {/* Work Retirement Section */}
                <SectionWrapper accentColor="blue">
                    <RetirementWorkSection />
                </SectionWrapper>

                {/* Personal Retirement Section */}
                <SectionWrapper accentColor="purple">
                    <RetirementPersonalSection />
                </SectionWrapper>

                {/* HSA & 529 Section */}
                <SectionWrapper accentColor="cyan">
                    <Hsa529Section />
                </SectionWrapper>

                {/* Savings Section */}
                <SectionWrapper accentColor="emerald">
                    <SavingsSection />
                </SectionWrapper>

                {/* Expenses Section */}
                <SectionWrapper accentColor="rose">
                    <ExpensesSection />
                </SectionWrapper>

                {/* Assets & Liabilities Section */}
                <SectionWrapper accentColor="amber">
                    <AssetsLiabilitiesSection />
                </SectionWrapper>

                {/* Growth Assumptions Section */}
                <SectionWrapper accentColor="orange">
                    <GrowthSection />
                </SectionWrapper>
            </div>
            
            <BudgetTracker position="floating-bottom" />
            {/* <BudgetTracker position="sidebar" /> */}
            
            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Export Plan</h3>
                            <button 
                                onClick={() => setShowExportModal(false)} 
                                className="text-zinc-400 hover:text-zinc-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-zinc-400 mb-4">
                            Name your plan for easy identification when comparing scenarios.
                        </p>
                        <input
                            type="text"
                            value={exportName}
                            onChange={(e) => setExportName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && confirmExport()}
                            placeholder="e.g., Aggressive Savings, Conservative..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 mb-4"
                            autoFocus
                        />
                        <div className="flex gap-3 justify-end">
                            <Button variant="ghost" onClick={() => setShowExportModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={confirmExport} className="bg-orange-600 hover:bg-orange-500">
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Confirm Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                        <h3 className="text-lg font-semibold text-white mb-2">{confirmModal.title}</h3>
                        <p className="text-sm text-zinc-400 mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="ghost" onClick={closeConfirmModal}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={() => { confirmModal.onConfirm(); closeConfirmModal(); }}
                                className="bg-orange-600 hover:bg-orange-500"
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
