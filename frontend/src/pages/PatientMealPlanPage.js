/**
 * PatientMealPlanPage.js — Plano Alimentar do Paciente (somente leitura)
 *
 * Substitui o uso incorreto de MealPlanEditor em /patient/meal-plan.
 * O paciente NUNCA deve ver nem usar a interface de edição profissional.
 *
 * Este componente:
 *  - Busca o plano ativo do paciente via getPatientMealPlan
 *  - Exibe os dados em modo view-only (sem botões de edição, sem drag-and-drop)
 *  - Calcula os macros totais do dia selecionado
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Utensils, AlertCircle, Calendar, Flame, Beef, Wheat, Droplets } from 'lucide-react';
import { getPatientMealPlan } from '@/lib/supabase';

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = {
  monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta',
  thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo',
};

function sumMacro(items = [], key) {
  return items.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
}

function calcDayTotals(meals = []) {
  const all = meals.flatMap(m => m.items || m.foods || []);
  return {
    kcal: sumMacro(all, 'calories'),
    protein: sumMacro(all, 'protein'),
    carbs: sumMacro(all, 'carbs'),
    fat: sumMacro(all, 'fat'),
  };
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

const MacroBadge = ({ icon: Icon, label, value, unit, color }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${color}`}>
    <Icon size={16} />
    <span className="text-sm font-medium">{label}:</span>
    <span className="text-sm font-bold">{Math.round(value)} {unit}</span>
  </div>
);

const FoodRow = ({ food }) => {
  const name = food.customName || food.name || 'Alimento';
  const qty = food.quantity || food.amount || '';
  const unit = food.unit || 'g';
  const kcal = food.calories ? `${Math.round(food.calories)} kcal` : '';

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-2">
        <Utensils size={14} className="text-gray-400 shrink-0" />
        <span className="text-sm text-gray-800">{name}</span>
        {qty && (
          <span className="text-xs text-gray-500">
            — {qty} {unit}
          </span>
        )}
      </div>
      {kcal && (
        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
          {kcal}
        </span>
      )}
    </div>
  );
};

const MealCard = ({ meal }) => {
  const mealName = meal.name || meal.meal_name || 'Refeição';
  const items = meal.items || meal.foods || [];
  const time = meal.time || meal.meal_time || '';

  return (
    <Card className="mb-3 border border-gray-100 shadow-sm">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 text-sm">{mealName}</span>
          {time && (
            <Badge variant="outline" className="text-xs font-normal text-gray-500">
              {time}
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </CardHeader>

      {items.length > 0 && (
        <CardContent className="px-4 pb-3 pt-0 divide-y divide-gray-50">
          {items.map((food, idx) => (
            <FoodRow key={idx} food={food} />
          ))}
        </CardContent>
      )}

      {items.length === 0 && (
        <CardContent className="px-4 pb-3 pt-0">
          <p className="text-xs text-gray-400 italic">Sem alimentos cadastrados</p>
        </CardContent>
      )}
    </Card>
  );
};

const DayView = ({ dayData, dayKey }) => {
  const meals = dayData?.meals || [];
  const totals = calcDayTotals(meals);

  return (
    <div>
      {/* Macros do dia */}
      {meals.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <MacroBadge icon={Flame}   label="Calorias" value={totals.kcal}    unit="kcal" color="bg-orange-50 text-orange-700" />
          <MacroBadge icon={Beef}    label="Proteína"  value={totals.protein} unit="g"    color="bg-red-50 text-red-700" />
          <MacroBadge icon={Wheat}   label="Carboidr." value={totals.carbs}   unit="g"    color="bg-yellow-50 text-yellow-700" />
          <MacroBadge icon={Droplets} label="Gordura"  value={totals.fat}     unit="g"    color="bg-blue-50 text-blue-700" />
        </div>
      )}

      {meals.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Utensils size={36} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma refeição para este dia</p>
        </div>
      )}

      {meals.map((meal, idx) => (
        <MealCard key={idx} meal={meal} />
      ))}
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const PatientMealPlanPage = () => {
  const { user, profile } = useAuth();
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const patientId = user?.id || profile?.id;

  useEffect(() => {
    if (!patientId) return;

    const loadPlan = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await getPatientMealPlan(patientId);
        if (fetchError) {
          console.error('Erro ao carregar plano alimentar:', fetchError);
          setError('Não foi possível carregar seu plano alimentar.');
        } else {
          setPlanData(data || null);
        }
      } catch (err) {
        console.error('Erro inesperado:', err);
        setError('Erro ao carregar plano alimentar.');
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [patientId]);

  // ── Normalizar estrutura do plano ────────────────────────────────────────
  // O plano pode estar em planData.plan_data (JSON) ou diretamente em planData
  const rawPlan = planData?.plan_data || planData;

  // Tentar detectar a estrutura: { days: { monday: { meals: [...] } } }
  //                          ou: { meals: [...] } (estrutura plana)
  //                          ou: array de dias
  let days = {};

  if (rawPlan) {
    if (rawPlan.days && typeof rawPlan.days === 'object') {
      days = rawPlan.days;
    } else if (rawPlan.meals && Array.isArray(rawPlan.meals)) {
      // Estrutura plana: colocar como "general"
      days = { general: { meals: rawPlan.meals } };
    } else if (Array.isArray(rawPlan)) {
      // Array de dias
      rawPlan.forEach((d, i) => {
        const key = Object.keys(DAY_NAMES)[i] || `dia_${i + 1}`;
        days[key] = d;
      });
    }
  }

  const dayKeys = Object.keys(days);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Layout title="Meu Plano Alimentar">
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-emerald-500" size={36} />
        </div>
      )}

      {!loading && error && (
        <Card className="border-red-100 bg-red-50">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="text-red-500" size={24} />
            <p className="text-red-700 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && !planData && (
        <div className="text-center py-20">
          <Utensils size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Plano ainda não disponível</h3>
          <p className="text-sm text-gray-500">
            Seu plano alimentar ainda não foi criado pelo seu nutricionista.
          </p>
        </div>
      )}

      {!loading && !error && planData && (
        <div>
          {/* Cabeçalho do plano */}
          <Card className="mb-6 border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="py-5 px-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-emerald-800">
                    {planData.name || 'Plano Alimentar'}
                  </h2>
                  {planData.description && (
                    <p className="text-sm text-emerald-600 mt-1">{planData.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <Calendar size={16} />
                  <span className="text-sm font-medium">
                    {planData.updated_at
                      ? new Date(planData.updated_at).toLocaleDateString('pt-BR')
                      : 'Ativo'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dias */}
          {dayKeys.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">O plano ainda não possui refeições cadastradas.</p>
            </div>
          )}

          {dayKeys.length === 1 && dayKeys[0] === 'general' && (
            <DayView dayData={days.general} dayKey="general" />
          )}

          {dayKeys.length > 1 && (
            <Tabs defaultValue={dayKeys[0]}>
              <TabsList className="flex-wrap h-auto gap-1 mb-4">
                {dayKeys.map(key => (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    {DAY_NAMES[key] || key}
                  </TabsTrigger>
                ))}
              </TabsList>

              {dayKeys.map(key => (
                <TabsContent key={key} value={key}>
                  <DayView dayData={days[key]} dayKey={key} />
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Observações */}
          {planData.notes && (
            <Card className="mt-6 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Observações do nutricionista
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{planData.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </Layout>
  );
};

export default PatientMealPlanPage;
