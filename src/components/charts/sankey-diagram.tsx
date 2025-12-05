'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { CashFlow } from '@/lib/engine';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MySankeyNode extends SankeyNode<{ name: string; category?: string }, {}> {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MySankeyLink extends SankeyLink<{ name: string; category?: string }, {}> {}

const NODE_COLORS: Record<string, string> = {
    'Income': '#22c55e', // Green
    'Tax': '#ef4444', // Red
    'Pre-Tax': '#3b82f6', // Blue
    'Net': '#f97316', // Orange (Brand)
    'Savings': '#8b5cf6', // Purple
    'Expense': '#64748b', // Slate
    'Debt': '#dc2626', // Red-dark
    'Residual': '#10b981', // Emerald - unallocated cash
    // 401k family - shades of blue/indigo/purple
    '401k-PreTax': '#3b82f6', // Blue
    '401k-Roth': '#6366f1', // Indigo
    '401k-AfterTax': '#818cf8', // Light Indigo
    '401k-MegaBackdoor': '#a78bfa', // Light Purple
    'IRA-Roth': '#c084fc', // Lighter Purple
};

export const SankeyDiagram: React.FC<{ data: CashFlow; currencySymbol?: string }> = ({ data, currencySymbol = '$' }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(800);

    // 1. Prepare Data using useMemo to ensure we have it before layout
    const { nodes, links } = useMemo(() => {
        const nodesList: { name: string; category: string }[] = [];
        const linksList: { source: number; target: number; value: number }[] = [];
        
        const addNode = (name: string, category: string) => {
            const idx = nodesList.findIndex(n => n.name === name);
            if (idx >= 0) return idx;
            nodesList.push({ name, category });
            return nodesList.length - 1;
        };

        // Define all potential nodes
        const nGross = addNode("Total Compensation", "Income"); // Root
        
        const nSalary = addNode("Base Salary", "Income");
        const nBonus = addNode("Bonus", "Income");
        const nOther = addNode("Other Income", "Income");

        const nPreTax401k = addNode("Pre-tax 401k", "401k-PreTax");
        const nHsa = addNode("HSA", "Pre-Tax");
        const nTradIra = addNode("Trad IRA", "Pre-Tax");
        const nTaxes = addNode("Taxes", "Tax");
        const nNet = addNode("Net After Tax", "Net");
        
        const nRoth401k = addNode("Roth 401k", "401k-Roth");
        const nRothIra = addNode("Roth IRA", "IRA-Roth");
        const n529 = addNode("529", "Savings");
        const nPostTax401k = addNode("After-tax 401k", "401k-AfterTax");       // After-tax (NOT converted)
        const nMegaBackdoor = addNode("Mega-backdoor Roth", "401k-MegaBackdoor");  // After-tax converted to Roth
        const nBrokerage = addNode("Brokerage", "Savings");
        
        const nFixed = addNode("Needs", "Expense");
        const nVar = addNode("Wants", "Expense");
        const nDebt = addNode("Debt", "Debt");
        const nResidual = addNode("Residual Cash", "Residual");

        const nEmployer = addNode("Employer", "Income");
        const nMatch = addNode("Match", "Savings");

        // Helper to add link only if value > 0
        const addLink = (source: number, target: number, value: number) => {
            if (value > 0) {
                linksList.push({ source, target, value });
            }
        };

        // Sources -> Gross
        addLink(nSalary, nGross, data.salary);
        addLink(nBonus, nGross, data.bonus);
        addLink(nOther, nGross, data.additionalIncome);

        // Gross -> Splits
        addLink(nGross, nPreTax401k, data.preTax401k);
        addLink(nGross, nHsa, data.hsaContribution);
        addLink(nGross, nTradIra, data.traditionalIra);
        addLink(nGross, nTaxes, data.taxes);
        addLink(nGross, nNet, data.netAfterTax);

        // Net -> Splits
        addLink(nNet, nRoth401k, data.roth401k);
        addLink(nNet, nRothIra, data.rothIra);
        addLink(nNet, n529, data.education529);
        addLink(nNet, nPostTax401k, data.postTax401k);           // After-tax (not converted)
        addLink(nNet, nMegaBackdoor, data.megaBackdoorRoth);     // Mega-backdoor Roth
        addLink(nNet, nFixed, data.fixedExpenses);
        addLink(nNet, nVar, data.variableExpenses);
        addLink(nNet, nDebt, data.debtPayments);
        addLink(nNet, nBrokerage, data.brokerageContribution);
        addLink(nNet, nResidual, data.residualCash);

        // Employer Match
        if (data.employerMatch > 0) {
            addLink(nEmployer, nMatch, data.employerMatch);
        }

        return { nodes: nodesList, links: linksList };
    }, [data]);

    // Calculate dynamic height based on active nodes
    const height = useMemo(() => {
        // Count active nodes (those that are involved in links)
        // Or just use total nodes if we want to show them all (but usually D3 removes unconnected nodes from calculation?)
        // We want to give enough space for ALL nodes that will be rendered.
        // Since we only added links for value > 0, only connected nodes will have size.
        // But "HSA" with $0 might be rendered if we didn't filter nodes.
        // D3 Sankey graph includes all nodes passed to it.
        
        // Let's calculate height based on the number of nodes in the data.
        // A safe bet is roughly 50px per node to avoid overlap.
        // There are at most ~18 nodes total.
        // But they are distributed in columns. Max column height matters.
        // Column 1 (Targets of Gross): Pre-tax, HSA, Trad, Taxes, Net (5 nodes)
        // Column 2 (Targets of Net): Roth 401k, Roth IRA, 529, Post-tax, Fixed, Var, Debt, Brokerage (8 nodes)
        // Max nodes in a column is ~8.
        // 8 * 60px = 480px minimum.
        // But we also need margins.
        // Let's go with a generous height calculation or a larger fixed minimum.
        
        const maxNodesInColumn = 10; // Estimation
        const minHeight = 700; // Increased for added nodes
        // If we wanted to be truly dynamic we'd need to know the topology depth, but 650 should be enough for 10 nodes.
        // If the user adds more custom accounts later, we might need to increase this.
        // For now, let's stick to a larger fixed height or a dynamic one if we can detect node count.
        
        // Let's check active nodes count (nodes with > 0 value flow)
        const activeNodeIndices = new Set<number>();
        links.forEach(l => {
            activeNodeIndices.add(l.source);
            activeNodeIndices.add(l.target);
        });
        const activeNodeCount = activeNodeIndices.size;
        
        // If we have many active nodes, increase height.
        // Reduced multiplier from 35 to 30 to make it more compact
        return Math.max(500, activeNodeCount * 28 + 100);
    }, [nodes, links]);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setWidth(containerRef.current.clientWidth);
            }
        };
        
        window.addEventListener('resize', handleResize);
        handleResize();
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!svgRef.current || width === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // 2. Layout
        // Add larger padding for labels: top 50px, bottom 50px
        const margin = { top: 50, right: 1, bottom: 50, left: 1 };
        
        // Filter nodes to remove unconnected ones if desired?
        // If we keep them, they appear stacked at top/bottom.
        // Let's keep strictly connected nodes to clean up the chart?
        // User complained about "HSA $0" being cut off. If we remove it, it's not cut off :)
        // But if we want to keep it, we need space.
        // Let's filter nodes that have no links to avoid clutter AND bugs.
        
        const activeNodeIndices = new Set<number>();
        links.forEach(l => {
            activeNodeIndices.add(l.source);
            activeNodeIndices.add(l.target);
        });

        // Map old indices to new indices
        const nodeMap = new Map<number, number>();
        const activeNodes: typeof nodes = [];
        nodes.forEach((n, i) => {
            if (activeNodeIndices.has(i)) {
                nodeMap.set(i, activeNodes.length);
                activeNodes.push(n);
            }
        });

        const activeLinks = links.map(l => ({
            source: nodeMap.get(l.source)!,
            target: nodeMap.get(l.target)!,
            value: l.value
        }));

        // Guard: Don't render if no data
        if (activeLinks.length === 0 || activeNodes.length === 0) {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#64748b")
                .attr("font-size", "14px")
                .text("Add income data to see your cash flow");
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sankeyGenerator = d3Sankey<any, any>()
            .nodeWidth(15)
            .nodePadding(20)
            .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

        const graph = sankeyGenerator({
            nodes: activeNodes.map(d => Object.assign({}, d)),
            links: activeLinks.map(d => Object.assign({}, d))
        });

        // 3. Draw
        // Links
        svg.append("g")
            .attr("fill", "none")
            .attr("stroke-opacity", 0.4)
            .selectAll("path")
            .data(graph.links)
            .join("path")
            .attr("d", sankeyLinkHorizontal())
            .attr("stroke", () => "#64748b")
            .attr("stroke-width", d => Math.max(1, d.width || 0))
            .style("transition", "all 0.3s")
            .on("mouseover", function() { d3.select(this).attr("stroke-opacity", 0.7); })
            .on("mouseout", function() { d3.select(this).attr("stroke-opacity", 0.4); })
            .append("title")
            .text(d => `${d.source.name} → ${d.target.name}\n${currencySymbol}${Math.round(d.value).toLocaleString()}`);

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
            .attr("rx", 2)
            .append("title")
            .text(d => `${d.name}\n${currencySymbol}${Math.round(d.value || 0).toLocaleString()}`);

        // Labels
        node.append("text")
            .attr("x", d => (d.x0 || 0) < width / 2 ? 20 : -6)
            .attr("y", d => ((d.y1 || 0) - (d.y0 || 0)) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => (d.x0 || 0) < width / 2 ? "start" : "end")
            .text(d => d.name)
            .attr("fill", "#e2e8f0")
            .attr("font-size", "12px")
            .attr("font-weight", "500")
            .style("pointer-events", "none");
            
        node.append("text")
            .attr("x", d => (d.x0 || 0) < width / 2 ? 20 : -6)
            .attr("y", d => ((d.y1 || 0) - (d.y0 || 0)) / 2 + 14)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => (d.x0 || 0) < width / 2 ? "start" : "end")
            .text(d => `${currencySymbol}${Math.round(d.value || 0).toLocaleString()}`)
            .attr("fill", "#94a3b8")
            .attr("font-size", "10px")
            .style("pointer-events", "none");

    }, [nodes, links, width, height, currencySymbol]);

    return (
        <div ref={containerRef} className="w-full bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-visible" style={{ height }}>
            <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }} />
        </div>
    );
};
