import { AppState } from "@/types/flame";

// IRS Contribution Limits for 2025
export const IRS_LIMITS = {
  EMPLOYEE_401K: 23500,    // Employee elective deferral limit (pre-tax + Roth)
  CATCH_UP_401K: 7500,     // Catch-up for age 50+
  TOTAL_401K: 70000,       // Total plan limit (employee + employer + after-tax)
  IRA: 7000,
  CATCH_UP_IRA: 1000,
  HSA_INDIVIDUAL: 4300,    // 2025 HSA individual limit
  HSA_FAMILY: 8550,        // 2025 HSA family limit
};

export interface CashFlow {
  grossIncome: number;
  taxableIncome: number;
  taxes: number;
  
  // Income Sources
  salary: number;
  bonus: number;
  additionalIncome: number;

  // Deductions / Pre-tax
  preTax401k: number;           // Capped employee pre-tax contribution
  hsaContribution: number;
  traditionalIra: number;
  
  // Post-tax / Savings
  netAfterTax: number;
  roth401k: number;             // Capped employee Roth contribution
  rothIra: number;
  education529: number;
  
  // After-tax 401k breakdown
  spilloverAfterTax: number;    // Overflow from pre-tax+Roth exceeding $23,500 (automatic)
  additionalAfterTax: number;   // Extra voluntary after-tax contributions (explicit rate)
  totalAfterTax: number;        // spillover + additional
  megaBackdoorRoth: number;     // After-tax converted to Roth
  postTax401k: number;          // After-tax NOT converted (0 if mega-backdoor enabled)
  
  // Brokerage
  brokerageContribution: number; // Explicit user input
  residualCash: number;          // What's left after all allocations
  
  employerMatch: number;
  
  // Expenses
  housing: number;           // Rent/Mortgage (annual)
  needsOther: number;        // Other fixed expenses (annual)
  wants: number;             // Variable expenses (annual)
  debtPayments: number;
  
  // Convenience totals
  fixedExpenses: number;     // housing + needsOther (for backwards compat)
  variableExpenses: number;  // same as wants (for backwards compat)
}

