'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ExternalLink, Flame, TrendingUp, TrendingDown, Wallet, Shield, Target, Briefcase, PiggyBank, DollarSign, ArrowRight } from 'lucide-react';

// Define the structure for our learning content
type Topic = {
  id: string;
  title: string;
  definition: string;
  details: React.ReactNode;
  variant?: 'default' | 'success' | 'danger';
  icon?: React.ElementType;
};

type Category = {
  title: string;
  description: string;
  topics: Topic[];
};

const categories: Category[] = [
  {
    title: "FIRE Fundamentals",
    description: "The core concepts of Financial Independence, Retire Early.",
    topics: [
      {
        id: "fire",
        title: "FIRE (Financial Independence, Retire Early)",
        definition: "A lifestyle movement with the goal of gaining financial freedom and retiring early.",
        details: (
          <div className="space-y-2">
            <p>FIRE is about saving a high percentage of your income (often 50-75%) to accumulate enough wealth to cover your living expenses forever. It's not just about retiring from work, but retiring from the <i>need</i> to work.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-zinc-300">
              <li><strong>FI (Financial Independence):</strong> When your assets generate enough income to cover your expenses.</li>
              <li><strong>RE (Retire Early):</strong> The option to stop working a traditional job once FI is reached.</li>
            </ul>
          </div>
        ),
        variant: 'default',
        icon: Flame
      },
      {
        id: "savings-rate",
        title: "Savings Rate",
        definition: "The percentage of your income that you save and invest.",
        details: (
          <div className="space-y-2">
            <p>This is the most important metric in FIRE. The higher your savings rate, the faster you reach financial independence, regardless of your actual income.</p>
            <p><strong>Formula:</strong> (Savings / Gross Income) × 100</p>
            <p className="text-green-400">A 50% savings rate means for every year you work, you buy a year of freedom.</p>
          </div>
        ),
        variant: 'success',
        icon: PiggyBank
      },
      {
        id: "swr",
        title: "Safe Withdrawal Rate (4% Rule)",
        definition: "The percentage of your portfolio you can withdraw annually in retirement without running out of money.",
        details: (
          <div className="space-y-2">
            <p>Based on the Trinity Study, withdrawing 4% of your initial portfolio value (adjusted for inflation) has a very high success rate over 30 years.</p>
            <p><strong>Example:</strong> If you have $1,000,000 invested, you can withdraw $40,000/year.</p>
          </div>
        ),
        variant: 'default',
        icon: Shield
      },
      {
        id: "fire-number",
        title: "The FIRE Number",
        definition: "The total amount of invested assets you need to retire.",
        details: (
          <div className="space-y-2">
            <p>Calculated as your annual expenses multiplied by 25 (inverse of the 4% rule).</p>
            <p><strong>Formula:</strong> Annual Expenses × 25</p>
            <p>If you spend $40,000/year, your FIRE number is $1,000,000.</p>
          </div>
        ),
        variant: 'default',
        icon: Target
      },
      {
        id: "compound-interest",
        title: "Compound Interest",
        definition: "Interest calculated on the initial principal and also on the accumulated interest of previous periods.",
        details: "It's 'interest on interest' and it causes wealth to grow exponentially over time. This is the engine that powers FIRE.",
        variant: 'success',
        icon: TrendingUp
      },
      {
        id: "variations",
        title: "FIRE Variations (Lean, Fat, Coast, Barista)",
        definition: "Different flavors of FIRE based on lifestyle and spending goals.",
        details: (
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>LeanFIRE:</strong> Retiring on a minimalist budget (e.g., expenses &lt; $40k/year). Requires a smaller portfolio.</li>
            <li><strong>FatFIRE:</strong> Retiring with a generous budget (e.g., expenses &gt; $100k/year). Requires a large portfolio.</li>
            <li><strong>CoastFIRE:</strong> Saving enough early so that compound interest will hit your FIRE number by traditional retirement age, allowing you to only work to cover current expenses.</li>
            <li><strong>BaristaFIRE:</strong> Reaching a portfolio size where you only need a low-stress or part-time job to cover a portion of expenses or health insurance.</li>
          </ul>
        ),
        variant: 'default',
        icon: Flame
      }
    ]
  },
  {
    title: "Income & Money In",
    description: "Fueling the fire with earnings.",
    topics: [
      {
        id: "gross-vs-net",
        title: "Gross vs. Net Income",
        definition: "What you earn vs. what actually hits your bank account.",
        details: "Gross income is your total pay before taxes and deductions. Net income is your take-home pay. FIRE planning often starts with Gross Income to account for pre-tax savings opportunities.",
        variant: 'success',
        icon: DollarSign
      },
      {
        id: "side-hustles",
        title: "Side Hustles",
        definition: "Additional income streams outside your primary job.",
        details: "Accelerates FIRE by increasing the 'shovel' (income) available to fill the 'hole' (investments). Examples: Freelancing, consulting, gig economy, selling digital products.",
        variant: 'success',
        icon: Briefcase
      }
    ]
  },
  {
    title: "Expenses & Money Out",
    description: "Optimizing spending to maximize savings.",
    topics: [
      {
        id: "fixed-expenses",
        title: "Fixed Expenses (Needs)",
        definition: "Recurring, mandatory costs that remain relatively constant.",
        details: "Housing (Rent/Mortgage), Utilities, Insurance, Minimum Debt Payments. These are harder to cut but have the biggest impact if reduced (e.g., house hacking).",
        variant: 'danger',
        icon: TrendingDown
      },
      {
        id: "variable-expenses",
        title: "Variable Expenses (Wants)",
        definition: "Discretionary spending that fluctuates month to month.",
        details: "Dining out, entertainment, travel, shopping. These are the easiest lever to pull for immediate savings improvements.",
        variant: 'danger',
        icon: TrendingDown
      },
      {
        id: "lifestyle-creep",
        title: "Lifestyle Creep",
        definition: "The tendency to spend more as your income increases.",
        details: "Also known as lifestyle inflation. Avoiding this is key to FIRE. If you get a raise and save it all, you accelerate your path. If you spend it, you stay on the treadmill.",
        variant: 'danger',
        icon: TrendingDown
      }
    ]
  },
  {
    title: "The FIRE Flowchart (Simplified)",
    description: "The optimal order of operations for your money.",
    topics: [
      {
        id: "flow-1",
        title: "Step 1: Budget & Reduce Expenses",
        definition: "Know where your money is going.",
        details: "You cannot manage what you do not measure. Track expenses and cut the fat.",
        variant: 'default',
        icon: ArrowRight
      },
      {
        id: "flow-2",
        title: "Step 2: Employer Match",
        definition: "Free money.",
        details: "Contribute enough to your 401(k) to get the full employer match. It's an immediate 100% (usually) return on investment.",
        variant: 'success',
        icon: ArrowRight
      },
      {
        id: "flow-3",
        title: "Step 3: High Interest Debt",
        definition: "Guaranteed negative returns.",
        details: "Pay off credit cards and loans with interest rates > 7%. It's like earning a guaranteed 20% return by paying off a credit card.",
        variant: 'danger',
        icon: ArrowRight
      },
      {
        id: "flow-4",
        title: "Step 4: Emergency Fund",
        definition: "Insurance against life.",
        details: "Build 3-6 months of living expenses in a high-yield savings account (HYSA) or money market fund. Keeps you from selling investments when things break.",
        variant: 'success',
        icon: ArrowRight
      },
      {
        id: "flow-5",
        title: "Step 5: HSA & IRA",
        definition: "Tax-advantaged growth.",
        details: "Max out Health Savings Account (HSA) if eligible (triple tax advantage). Max out IRA (Roth or Traditional depending on income level).",
        variant: 'success',
        icon: ArrowRight
      },
      {
        id: "flow-6",
        title: "Step 6: Max 401(k)",
        definition: "Lower your taxes.",
        details: "Fill up the rest of your 401(k) space ($23,000+ limit) to reduce taxable income.",
        variant: 'success',
        icon: ArrowRight
      },
      {
        id: "flow-7",
        title: "Step 7: Mega Backdoor & Taxable",
        definition: "Overflow buckets.",
        details: "If available, use After-Tax 401(k) contributions (Mega Backdoor Roth). Finally, invest in a standard taxable brokerage account.",
        variant: 'success',
        icon: ArrowRight
      }
    ]
  },
  {
    title: "Accounts & Vehicles",
    description: "Where to put your money.",
    topics: [
      {
        id: "401k",
        title: "401(k) / 403(b)",
        definition: "Employer-sponsored retirement savings plans.",
        details: (
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Traditional:</strong> Pre-tax contributions. Lowers taxes now, pay taxes on withdrawal.</li>
            <li><strong>Roth:</strong> Post-tax contributions. Pay taxes now, tax-free withdrawals forever.</li>
          </ul>
        ),
        variant: 'default',
        icon: Wallet
      },
      {
        id: "ira",
        title: "IRA (Individual Retirement Account)",
        definition: "Personal retirement account with tax advantages.",
        details: "Like a 401(k) but you open it yourself. Has lower contribution limits ($7,000 in 2024).",
        variant: 'default',
        icon: Wallet
      },
      {
        id: "hsa",
        title: "HSA (Health Savings Account)",
        definition: "The 'unicorn' of accounts.",
        details: "1. Tax deduction on contribution. 2. Tax-free growth. 3. Tax-free withdrawal for medical expenses. After age 65, acts like a Traditional IRA for non-medical expenses.",
        variant: 'default',
        icon: Wallet
      },
      {
        id: "529",
        title: "529 Plan",
        definition: "Education savings plan.",
        details: "Tax-free growth and withdrawals for qualified education expenses. Some states offer tax deductions for contributions.",
        variant: 'default',
        icon: Wallet
      },
      {
        id: "brokerage",
        title: "Taxable Brokerage",
        definition: "Standard investment account.",
        details: "No tax advantages, but no restrictions. Money is accessible anytime without penalty. Essential for retiring *before* 59.5.",
        variant: 'default',
        icon: Wallet
      }
    ]
  }
];

