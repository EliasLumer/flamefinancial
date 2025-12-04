export type TaxTreatment = 'Pre-tax' | 'Roth' | 'After-tax' | 'Taxable';

export type AccountType = 
  | '401k' 
  | 'IRA' 
  | 'Roth IRA' 
  | 'HSA' 
  | '529' 
  | 'Brokerage' 
  | 'Cash' 
  | 'Cash (HYSA)'
  | 'Real Estate' 
  | 'Debt' 
  | 'Other';

export interface RetirementBuckets {
  preTax: number;
  roth: number;
  afterTaxBasis: number;
  afterTaxEarnings: number;
  employerMatch: number; // Usually pre-tax, but tracked separately
  rollover: number; // Usually pre-tax
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  taxTreatment: TaxTreatment;
  // For retirement accounts that need granular tracking
  buckets?: RetirementBuckets;
  // Expected annual return for taxable accounts (%, e.g. 3 for HYSA, 7 for stocks)
  // Only used for Brokerage/Cash/HYSA - retirement accounts use global marketReturn
  expectedReturn?: number;
}

export interface Liability {
  id: string;
  name: string;
  balance: number;
  interestRate: number; // Percentage 0-100
  monthlyPayment?: number;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number; // Annual
  isTaxable: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  amount: number; // Monthly
  isFixed: boolean;
}

export interface Promotion {
  yearOffset: number;
  newSalary: number;
}

export interface AppState {
  // Income & Tax
  income: {
    salary: number;
    bonus: number;
    additionalIncome: IncomeSource[];
  };
  tax: {
    effectiveRate: number; // Percentage 0-100
    isAdvancedMode: boolean; // Future use
  };
  
  // Preferences
  settings: {
    currencySymbol: string; // '$', '€', '£', etc.
  };

  // Retirement Contributions (Work)
  retirementWork: {
    preTax401kRate: number; // % of salary for pre-tax 401k
    roth401kRate: number; // % of salary for Roth 401k
    afterTax401kRate: number; // % of salary for after-tax 401k (separate election)
    currentPreTaxBalance: number;
    currentRothBalance: number;
    currentAfterTaxBalance: number;
    maxEmployeeContribution: number; // IRS Limit ($23,500 for 2025)
    maxTotal401kLimit: number; // Total IRS Plan Limit (Employee + Employer + After-tax)
    
    employerMatch: {
      matchRatio: number; // % (e.g. 50% match)
      matchLimit: number; // % of salary (e.g. up to 6%)
    };
    
    bonusConfig?: {
      contribute401k: boolean; // Apply same 401k rates to bonus?
    };

    // Mega-backdoor Roth: convert after-tax contributions to Roth
    megaBackdoorRoth: {
      enabled: boolean; // Simply: convert after-tax 401k contributions to Roth?
    };
  };

  // Savings allocations
  savings: {
    brokerageRate: number; // % of net income to taxable brokerage
    brokerageFixedAmount?: number; // OR fixed annual amount (if set, overrides rate)
    brokerageBalance: number; // Current brokerage account balance
  };

  // Personal Retirement
  retirementPersonal: {
    rothIraContribution: number;
    rothIraBalance: number;
    traditionalIraContribution: number;
    traditionalIraBalance: number;
  };

  // HSA / 529
  hsa: {
    enabled: boolean;
    currentBalance: number;
    employeeContribution: number;
    employerContribution: number;
  };
  
  education529: {
    enabled: boolean;
    plans: {
      id: string;
      name: string; // e.g. "Kid 1"
      currentBalance: number;
      annualContribution: number;
      targetYear?: number;
    }[];
  };

  // Expenses
  expenses: {
    rent: number; // Monthly
    categories: ExpenseCategory[];
  };

  // Assets & Liabilities
  accounts: Account[];
  liabilities: Liability[];

  // Growth & Assumptions
  assumptions: {
    marketReturn: number; // %
    inflation: number; // %
    salaryGrowth: number; // %
    taxDrag: number; // %
    promotions: Promotion[];
    retirementTaxRate: number; // % tax rate on pre-tax withdrawals in retirement
    bonusGrowthRate: number; // % annual bonus growth (defaults to salaryGrowth if not set)
  };

  // FIRE Goals
  fire: {
    currentAge: number;
    retirementAge: number;
    targetAnnualSpending: number; // Today's dollars
    safeWithdrawalRate: number; // % (e.g. 4.0)
  };

  // App State (Checklists etc)
  checklists: {
    // Simple monthly checklist implementation for now
    [monthKey: string]: {
        [itemId: string]: boolean;
    }
  };
  
  // Metadata for export
  metadata: {
    version: string;
    lastModified: string;
    planName?: string;
  };
}

export const DEFAULT_STATE: AppState = {
  income: {
    salary: 0,
    bonus: 0,
    additionalIncome: []
  },
  tax: {
    effectiveRate: 25,
    isAdvancedMode: false
  },
  settings: {
    currencySymbol: '$'
  },
  retirementWork: {
    preTax401kRate: 0,
    roth401kRate: 0,
    afterTax401kRate: 0, // Separate after-tax election
    currentPreTaxBalance: 0,
    currentRothBalance: 0,
    currentAfterTaxBalance: 0,
    maxEmployeeContribution: 23500, // 2025 limit
    maxTotal401kLimit: 70000,       // 2025 total plan limit
    employerMatch: {
      matchRatio: 100,
      matchLimit: 6
    },
    bonusConfig: {
      contribute401k: false
    },
    megaBackdoorRoth: {
      enabled: false // Convert after-tax to Roth?
    }
  },
  savings: {
    brokerageRate: 0, // % of net income to brokerage
    brokerageFixedAmount: undefined,
    brokerageBalance: 0
  },
  retirementPersonal: {
    rothIraContribution: 0,
    rothIraBalance: 0,
    traditionalIraContribution: 0,
    traditionalIraBalance: 0
  },
  hsa: {
    enabled: false,
    currentBalance: 0,
    employeeContribution: 0,
    employerContribution: 0
  },
  education529: {
    enabled: false,
    plans: []
  },
  expenses: {
    rent: 0,
    categories: []
  },
  accounts: [],
  liabilities: [],
  assumptions: {
    marketReturn: 7,
    inflation: 3,
    salaryGrowth: 3,
    taxDrag: 0.5,
    promotions: [],
    retirementTaxRate: 20,
    bonusGrowthRate: 3
  },
  fire: {
    currentAge: 30,
    retirementAge: 55,
    targetAnnualSpending: 0,
    safeWithdrawalRate: 4.0
  },
  checklists: {},
  metadata: {
    version: "1.0",
    lastModified: new Date().toISOString(),
    planName: "My Flame Plan"
  }
};