export const calculateCashFlow = (state: AppState): CashFlow => {
  const { income, tax, retirementWork, retirementPersonal, hsa, education529, expenses, liabilities, savings } = state;

  // 1. Gross Income
  const additionalIncomeTotal = income.additionalIncome.reduce((sum, src) => sum + src.amount, 0);
  const grossIncome = income.salary + income.bonus + additionalIncomeTotal;

  // 2. Pre-tax Deductions
  let subjectSalary = income.salary;
  if (retirementWork.bonusConfig?.contribute401k && income.bonus > 0) {
      subjectSalary += income.bonus;
  }

  // Calculate elected pre-tax and Roth amounts
  const electedPreTax = subjectSalary * (retirementWork.preTax401kRate / 100);
  const electedRoth = subjectSalary * (retirementWork.roth401kRate / 100);
  const totalElected = electedPreTax + electedRoth;
  
  // Cap pre-tax + Roth at employee limit ($23,500) - proportionally if needed
  const employeeLimit = retirementWork.maxEmployeeContribution || IRS_LIMITS.EMPLOYEE_401K;
  
  let preTax401k: number;
  let roth401k: number;
  let spilloverAfterTax = 0;  // Excess from elections that spills to after-tax
  
  if (totalElected > employeeLimit) {
    // Scale back proportionally (contributions maintain ratio until limit hit)
    const ratio = employeeLimit / totalElected;
    preTax401k = electedPreTax * ratio;
    roth401k = electedRoth * ratio;
    // The excess spills over to after-tax - this is still your paycheck money!
    spilloverAfterTax = totalElected - employeeLimit;
  } else {
    preTax401k = electedPreTax;
    roth401k = electedRoth;
  }

  const hsaContribution = hsa.enabled ? hsa.employeeContribution : 0;
  const traditionalIra = retirementPersonal.traditionalIraContribution;

  const totalPreTaxDeductions = preTax401k + hsaContribution + traditionalIra;

  // 3. Taxes
  const taxableIncomeSources = income.salary + income.bonus + income.additionalIncome.filter(i => i.isTaxable).reduce((sum, src) => sum + src.amount, 0);
  const taxableIncome = Math.max(0, taxableIncomeSources - totalPreTaxDeductions);
  const taxes = taxableIncome * (tax.effectiveRate / 100);

  // 4. Net After Tax
  const netAfterTax = grossIncome - totalPreTaxDeductions - taxes;

  // 5. Employer Match (based on capped employee contributions)
  const userContribRate = subjectSalary > 0 ? (preTax401k + roth401k) / subjectSalary : 0;
  const matchLimitRate = (retirementWork.employerMatch.matchLimit || 0) / 100;
  const matchRatio = (retirementWork.employerMatch.matchRatio || 0) / 100;
  const matchedRate = Math.min(userContribRate, matchLimitRate);
  const employerMatch = subjectSalary * matchedRate * matchRatio;

  // 6. After-tax 401k
  // Calculate available room in the plan (accounting for spillover)
  const totalPlanLimit = retirementWork.maxTotal401kLimit || IRS_LIMITS.TOTAL_401K;
  const usedByEmployeeMatchAndSpillover = preTax401k + roth401k + employerMatch + spilloverAfterTax;
  const additionalAfterTaxRoom = Math.max(0, totalPlanLimit - usedByEmployeeMatchAndSpillover);
  
  // User can elect ADDITIONAL after-tax contributions beyond their spillover
  const afterTax401kRate = retirementWork.afterTax401kRate || 0;
  const electedAdditionalAfterTax = subjectSalary * (afterTax401kRate / 100);
  const additionalAfterTax = Math.min(electedAdditionalAfterTax, additionalAfterTaxRoom);
  
  // Total after-tax = spillover (automatic from exceeded elections) + additional (explicit rate)
  const totalAfterTax = spilloverAfterTax + additionalAfterTax;

  // 7. Mega-backdoor Roth: convert after-tax contributions to Roth
  let postTax401k = 0;
  let megaBackdoorRoth = 0;
  
  if (retirementWork.megaBackdoorRoth.enabled && totalAfterTax > 0) {
    megaBackdoorRoth = totalAfterTax;
  } else {
    postTax401k = totalAfterTax;
  }

  // 8. Post-tax Flows
  const rothIra = retirementPersonal.rothIraContribution;
  const eduContrib = education529.enabled ? education529.plans.reduce((sum, p) => sum + p.annualContribution, 0) : 0;

  const housing = expenses.rent * 12;
  const needsOther = expenses.categories.filter(c => c.isFixed).reduce((sum, c) => sum + c.amount, 0) * 12;
  const wants = expenses.categories.filter(c => !c.isFixed).reduce((sum, c) => sum + c.amount, 0) * 12;
  const fixedExpenses = housing + needsOther;  // For backwards compat
  const variableExpenses = wants;              // For backwards compat
  const debtPayments = liabilities.reduce((sum, l) => sum + (l.monthlyPayment || 0), 0) * 12;

  // 9. Brokerage - explicit user input
  let brokerageContribution = 0;
  if (savings?.brokerageFixedAmount !== undefined && savings.brokerageFixedAmount > 0) {
    brokerageContribution = savings.brokerageFixedAmount;
  } else if (savings?.brokerageRate > 0) {
    brokerageContribution = netAfterTax * (savings.brokerageRate / 100);
  }

  // 10. Residual cash (what's left after all allocations)
  // Note: totalAfterTax comes from your paycheck (spillover + additional elections)
  const outflows = roth401k + rothIra + eduContrib + totalAfterTax + brokerageContribution + fixedExpenses + variableExpenses + debtPayments;
  const residualCash = Math.max(0, netAfterTax - outflows);

  return {
    grossIncome,
    salary: income.salary,
    bonus: income.bonus,
    additionalIncome: additionalIncomeTotal,
    taxableIncome,
    taxes,
    preTax401k,
    hsaContribution,
    traditionalIra,
    netAfterTax,
    roth401k,
    rothIra,
    education529: eduContrib,
    spilloverAfterTax,
    additionalAfterTax,
    totalAfterTax,
    postTax401k,
    megaBackdoorRoth,
    brokerageContribution,
    employerMatch,
    housing,
    needsOther,
    wants,
    fixedExpenses,
    variableExpenses,
    debtPayments,
    residualCash
  };
};

