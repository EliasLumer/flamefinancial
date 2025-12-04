'use client';

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    accentColor?: 'orange' | 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan' | 'emerald';
}

const ACCENT_COLORS = {
    orange: {
        iconBg: 'bg-orange-500/15',
        iconColor: 'text-orange-500',
        titleColor: 'text-orange-500',
        glowColor: 'from-orange-500/5',
    },
    blue: {
        iconBg: 'bg-blue-500/15',
        iconColor: 'text-blue-500',
        titleColor: 'text-blue-400',
        glowColor: 'from-blue-500/5',
    },
    green: {
        iconBg: 'bg-green-500/15',
        iconColor: 'text-green-500',
        titleColor: 'text-green-400',
        glowColor: 'from-green-500/5',
    },
    purple: {
        iconBg: 'bg-purple-500/15',
        iconColor: 'text-purple-500',
        titleColor: 'text-purple-400',
        glowColor: 'from-purple-500/5',
    },
    amber: {
        iconBg: 'bg-amber-500/15',
        iconColor: 'text-amber-500',
        titleColor: 'text-amber-400',
        glowColor: 'from-amber-500/5',
    },
    rose: {
        iconBg: 'bg-rose-500/15',
        iconColor: 'text-rose-500',
        titleColor: 'text-rose-400',
        glowColor: 'from-rose-500/5',
    },
    cyan: {
        iconBg: 'bg-cyan-500/15',
        iconColor: 'text-cyan-500',
        titleColor: 'text-cyan-400',
        glowColor: 'from-cyan-500/5',
    },
    emerald: {
        iconBg: 'bg-emerald-500/15',
        iconColor: 'text-emerald-500',
        titleColor: 'text-emerald-400',
        glowColor: 'from-emerald-500/5',
    },
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({ 
    title, 
    description, 
    icon: Icon, 
    accentColor = 'orange' 
}) => {
    const colors = ACCENT_COLORS[accentColor];
    
    return (
        <div className="mb-6 flex items-center gap-4">
            {Icon && (
                <div className={cn(
                    "p-3 rounded-xl shrink-0",
                    colors.iconBg
                )}>
                    <Icon className={cn("h-6 w-6", colors.iconColor)} />
                </div>
            )}
            <div>
                <h2 className={cn(
                    "text-2xl font-bold tracking-tight",
                    colors.titleColor
                )}>{title}</h2>
                {description && <p className="text-zinc-400 mt-1">{description}</p>}
            </div>
        </div>
    );
};

// Section wrapper component for visual grouping
interface SectionWrapperProps {
    children: React.ReactNode;
    accentColor?: 'orange' | 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan' | 'emerald';
    className?: string;
}

const SECTION_BORDER_COLORS = {
    orange: 'border-l-orange-500/40',
    blue: 'border-l-blue-500/40',
    green: 'border-l-green-500/40',
    purple: 'border-l-purple-500/40',
    amber: 'border-l-amber-500/40',
    rose: 'border-l-rose-500/40',
    cyan: 'border-l-cyan-500/40',
    emerald: 'border-l-emerald-500/40',
};

const SECTION_BG_COLORS = {
    orange: 'from-orange-950/20 via-zinc-900/40 to-zinc-900/20',
    blue: 'from-blue-950/20 via-zinc-900/40 to-zinc-900/20',
    green: 'from-green-950/20 via-zinc-900/40 to-zinc-900/20',
    purple: 'from-purple-950/20 via-zinc-900/40 to-zinc-900/20',
    amber: 'from-amber-950/20 via-zinc-900/40 to-zinc-900/20',
    rose: 'from-rose-950/20 via-zinc-900/40 to-zinc-900/20',
    cyan: 'from-cyan-950/20 via-zinc-900/40 to-zinc-900/20',
    emerald: 'from-emerald-950/20 via-zinc-900/40 to-zinc-900/20',
};

export const SectionWrapper: React.FC<SectionWrapperProps> = ({ 
    children, 
    accentColor = 'orange',
    className 
}) => {
    return (
        <div className={cn(
            "relative rounded-2xl border border-zinc-800/80",
            "border-l-4",
            SECTION_BORDER_COLORS[accentColor],
            className
        )}>
            {/* Subtle gradient background - uses rounded-2xl to match parent */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br rounded-2xl pointer-events-none",
                SECTION_BG_COLORS[accentColor]
            )} />
            
            {/* Content */}
            <div className="relative p-6 md:p-8">
                {children}
            </div>
        </div>
    );
};
