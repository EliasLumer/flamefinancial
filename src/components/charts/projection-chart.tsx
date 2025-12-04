'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ProjectionPoint } from '@/lib/engine';
import { Calendar, User } from 'lucide-react';

interface ScenarioData {
    id: string;
    name: string;
    color: string;
    data: ProjectionPoint[];
    fireNumber?: number;
}

interface ProjectionChartProps {
    scenarios: ScenarioData[];
    fireTarget: number; // kept for backwards compat, but we use per-scenario now
    ageRange?: [number, number];
    fireAge?: number | null; // kept for backwards compat
    currencySymbol?: string;
}

type XAxisMode = 'age' | 'year';

export const ProjectionChart: React.FC<ProjectionChartProps> = ({ 
    scenarios, 
    ageRange,
    currencySymbol = '$'
}) => {
    const [xAxisMode, setXAxisMode] = useState<XAxisMode>('age');
    
    // Calculate FIRE age for each scenario
    const scenarioFireInfo = useMemo(() => {
        return scenarios.map(s => {
            const fireNumber = s.fireNumber ?? 0;
            const firePoint = s.data.find(p => p.investableAssets >= fireNumber);
            return {
                id: s.id,
                name: s.name,
                color: s.color,
                fireNumber,
                fireAge: firePoint?.age ?? null,
                fireYear: firePoint?.year ?? null,
            };
        });
    }, [scenarios]);

    // 1. Find data bounds
    let minAge = Infinity, maxAge = -Infinity;
    let minYear = Infinity, maxYear = -Infinity;

    scenarios.forEach(s => {
        if (s.data.length > 0) {
            minAge = Math.min(minAge, s.data[0].age);
            maxAge = Math.max(maxAge, s.data[s.data.length - 1].age);
            minYear = Math.min(minYear, s.data[0].year);
            maxYear = Math.max(maxYear, s.data[s.data.length - 1].year);
        }
    });

    if (minAge === Infinity) return <div className="h-[400px] flex items-center justify-center text-zinc-500">No projection data</div>;

    // Apply age range filter if provided (only applies to age mode)
    const displayMinAge = ageRange ? ageRange[0] : minAge;
    const displayMaxAge = ageRange ? ageRange[1] : maxAge;
    
    // For year mode, calculate corresponding year range from first scenario
    const firstScenario = scenarios[0];
    const yearOffset = firstScenario?.data[0] ? firstScenario.data[0].year - firstScenario.data[0].age : new Date().getFullYear() - 30;
    const displayMinYear = displayMinAge + yearOffset;
    const displayMaxYear = displayMaxAge + yearOffset;

    // 2. Merge Data based on xAxisMode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mergedData: any[] = useMemo(() => {
        const data: any[] = [];
        
        if (xAxisMode === 'age') {
            for (let age = displayMinAge; age <= displayMaxAge; age++) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const point: any = { age, xValue: age };
                scenarios.forEach(s => {
                    const p = s.data.find(d => d.age === age);
                    if (p) {
                        point[s.id] = Math.round(p.totalNetWorth);
                        point[`${s.id}_investable`] = Math.round(p.investableAssets);
                    }
                });
                data.push(point);
            }
        } else {
            // Year mode - merge by calendar year
            for (let year = displayMinYear; year <= displayMaxYear; year++) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const point: any = { year, xValue: year };
                scenarios.forEach(s => {
                    const p = s.data.find(d => d.year === year);
                    if (p) {
                        point[s.id] = Math.round(p.totalNetWorth);
                        point[`${s.id}_investable`] = Math.round(p.investableAssets);
                    }
                });
                data.push(point);
            }
        }
        
        return data;
    }, [scenarios, xAxisMode, displayMinAge, displayMaxAge, displayMinYear, displayMaxYear]);

    const formatCurrency = (val: number) => {
        if (val >= 1000000) return `${currencySymbol}${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${currencySymbol}${(val / 1000).toFixed(0)}k`;
        return `${currencySymbol}${val}`;
    };

    // Find max value for Y domain calculation (include all FIRE targets)
    let maxValue = 0;
    scenarioFireInfo.forEach(s => {
        if (s.fireNumber > maxValue) maxValue = s.fireNumber;
    });
    mergedData.forEach(point => {
        scenarios.forEach(s => {
            if (point[s.id] > maxValue) maxValue = point[s.id];
        });
    });

    const xDataKey = xAxisMode === 'age' ? 'age' : 'year';
    const xLabel = xAxisMode === 'age' ? 'Age' : 'Year';
    const displayMin = xAxisMode === 'age' ? displayMinAge : displayMinYear;
    const displayMax = xAxisMode === 'age' ? displayMaxAge : displayMaxYear;

    return (
        <div className="w-full bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
            {/* X-Axis Toggle */}
            <div className="flex justify-end mb-3">
                <div className="inline-flex rounded-lg border border-zinc-700 p-0.5 bg-zinc-800/50">
                    <button
                        onClick={() => setXAxisMode('age')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            xAxisMode === 'age' 
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                                : 'text-zinc-400 hover:text-zinc-300'
                        }`}
                    >
                        <User className="h-3 w-3" />
                        Age
                    </button>
                    <button
                        onClick={() => setXAxisMode('year')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            xAxisMode === 'year' 
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                                : 'text-zinc-400 hover:text-zinc-300'
                        }`}
                    >
                        <Calendar className="h-3 w-3" />
                        Year
                    </button>
                </div>
            </div>
            
            <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={mergedData}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 20,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis 
                            dataKey={xDataKey} 
                            stroke="#94a3b8" 
                            domain={[displayMin, displayMax]}
                            label={{ value: xLabel, position: 'insideBottomRight', offset: -10, fill: '#94a3b8' }} 
                        />
                        <YAxis 
                            stroke="#94a3b8" 
                            tickFormatter={formatCurrency}
                            domain={[0, 'auto']}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                            formatter={(value: number, name: string) => [formatCurrency(value), name]}
                            labelFormatter={(val) => xAxisMode === 'age' ? `Age ${val}` : `Year ${val}`}
                        />
                        <Legend />
                        
                        {/* Per-scenario FIRE target horizontal lines */}
                        {scenarioFireInfo.map((s, idx) => {
                            if (s.fireNumber <= 0) return null;
                            
                            // Determine label position based on scenario index and whether values overlap
                            // Use different positions to avoid label collisions
                            const labelPositions: Array<'insideTopLeft' | 'insideTopRight' | 'insideBottomLeft' | 'insideBottomRight'> = [
                                'insideTopLeft',     // Current Plan (A)
                                'insideTopRight',    // Scenario B
                                'insideBottomRight', // Scenario C
                            ];
                            
                            // Different dash patterns per scenario for visual distinction
                            const dashPatterns = ['8 4', '12 4', '4 4'];
                            
                            return (
                                <ReferenceLine 
                                    key={`fire-${s.id}`}
                                    y={s.fireNumber} 
                                    stroke={s.color} 
                                    strokeDasharray={dashPatterns[idx] || '8 4'}
                                    strokeOpacity={0.7}
                                    strokeWidth={1.5}
                                    label={scenarios.length > 1 ? { 
                                        value: `${s.name}: ${formatCurrency(s.fireNumber)}`, 
                                        fill: s.color, 
                                        position: labelPositions[idx] || 'insideTopLeft',
                                        fontSize: 10,
                                        fontWeight: 500,
                                        opacity: 1
                                    } : {
                                        value: `FIRE Target: ${formatCurrency(s.fireNumber)}`, 
                                        fill: '#ef4444', 
                                        position: 'insideTopLeft',
                                        fontSize: 10,
                                        fontWeight: 500,
                                        opacity: 1
                                    }} 
                                />
                            );
                        })}

                        {/* Scenario lines - render in reverse order so Current Plan (A) renders LAST and appears on top */}
                        {[...scenarios].reverse().map((s) => {
                            const isCurrentPlan = s.id === 'A';
                            return (
                                <Line
                                    key={s.id}
                                    type="monotone"
                                    dataKey={s.id}
                                    name={s.name}
                                    stroke={s.color}
                                    strokeWidth={isCurrentPlan ? 2.5 : 2}
                                    strokeOpacity={isCurrentPlan ? 1 : 0.85}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 2 }}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>
            
            {/* FIRE Summary */}
            {scenarioFireInfo.some(s => s.fireAge !== null) && (
                <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-wrap gap-4">
                    {scenarioFireInfo.map(s => (
                        s.fireAge !== null && (
                            <div key={`summary-${s.id}`} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                <span className="text-xs text-zinc-400">
                                    {s.name}: FIRE @ age <span className="font-semibold text-zinc-200">{s.fireAge}</span>
                                    {s.fireYear && <span className="text-zinc-500"> ({s.fireYear})</span>}
                                </span>
                            </div>
                        )
                    ))}
                </div>
            )}
        </div>
    );
};