export interface ProjectionPoint {
  age: number;
  year: number;
  totalNetWorth: number;
  investableAssets: number;
  // Detailed breakdown by tax treatment
  preTaxBalance: number;      // 401k pre-tax + Traditional IRA + employer match
  rothBalance: number;        // Roth 401k + Roth IRA + Mega-backdoor Roth
  taxableBalance: number;     // Brokerage + Cash
  hsaBalance: number;         // HSA (triple tax advantaged)
  // Keep aggregates for backward compatibility
  taxAdvantaged: number;      // sum of preTax + roth + hsa
  taxable: number;            // same as taxableBalance
  isFire: boolean;
}

// Helper to get default expected return based on account type
const getDefaultReturn = (type: string, marketReturn: number): number => {
  switch(type) {
    case 'Cash': return 0;           // Checking accounts earn nothing
    case 'Cash (HYSA)': return 3;    // High-yield savings ~3%
    case 'Brokerage': return marketReturn; // Stocks use market return
    default: return marketReturn;
  }
};

export const calculateProjections = (state: AppState): ProjectionPoint[] => {
  const { fire, assumptions, accounts } = state;
  const startYear = new Date().getFullYear();
  const points: ProjectionPoint[] = [];

  const currentAge = fire.currentAge;
  const currentYear = startYear;
  
  // Initialize 4 separate balances from accounts by tax treatment
  // Pre-tax: 401k with Pre-tax treatment + Traditional IRA
  let preTaxBalance = accounts
    .filter(a => (a.type === '401k' && a.taxTreatment === 'Pre-tax') || a.type === 'IRA')
    .reduce((sum, a) => sum + a.balance, 0);
  
  // Roth: 401k with Roth treatment + Roth IRA
  let rothBalance = accounts
    .filter(a => (a.type === '401k' && a.taxTreatment === 'Roth') || a.type === 'Roth IRA')
    .reduce((sum, a) => sum + a.balance, 0);
  
  // HSA
  let hsaBalance = accounts
    .filter(a => a.type === 'HSA')
    .reduce((sum, a) => sum + a.balance, 0);
  
  // Taxable accounts: Track EACH account separately with its own expected return
  // This allows different returns for HYSA (3%), Cash (0%), Brokerage stocks (7-10%), etc.
  const taxableAccounts = accounts.filter(a => ['Brokerage', 'Cash', 'Cash (HYSA)'].includes(a.type));
  const taxableBalances = new Map<string, { balance: number; expectedReturn: number; type: string }>();
  
  taxableAccounts.forEach(a => {
    taxableBalances.set(a.id, {
      balance: a.balance,
      expectedReturn: a.expectedReturn ?? getDefaultReturn(a.type, assumptions.marketReturn),
      type: a.type
    });
  });
  
  // Helper to get total taxable balance
  const getTotalTaxable = () => {
    let total = 0;
    taxableBalances.forEach(v => total += v.balance);
    return total;
  };
  
  let taxableBalance = getTotalTaxable();
    
  // Other assets (real estate, etc.)
  let otherAssets = accounts
    .filter(a => !['401k', 'IRA', 'Roth IRA', 'HSA', 'Brokerage', 'Cash', 'Cash (HYSA)'].includes(a.type))
    .reduce((sum, a) => sum + a.balance, 0);

  const totalDebt = state.liabilities.reduce((sum, l) => sum + l.balance, 0);

  // Loop until age 90
  const endAge = 90;
  
  let projectedSalary = state.income.salary;
  let projectedBonus = state.income.bonus;
  
  // Get bonus growth rate (defaults to salary growth if not set)
  const bonusGrowthRate = assumptions.bonusGrowthRate ?? assumptions.salaryGrowth;
  
  for (let age = currentAge; age <= endAge; age++) {
    // For the FIRST year (currentAge), store the starting point BEFORE any contributions or growth
    // This represents "time = 0" - the user's current financial state
    if (age === currentAge) {
      const taxAdvantaged = preTaxBalance + rothBalance + hsaBalance;
      const investable = taxAdvantaged + taxableBalance;
      const netWorth = investable + otherAssets - totalDebt;

      points.push({
        age,
        year: currentYear,
        totalNetWorth: netWorth,
        investableAssets: investable,
        preTaxBalance,
        rothBalance,
        taxableBalance,
        hsaBalance,
        taxAdvantaged,
        taxable: taxableBalance,
        isFire: false 
      });
      continue; // Skip contributions and growth for the starting point
    }

    // 1. Check Promotions and apply salary/bonus growth
    const yearsFromStart = age - currentAge;
    const promo = assumptions.promotions.find(p => p.yearOffset === yearsFromStart);
    if (promo) {
      projectedSalary = promo.newSalary;
      // Assume bonus grows proportionally with promotion
      if (state.income.salary > 0) {
        projectedBonus = state.income.bonus * (promo.newSalary / state.income.salary);
      }
    } else if (age > currentAge) {
      projectedSalary *= (1 + assumptions.salaryGrowth / 100);
      projectedBonus *= (1 + bonusGrowthRate / 100);
    }

    // 2. Calculate Cash Flow for this year with projected salary and bonus
    const tempState: AppState = {
      ...state,
      income: { ...state.income, salary: projectedSalary, bonus: projectedBonus }
    };
    
    const cf = calculateCashFlow(tempState);

    // 3. Add contributions or handle withdrawals
    if (age < fire.retirementAge) {
        // Route contributions to correct tax buckets
        // Pre-tax: 401k pre-tax + employer match + Traditional IRA
        preTaxBalance += cf.preTax401k + cf.employerMatch + cf.traditionalIra;
        
        // Roth: Roth 401k + Roth IRA + Mega-backdoor Roth conversions
        rothBalance += cf.roth401k + cf.rothIra + cf.megaBackdoorRoth;
        
        // HSA
        hsaBalance += cf.hsaContribution;
        
        // Taxable: Brokerage contributions + residual cash
        // Note: postTax401k (after-tax not converted) would ideally be tracked separately
        // but for simplicity, we add it to taxable since earnings are taxable
        const taxableContribution = cf.brokerageContribution + cf.residualCash + cf.postTax401k;
        
        // Add contributions to the primary brokerage account (or create one if none exists)
        // Contributions are assumed to go into the highest-return taxable account (stocks)
        const primaryBrokerage = Array.from(taxableBalances.entries())
          .filter(([, v]) => v.type === 'Brokerage')
          .sort((a, b) => b[1].expectedReturn - a[1].expectedReturn)[0];
        
        if (primaryBrokerage) {
          taxableBalances.set(primaryBrokerage[0], {
            ...primaryBrokerage[1],
            balance: primaryBrokerage[1].balance + taxableContribution
          });
        } else if (taxableBalances.size > 0) {
          // If no brokerage, add to the first taxable account
          const firstAccount = Array.from(taxableBalances.entries())[0];
          taxableBalances.set(firstAccount[0], {
            ...firstAccount[1],
            balance: firstAccount[1].balance + taxableContribution
          });
        } else {
          // Create a virtual brokerage account for contributions
          taxableBalances.set('virtual-brokerage', {
            balance: taxableContribution,
            expectedReturn: assumptions.marketReturn,
            type: 'Brokerage'
          });
        }
    } else {
        // Retirement withdrawals with tax-aware logic
        const annualExpenses = cf.fixedExpenses + cf.variableExpenses; 
        const inflationFactor = Math.pow(1 + assumptions.inflation / 100, age - currentAge);
        const nominalExpenses = annualExpenses * inflationFactor;
        
        let withdrawNeeded = nominalExpenses;
        const retirementTaxRate = (assumptions.retirementTaxRate ?? 20) / 100;
        
        // Withdrawal order: Taxable -> Pre-tax (with gross-up for taxes) -> Roth -> HSA
        
        // 1. Draw from taxable first (capital gains tax simplified as tax-free for now)
        // Withdraw from accounts in order: Cash first (0% return), then HYSA, then Brokerage
        const sortedTaxable = Array.from(taxableBalances.entries())
          .sort((a, b) => a[1].expectedReturn - b[1].expectedReturn); // Lowest return first
        
        for (const [id, account] of sortedTaxable) {
            if (withdrawNeeded <= 0) break;
            if (account.balance <= 0) continue;
            
            const withdrawAmount = Math.min(withdrawNeeded, account.balance);
            taxableBalances.set(id, { ...account, balance: account.balance - withdrawAmount });
            withdrawNeeded -= withdrawAmount;
        }
        taxableBalance = getTotalTaxable();
        
        // 2. Draw from pre-tax (must gross-up for income taxes)
        if (withdrawNeeded > 0 && preTaxBalance > 0) {
            // To get $X after tax, we need to withdraw $X / (1 - taxRate)
            const grossUpNeeded = withdrawNeeded / (1 - retirementTaxRate);
            const preTaxWithdraw = Math.min(grossUpNeeded, preTaxBalance);
            preTaxBalance -= preTaxWithdraw;
            // Net amount received after taxes
            const netFromPreTax = preTaxWithdraw * (1 - retirementTaxRate);
            withdrawNeeded -= netFromPreTax;
        }
        
        // 3. Draw from Roth (tax-free)
        if (withdrawNeeded > 0 && rothBalance > 0) {
            const rothWithdraw = Math.min(withdrawNeeded, rothBalance);
            rothBalance -= rothWithdraw;
            withdrawNeeded -= rothWithdraw;
        }
        
        // 4. Draw from HSA as last resort (tax-free for medical, penalty if not)
        if (withdrawNeeded > 0 && hsaBalance > 0) {
            const hsaWithdraw = Math.min(withdrawNeeded, hsaBalance);
            hsaBalance -= hsaWithdraw;
            withdrawNeeded -= hsaWithdraw;
        }
    }

    // 4. Apply growth to all accounts
    const returnRate = assumptions.marketReturn / 100;
    const taxDrag = assumptions.taxDrag / 100;
    
    // Tax-advantaged accounts grow at full market return
    preTaxBalance *= (1 + returnRate);
    rothBalance *= (1 + returnRate);
    hsaBalance *= (1 + returnRate);
    
    // Taxable accounts: Apply per-account returns with tax drag
    // Each account grows at its own rate (e.g., HYSA at 3%, stocks at 7%)
    // Tax drag only applies to investment accounts, not cash/HYSA (interest is taxed differently)
    taxableBalances.forEach((account, id) => {
      const accountReturn = account.expectedReturn / 100;
      // Apply tax drag only to investment accounts (Brokerage), not to cash/savings
      const effectiveDrag = account.type === 'Brokerage' ? taxDrag : 0;
      const effectiveReturn = accountReturn * (1 - effectiveDrag);
      
      taxableBalances.set(id, {
        ...account,
        balance: account.balance * (1 + effectiveReturn)
      });
    });
    
    // Update total taxable balance
    taxableBalance = getTotalTaxable();
    
    // Other assets grow at inflation rate
    otherAssets *= (1 + assumptions.inflation / 100);

    // 5. Store Point with full breakdown
    const taxAdvantaged = preTaxBalance + rothBalance + hsaBalance;
    const investable = taxAdvantaged + taxableBalance;
    const netWorth = investable + otherAssets - totalDebt;

    points.push({
        age,
        year: currentYear + (age - currentAge),
        totalNetWorth: netWorth,
        investableAssets: investable,
        preTaxBalance,
        rothBalance,
        taxableBalance,
        hsaBalance,
        taxAdvantaged,
        taxable: taxableBalance,
        isFire: false 
    });
  }
  
  return points;
};

