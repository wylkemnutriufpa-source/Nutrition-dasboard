/**
 * API client para chamadas ao backend FastAPI
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export async function apiCall<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'POST', body, headers = {} } = options;
  
  // Get auth token from Supabase session
  const token = localStorage.getItem('sb-ifuiiycfrehjnmlzletw-auth-token');
  let accessToken = '';
  if (token) {
    try {
      const parsed = JSON.parse(token);
      accessToken = parsed.access_token || '';
    } catch {
      // Ignore parse errors
    }
  }

  const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...headers,
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// Specific API endpoints
export const api = {
  generateMealPlan: (patientId: string, mealPlanId: string) =>
    apiCall('/generate-meal-plan', {
      body: { patient_id: patientId, meal_plan_id: mealPlanId },
    }),

  generateReport: (patientId: string, nutritionistId: string, reportType: string = 'complete') =>
    apiCall('/generate-report', {
      body: { patient_id: patientId, nutritionist_id: nutritionistId, report_type: reportType },
    }),

  programInsights: (data: {
    patient_name: string;
    current_phase: string;
    weight_history?: number[];
    waist_history?: number[];
    adherence_history?: number[];
    habits_data?: Record<string, any>;
    anamnesis_summary?: string;
  }) =>
    apiCall('/program-insights', { body: data }),

  clinicalInsights: (patients: any[]) =>
    apiCall('/clinical-insights', { body: { patients } }),

  processPayment: (data: {
    plan_id: string;
    plan_slug: string;
    gateway: string;
    billing_cycle: string;
    amount: number;
  }) =>
    apiCall('/process-payment', { body: data }),
};
