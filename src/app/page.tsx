'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useFlameStore } from '@/lib/store';
import { calculateCashFlow, calculateFireNumbers, calculateProjections } from '@/lib/engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    ArrowRight, 
    Target, 
    Flame,
    TrendingUp,
    ArrowRightLeft,
    SlidersHorizontal,
    BookOpen,
    Zap,
    PiggyBank,
    DollarSign,
    Coffee
} from 'lucide-react';
import { BmcButton } from '@/components/bmc-button';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    ResponsiveContainer,
    ReferenceLine,
    Area,
    AreaChart,
    Tooltip
} from 'recharts';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';

// FIRE Strategy Type
type FireStrategy = 'lean' | 'regular' | 'fat';

const STRATEGY_CONFIG: Record<FireStrategy, { spending: number; label: string; color: string; swr: number }> = {
    lean: { spending: 40000, label: 'Lean FIRE', color: '#22c55e', swr: 4 },
    regular: { spending: 60000, label: 'Regular FIRE', color: '#f97316', swr: 4 },
    fat: { spending: 100000, label: 'Fat FIRE', color: '#8b5cf6', swr: 4 },
};

// Mini Sankey Component for Homepage
const MiniSankey: React.FC<{ data: ReturnType<typeof calculateCashFlow> }> = ({ data }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 400, height: 280 });

    useEffect(() => {
        const updateDimensions = () => {
            if (svgRef.current?.parentElement) {
                const rect = svgRef.current.parentElement.getBoundingClientRect();
                setDimensions({ width: rect.width, height: 280 });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        if (!svgRef.current || dimensions.width === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const { width, height } = dimensions;
        const margin = { top: 20, right: 10, bottom: 20, left: 10 };

        // Simplified nodes for mini view
        const nodes = [
            { name: 'Income', category: 'Income' },
            { name: 'Taxes', category: 'Tax' },
            { name: 'Savings', category: 'Savings' },
            { name: 'Expenses', category: 'Expense' },
        ];

        const totalSavings = data.preTax401k + data.roth401k + data.rothIra + data.brokerageContribution + data.hsaContribution;
        const totalExpenses = data.fixedExpenses + data.variableExpenses + data.debtPayments;

        const links = [
            { source: 0, target: 1, value: data.taxes },
            { source: 0, target: 2, value: totalSavings },
            { source: 0, target: 3, value: totalExpenses },
        ].filter(l => l.value > 0);

        const NODE_COLORS: Record<string, string> = {
            'Income': '#22c55e',
            'Tax': '#ef4444',
            'Savings': '#8b5cf6',
            'Expense': '#64748b',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sankeyGenerator = d3Sankey<any, any>()
            .nodeWidth(12)
            .nodePadding(16)
            .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

        const graph = sankeyGenerator({
            nodes: nodes.map(d => Object.assign({}, d)),
            links: links.map(d => Object.assign({}, d))
        });

        // Links
        svg.append("g")
            .attr("fill", "none")
            .attr("stroke-opacity", 0.4)
            .selectAll("path")
            .data(graph.links)
            .join("path")
            .attr("d", sankeyLinkHorizontal())
            .attr("stroke", d => NODE_COLORS[d.target.category] || "#64748b")
            .attr("stroke-width", d => Math.max(1, d.width || 0))
            .style("transition", "all 0.3s");

        // Nodes
        const node = svg.append("g")
            .selectAll("g")
            .data(graph.nodes)
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        node.append("rect")
            .attr("height", d => Math.max(0, (d.y1 || 0) - (d.y0 || 0)))
            .attr("width", d => Math.max(0, (d.x1 || 0) - (d.x0 || 0)))
            .attr("fill", d => NODE_COLORS[d.category || ''] || '#94a3b8')
            .attr("rx", 2);

        // Labels
        node.append("text")
            .attr("x", d => (d.x0 || 0) < width / 2 ? 18 : -6)
            .attr("y", d => ((d.y1 || 0) - (d.y0 || 0)) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => (d.x0 || 0) < width / 2 ? "start" : "end")
            .text(d => d.name)
            .attr("fill", "#e2e8f0")
            .attr("font-size", "11px")
            .attr("font-weight", "500");

    }, [data, dimensions]);

    return (
        <div className="w-full h-[280px]">
            <svg ref={svgRef} width="100%" height="100%" />
        </div>
    );
};

// Mini Projection Chart with Strategy Comparison
const StrategyComparisonChart: React.FC<{
    strategy: FireStrategy;
    currentAge: number;
    retirementAge: number;
    savingsRate: number;
    income: number;
}> = ({ strategy, currentAge, retirementAge, savingsRate, income }) => {
    const config = STRATEGY_CONFIG[strategy];
    const fireNumber = config.spending / (config.swr / 100);

    // Generate simple projection data
    const projectionData = useMemo(() => {
        const data = [];
        let balance = 0;
        const annualSavings = income * (savingsRate / 100);
        const returnRate = 0.07;

        for (let age = currentAge; age <= Math.min(retirementAge + 15, 70); age++) {
            if (age < retirementAge) {
                balance = balance * (1 + returnRate) + annualSavings;
            } else {
                balance = balance * (1 + returnRate) - config.spending;
            }
            data.push({
                age,
                value: Math.max(0, balance),
                fireNumber
            });
        }
        return data;
    }, [currentAge, retirementAge, savingsRate, income, config.spending, fireNumber]);

    // Find FIRE age
    const fireAge = projectionData.find(p => p.value >= fireNumber)?.age || null;

    const formatCurrency = (val: number, symbol: string = '$') => {
        if (val >= 1000000) return `${symbol}${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${symbol}${(val / 1000).toFixed(0)}k`;
        return `${symbol}${val}`;
    };

    return (
        <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`gradient-${strategy}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={config.color} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={config.color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis 
                        dataKey="age" 
                        stroke="#64748b" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis 
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={formatCurrency}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                    />
                    <Tooltip
                        contentStyle={{ 
                            backgroundColor: '#18181b', 
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Portfolio']}
                        labelFormatter={(age) => `Age ${age}`}
                    />
                    <ReferenceLine 
                        y={fireNumber} 
                        stroke={config.color} 
                        strokeDasharray="4 4" 
                        strokeOpacity={0.6}
                    />
                    {fireAge && (
                        <ReferenceLine 
                            x={fireAge} 
                            stroke="#22c55e" 
                            strokeDasharray="4 4"
                            strokeOpacity={0.8}
                        />
                    )}
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={config.color}
                        strokeWidth={2}
                        fill={`url(#gradient-${strategy})`}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default function HomePage() {
    const { state } = useFlameStore();
    const { retirementWork, retirementPersonal, income, fire, settings } = state;
    const currencySymbol = settings?.currencySymbol || '$';

    // Strategy selector state
    const [selectedStrategy, setSelectedStrategy] = useState<FireStrategy>('regular');
    const [demoSavingsRate, setDemoSavingsRate] = useState(30);
    const [demoIncome, setDemoIncome] = useState(100000);

    // Calculate real user's FIRE stats
    const fireNumbers = useMemo(() => calculateFireNumbers(state), [state]);
    const cashFlow = useMemo(() => calculateCashFlow(state), [state]);
    const projections = useMemo(() => calculateProjections(state), [state]);
    
    // Calculate user's savings rate
    const totalSavings = cashFlow.preTax401k + cashFlow.roth401k + cashFlow.rothIra + 
                         cashFlow.brokerageContribution + cashFlow.hsaContribution + cashFlow.megaBackdoorRoth;
    const savingsRate = cashFlow.grossIncome > 0 ? (totalSavings / cashFlow.grossIncome) * 100 : 0;

    // Find user's projected FIRE age
    const userFireAge = projections.find(p => p.investableAssets >= fireNumbers.fireNumber)?.age || null;

    // Next Action Heuristic (simplified)
    const nextAction = useMemo(() => {
        const current401kRate = retirementWork.preTax401kRate + retirementWork.roth401kRate;
        const matchLimit = retirementWork.employerMatch.matchLimit;
        const matchRatio = retirementWork.employerMatch.matchRatio;
        
        if (matchRatio > 0 && current401kRate < matchLimit) {
            return {
                title: "Capture Employer Match",
                description: `Contributing ${current401kRate}% → Match up to ${matchLimit}%`,
                link: '/inputs',
                label: 'Adjust 401k'
            };
        }

        const rothIraLimit = 7000;
        if (retirementPersonal.rothIraContribution < rothIraLimit) {
            return {
                title: "Max Roth IRA",
                description: `${currencySymbol}${retirementPersonal.rothIraContribution.toLocaleString()} of ${currencySymbol}${rothIraLimit.toLocaleString()}`,
                link: '/inputs',
                label: 'Update IRA'
            };
        }
        
        return {
            title: "Explore Advanced Strategies",
            description: "Mega-backdoor Roth, Tax-loss harvesting",
            link: '/learn',
            label: 'Learn More'
        };
    }, [retirementWork, retirementPersonal, currencySymbol]);

    const strategyConfig = STRATEGY_CONFIG[selectedStrategy];
    const demoFireNumber = strategyConfig.spending / (strategyConfig.swr / 100);

    return (
        <div className="space-y-10 pb-20">
            {/* Hero Section */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-950/20 border border-zinc-800 p-8 md:p-12">
                <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600/5 rounded-full blur-2xl -ml-32 -mb-32" />
                
                <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">
                    <div className="flex-1 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium">
                            <Flame className="h-4 w-4" />
                            Flame Financial
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                            Automate Your <br />
                            <span className="text-orange-500">Financial Freedom.</span>
                        </h1>
                        
                        <p className="text-lg text-zinc-400 max-w-xl">
                            Visualize your path to financial independence. Simulate different FIRE strategies, compare scenarios, and track your cash flow with powerful interactive charts.
                        </p>
                        
                        <div className="flex flex-wrap gap-4">
                            <Link href="/inputs">
                                <Button size="lg" className="bg-orange-600 hover:bg-orange-500 text-white font-semibold">
                                    Start Planning <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="/dashboard">
                                <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                                    View Dashboard
                                </Button>
                            </Link>
                        </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="flex-shrink-0 grid grid-cols-2 gap-4 w-full lg:w-auto">
                        <div className="bg-zinc-800/50 backdrop-blur rounded-xl p-4 border border-zinc-700/50 text-center">
                            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Your FIRE Number</p>
                            <p className="text-2xl md:text-3xl font-bold text-orange-500">
                                {currencySymbol}{(fireNumbers.fireNumber / 1000000).toFixed(1)}M
                            </p>
                        </div>
                        <div className="bg-zinc-800/50 backdrop-blur rounded-xl p-4 border border-zinc-700/50 text-center">
                            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Projected FIRE Age</p>
                            <p className="text-2xl md:text-3xl font-bold text-green-500">
                                {userFireAge ? userFireAge : '—'}
                            </p>
                        </div>
                        <div className="bg-zinc-800/50 backdrop-blur rounded-xl p-4 border border-zinc-700/50 text-center">
                            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Savings Rate</p>
                            <p className="text-2xl md:text-3xl font-bold text-purple-500">
                                {savingsRate.toFixed(0)}%
                            </p>
                        </div>
                        <div className="bg-zinc-800/50 backdrop-blur rounded-xl p-4 border border-zinc-700/50 text-center">
                            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Annual Savings</p>
                            <p className="text-2xl md:text-3xl font-bold text-blue-500">
                                {currencySymbol}{Math.round(totalSavings / 1000)}k
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive Demo Section */}
            <section className="grid gap-6 lg:grid-cols-2">
                {/* Cash Flow Preview */}
                <Card className="border-zinc-800 bg-zinc-900/30 overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-green-500/10">
                                    <ArrowRightLeft className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Cash Flow Visualization</CardTitle>
                                    <p className="text-xs text-zinc-500">See where every dollar goes</p>
                                </div>
                            </div>
                            <Link href="/cashflow">
                                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                    Explore <ArrowRight className="ml-1 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <MiniSankey data={cashFlow} />
                        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                            <div className="bg-zinc-800/50 rounded-lg p-2">
                                <p className="text-xs text-zinc-500">Income</p>
                                <p className="text-sm font-semibold text-green-400">{currencySymbol}{Math.round(cashFlow.grossIncome / 1000)}k</p>
                            </div>
                            <div className="bg-zinc-800/50 rounded-lg p-2">
                                <p className="text-xs text-zinc-500">Savings</p>
                                <p className="text-sm font-semibold text-purple-400">{currencySymbol}{Math.round(totalSavings / 1000)}k</p>
                            </div>
                            <div className="bg-zinc-800/50 rounded-lg p-2">
                                <p className="text-xs text-zinc-500">Expenses</p>
                                <p className="text-sm font-semibold text-slate-400">{currencySymbol}{Math.round((cashFlow.fixedExpenses + cashFlow.variableExpenses) / 1000)}k</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* FIRE Strategy Comparison */}
                <Card className="border-zinc-800 bg-zinc-900/30 overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                    <TrendingUp className="h-5 w-5 text-orange-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Compare FIRE Strategies</CardTitle>
                                    <p className="text-xs text-zinc-500">How spending affects your timeline</p>
                                </div>
                            </div>
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                    Full View <ArrowRight className="ml-1 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2 space-y-4">
                        {/* Strategy Selector */}
                        <div className="flex gap-2">
                            {(Object.keys(STRATEGY_CONFIG) as FireStrategy[]).map((key) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedStrategy(key)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                        selectedStrategy === key
                                            ? 'text-white shadow-lg'
                                            : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                                    }`}
                                    style={{
                                        backgroundColor: selectedStrategy === key ? STRATEGY_CONFIG[key].color : undefined
                                    }}
                                >
                                    {STRATEGY_CONFIG[key].label}
                                </button>
                            ))}
                        </div>

                        {/* Interactive Controls */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-zinc-500 flex justify-between">
                                    <span>Savings Rate</span>
                                    <span className="text-white font-medium">{demoSavingsRate}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="70"
                                    value={demoSavingsRate}
                                    onChange={(e) => setDemoSavingsRate(Number(e.target.value))}
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-zinc-500 flex justify-between">
                                    <span>Income</span>
                                    <span className="text-white font-medium">{currencySymbol}{(demoIncome / 1000).toFixed(0)}k</span>
                                </label>
                                <input
                                    type="range"
                                    min="50000"
                                    max="300000"
                                    step="10000"
                                    value={demoIncome}
                                    onChange={(e) => setDemoIncome(Number(e.target.value))}
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />
                            </div>
                        </div>

                        {/* Chart */}
                        <StrategyComparisonChart
                            strategy={selectedStrategy}
                            currentAge={30}
                            retirementAge={55}
                            savingsRate={demoSavingsRate}
                            income={demoIncome}
                        />

                        {/* Strategy Info */}
                        <div className="flex justify-between items-center px-3 py-2 bg-zinc-800/30 rounded-lg">
                            <div>
                                <p className="text-xs text-zinc-500">Target Spending</p>
                                <p className="text-sm font-semibold" style={{ color: strategyConfig.color }}>
                                    {currencySymbol}{strategyConfig.spending.toLocaleString()}/yr
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-zinc-500">FIRE Number</p>
                                <p className="text-sm font-semibold text-white">
                                    {currencySymbol}{(demoFireNumber / 1000000).toFixed(2)}M
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Feature Cards + Suggested Move */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Suggested Move - Now Compact */}
                <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent md:col-span-2 lg:col-span-1">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-orange-500/20 shrink-0">
                                <Target className="h-5 w-5 text-orange-500" />
                            </div>
                            <div className="space-y-2 min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Next Move</p>
                                <p className="text-sm font-semibold text-white">{nextAction.title}</p>
                                <p className="text-xs text-zinc-400">{nextAction.description}</p>
                                <Link href={nextAction.link}>
                                    <Button size="sm" variant="outline" className="mt-2 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 h-8 text-xs">
                                        {nextAction.label} <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Feature: Inputs */}
                <Link href="/inputs" className="group">
                    <Card className="h-full border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all">
                        <CardContent className="p-4 flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 shrink-0 group-hover:bg-blue-500/20 transition-colors">
                                <SlidersHorizontal className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">Control Panel</p>
                                <p className="text-xs text-zinc-500 mt-1">Income, 401k, IRA, HSA, expenses & more</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Feature: Dashboard */}
                <Link href="/dashboard" className="group">
                    <Card className="h-full border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all">
                        <CardContent className="p-4 flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10 shrink-0 group-hover:bg-purple-500/20 transition-colors">
                                <TrendingUp className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors">FIRE Dashboard</p>
                                <p className="text-xs text-zinc-500 mt-1">Projections, milestones & scenario comparison</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Feature: Learn */}
                <Link href="/learn" className="group">
                    <Card className="h-full border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all">
                        <CardContent className="p-4 flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10 shrink-0 group-hover:bg-green-500/20 transition-colors">
                                <BookOpen className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">Knowledge Base</p>
                                <p className="text-xs text-zinc-500 mt-1">FIRE concepts, strategies & flowchart</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </section>

            {/* Bottom CTA */}
            <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-800/50 to-zinc-900 border border-zinc-800 p-8 text-center">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-500/5 via-transparent to-transparent" />
                <div className="relative z-10 space-y-4">
                    <div className="flex justify-center gap-2 text-orange-500">
                        <Zap className="h-6 w-6" />
                        <PiggyBank className="h-6 w-6" />
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Ready to take control?</h3>
                    <p className="text-zinc-400 max-w-md mx-auto">
                        Input your numbers, visualize your cash flow, and watch your path to financial independence unfold.
                    </p>
                    <div className="flex justify-center gap-4 pt-2">
                        <Link href="/inputs">
                            <Button className="bg-orange-600 hover:bg-orange-500">
                                Get Started <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Support Section */}
            <section className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5" />
                <div className="relative z-10 p-4">
                    <div className="flex items-center gap-4">
                        {/* Coffee Icon */}
                        <div className="shrink-0">
                            <div className="relative">
                                <div className="absolute inset-0 bg-amber-500/20 blur-lg rounded-full" />
                                <div className="relative w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                                    <Coffee className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Message */}
                        <div className="flex-1 text-left min-w-0">
                            <h3 className="text-base font-bold text-white truncate">
                                Keep Flame Burning
                            </h3>
                            <p className="text-xs text-zinc-400">
                                Flame is a 100% free financial automation tracker. Support helps keep the servers running and features coming.
                            </p>
                        </div>
                        
                        {/* Button */}
                        <div className="shrink-0 flex items-center gap-3">
                            <ArrowRight className="hidden md:block h-5 w-5 text-zinc-500 animate-pulse" />
                            <BmcButton />
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