export default function LearnPage() {
  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-white tracking-tight">Knowledge Base</h1>
        <p className="text-xl text-zinc-400 max-w-2xl">
          Everything you need to know about Financial Independence, derived from the community-standard roadmap and definitions used in this calculator.
        </p>
      </div>

      {/* Content Categories */}
      <div className="space-y-16">
        {categories.map((category, idx) => (
          <div key={idx} className="space-y-6">
            <div className="border-l-4 border-orange-500 pl-4">
              <h2 className="text-2xl font-bold text-white">{category.title}</h2>
              <p className="text-zinc-400 mt-1">{category.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.topics.map((topic) => (
                <Card 
                  key={topic.id} 
                  className={`
                    bg-zinc-900/50 border-zinc-800 transition-all duration-300
                    hover:bg-zinc-800 hover:-translate-y-1 hover:shadow-xl
                    ${topic.variant === 'success' ? 'border-t-4 border-t-green-500 hover:shadow-green-500/10' : ''}
                    ${topic.variant === 'danger' ? 'border-t-4 border-t-red-500 hover:shadow-red-500/10' : ''}
                    ${topic.variant === 'default' ? 'border-t-4 border-t-orange-500 hover:shadow-orange-500/10' : ''}
                  `}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-lg font-semibold text-white leading-tight">
                        {topic.title}
                      </CardTitle>
                      {topic.icon && (
                        <div className={`
                          p-2 rounded-md shrink-0
                          ${topic.variant === 'success' ? 'bg-green-500/10 text-green-400' : ''}
                          ${topic.variant === 'danger' ? 'bg-red-500/10 text-red-400' : ''}
                          ${topic.variant === 'default' ? 'bg-orange-500/10 text-orange-400' : ''}
                        `}>
                          <topic.icon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-base font-medium text-zinc-200 border-l-2 border-zinc-700 pl-3 italic">
                      "{topic.definition}"
                    </div>
                    <div className="text-sm text-zinc-400 leading-relaxed">
                      {topic.details}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FIRE Flowchart Link Section */}
      <div className="pt-8 border-t border-zinc-800">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-white">
              <ExternalLink className="h-5 w-5 text-zinc-400" />
              The FIRE Flowchart
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-zinc-400">
              The community-standard flowchart from r/financialindependence that outlines the optimal order of operations for your money.
            </p>
            <a 
              href="https://www.reddit.com/r/financialindependence/comments/ecn2hk/fire_flow_chart_version_42/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-orange-500 hover:text-orange-400 transition-colors text-sm font-medium"
            >
              View Flowchart on Reddit <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
