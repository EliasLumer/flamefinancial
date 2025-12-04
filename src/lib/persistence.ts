import { AppState, DEFAULT_STATE } from "@/types/flame";

export const downloadStateAsJson = (state: AppState, customPlanName?: string) => {
  // If a custom plan name is provided, update the state's metadata before export
  const stateToExport = customPlanName 
    ? {
        ...state,
        metadata: {
          ...state.metadata,
          planName: customPlanName
        }
      }
    : state;
  
  const dataStr = JSON.stringify(stateToExport, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  // Use custom name for filename if provided, otherwise use plan name from state or default
  const planNameForFile = customPlanName || state.metadata.planName || 'flame-plan';
  const sanitizedName = planNameForFile.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const exportFileDefaultName = `${sanitizedName}-${new Date().toISOString().slice(0, 10)}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

export const validateAndParseState = (jsonString: string): { valid: boolean; data?: AppState; error?: string } => {
  try {
    const parsed = JSON.parse(jsonString);

    // Basic validation check (duck typing)
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Invalid JSON object' };
    }

    // Check for key required fields from AppState
    const requiredKeys: (keyof AppState)[] = [
      'income', 'tax', 'retirementWork', 'retirementPersonal', 
      'hsa', 'education529', 'expenses', 'accounts', 
      'liabilities', 'assumptions', 'fire'
    ];

    const missingKeys = requiredKeys.filter(key => !(key in parsed));
    if (missingKeys.length > 0) {
      return { valid: false, error: `Missing required sections: ${missingKeys.join(', ')}` };
    }

    // We could do deeper validation with Zod later, but this covers "is this a flame file?"
    return { valid: true, data: parsed as AppState };
  } catch (e) {
    return { valid: false, error: 'Failed to parse JSON' };
  }
};

