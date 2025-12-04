import * as React from "react"

export const SectionHeader: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
    <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-orange-500">{title}</h2>
        {description && <p className="text-zinc-400 mt-1">{description}</p>}
    </div>
)

