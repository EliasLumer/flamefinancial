'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Home, SlidersHorizontal, ArrowRightLeft, LineChart, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlameStore } from '@/lib/store';

const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/inputs', label: 'Inputs', icon: SlidersHorizontal },
    { href: '/cashflow', label: 'Cash Flow', icon: ArrowRightLeft },
    { href: '/dashboard', label: 'FIRE', icon: LineChart },
    { href: '/learn', label: 'Learn', icon: BookOpen },
];

export function MainNav() {
    const pathname = usePathname();
    const { state, updateSection } = useFlameStore();

    return (
        <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/50 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center space-x-2">
                            <Flame className="h-8 w-8 text-orange-500" />
                            <span className="text-xl font-bold text-orange-500 tracking-tighter">Flame</span>
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                            {items.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-orange-500/10 text-orange-500"
                                                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="hidden sm:inline">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                        
                        <div className="hidden md:block h-6 w-px bg-zinc-800 mx-2"></div>
                        
                        <select 
                            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm rounded-md focus:ring-orange-500 focus:border-orange-500 block p-1.5"
                            value={state.settings?.currencySymbol || '$'}
                            onChange={(e) => updateSection('settings', { currencySymbol: e.target.value })}
                        >
                            <option value="$">USD ($)</option>
                            <option value="€">EUR (€)</option>
                            <option value="£">GBP (£)</option>
                            <option value="¥">JPY (¥)</option>
                            <option value="₹">INR (₹)</option>
                        </select>
                    </div>
                </div>
            </div>
        </nav>
    );
}