export const calculateFireNumbers = (state: AppState) => {
  const { fire } = state;
  const targetNumber = fire.targetAnnualSpending / (fire.safeWithdrawalRate / 100);
  
  return {
    fireNumber: targetNumber,
    swrAmount: fire.targetAnnualSpending
  };
};

export interface FireReadiness {
  debtFree: {
    isPaidOff: boolean;
    totalDebt: number;
    highInterestDebt: number; // Debt with > 4-5% interest?
  };
  emergencyFund: {
    has3Months: boolean;
    has6Months: boolean;
    currentCash: number;
    target3Months: number;
    target6Months: number;
    monthsCovered: number;
  };
  match: {
    gettingFullMatch: boolean;
    matchAmount: number;
    hasMatchOffered: boolean;
  };
  rothIra: {
    isMaxed: boolean;
    currentContribution: number;
    limit: number;
  };
  work401k: {
    isMaxed: boolean;
    currentContribution: number;
    limit: number;
    breakdown: {
      preTax: number;
      roth: number;
      employerMatch: number;
      spillover: number;      // Automatic overflow from exceeded elections
      additional: number;     // Extra voluntary after-tax
      totalAfterTax: number;  // spillover + additional
      megaBackdoor: number;   // After-tax converted to Roth
      postTax: number;        // After-tax NOT converted
    };
    totalLimit: number;
    afterTaxRoom: number;     // Available room for additional after-tax
  };
  hsa: {
    enabled: boolean;
    isMaxed: boolean;
    currentContribution: number;
    limit: number;
  };
  brokerage: {
      hasAccount: boolean;
      balance: number;
  };
}

