import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: string;
    className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onCheckedChange, label, className }) => {
    return (
        <div className={cn("flex items-center space-x-2", className)}>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onCheckedChange(!checked)}
                className={cn(
                    "peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                    checked ? "bg-orange-600" : "bg-zinc-700"
                )}
            >
                <span
                    className={cn(
                        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                        checked ? "translate-x-5" : "translate-x-0"
                    )}
                />
            </button>
            {label && <span className="text-sm font-medium text-zinc-200 cursor-pointer" onClick={() => onCheckedChange(!checked)}>{label}</span>}
        </div>
    )
}