export const calculateFireReadiness = (state: AppState): FireReadiness => {
    const cf = calculateCashFlow(state);
    
    // 1. Debt
    // Filter out mortgage? Usually FIRE focuses on consumer debt, but "No Interest Debt" implies strictness.
    // Let's count all debt with interest > 0 as "Interest Debt".
    const interestDebt = state.liabilities.filter(l => l.interestRate > 0).reduce((sum, l) => sum + l.balance, 0);
    const totalDebt = state.liabilities.reduce((sum, l) => sum + l.balance, 0);

    // 2. Emergency Fund
    // Only count assets marked as "Cash (HYSA)"
    const currentCash = state.accounts
      .filter(a => a.type === 'Cash (HYSA)')
      .reduce((sum, a) => sum + a.balance, 0);
    const monthlyExpenses = (cf.fixedExpenses + cf.variableExpenses + cf.debtPayments) / 12;
    const target3Months = monthlyExpenses * 3;
    const target6Months = monthlyExpenses * 6;

    // 3. Match
    // To check if getting full match, we need to compare user contribution vs match limit
    // Match limit is X% of Salary.
    const salary = state.income.salary;
    const matchLimitPercent = state.retirementWork.employerMatch.matchLimit || 0;
    const matchTargetContrib = salary * (matchLimitPercent / 100);
    
    const userContrib401k = cf.preTax401k + cf.roth401k;
    const gettingFullMatch = userContrib401k >= matchTargetContrib;

    // 4. Roth IRA
    const rothLimit = IRS_LIMITS.IRA; // Simplification (income limits apply in reality but ignoring for now)
    const rothContrib = state.retirementPersonal.rothIraContribution;

    // 5. 401k Max
    const work401kLimit = state.retirementWork.maxEmployeeContribution || IRS_LIMITS.EMPLOYEE_401K;
    const totalPlanLimit = state.retirementWork.maxTotal401kLimit || IRS_LIMITS.TOTAL_401K;
    
    // 6. HSA
    const hsaLimit = IRS_LIMITS.HSA_FAMILY; // Should depend on plan type, assuming higher for safe upper bound check?
    // Or check if maxed relative to whatever limit is effective. Let's use the individual as baseline if not specified?
    // Actually let's just use 4300 for now or check state.
    // Let's assume individual for check unless we add a toggle.
    const hsaTarget = IRS_LIMITS.HSA_INDIVIDUAL; 

    // 7. Brokerage
    const brokerageBalance = state.accounts.filter(a => a.type === 'Brokerage').reduce((sum, a) => sum + a.balance, 0);

    return {
        debtFree: {
            isPaidOff: interestDebt === 0,
            totalDebt,
            highInterestDebt: interestDebt
        },
        emergencyFund: {
            has3Months: currentCash >= target3Months,
            has6Months: currentCash >= target6Months,
            currentCash,
            target3Months,
            target6Months,
            monthsCovered: monthlyExpenses > 0 ? currentCash / monthlyExpenses : 0
        },
        match: {
            gettingFullMatch,
            matchAmount: cf.employerMatch,
            hasMatchOffered: matchLimitPercent > 0
        },
        rothIra: {
            isMaxed: rothContrib >= rothLimit,
            currentContribution: rothContrib,
            limit: rothLimit
        },
        work401k: {
            isMaxed: userContrib401k >= work401kLimit,
            currentContribution: userContrib401k,
            limit: work401kLimit,
            breakdown: {
                preTax: cf.preTax401k,
                roth: cf.roth401k,
                employerMatch: cf.employerMatch,
                spillover: cf.spilloverAfterTax,
                additional: cf.additionalAfterTax,
                totalAfterTax: cf.totalAfterTax,
                megaBackdoor: cf.megaBackdoorRoth,
                postTax: cf.postTax401k
            },
            totalLimit: totalPlanLimit,
            afterTaxRoom: Math.max(0, totalPlanLimit - userContrib401k - cf.employerMatch - cf.spilloverAfterTax)
        },
        hsa: {
            enabled: state.hsa.enabled,
            isMaxed: state.hsa.employeeContribution >= hsaTarget,
            currentContribution: state.hsa.employeeContribution,
            limit: hsaTarget
        },
        brokerage: {
            hasAccount: brokerageBalance > 0,
            balance: brokerageBalance
        }
    };
};
