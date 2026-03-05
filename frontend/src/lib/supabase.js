import { createClient } from '@supabase/supabase-js';
import { extractSafeSupabaseError } from './supabaseErrorHandler';
import { safeFetch } from '@/lib/safeFetch';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found.');
}

// SINGLETON: garantir que o client seja criado apenas uma vez
let supabaseInstance = null;

const createSupabaseClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Evitar múltiplas detecções
      flowType: 'pkce', // Mais seguro que implicit
      // Storage customizado com tratamento de erros
      storage: {
        getItem: (key) => {
          try {
            return window.localStorage.getItem(key);
          } catch (error) {
            console.warn('Storage getItem error:', error);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            window.localStorage.setItem(key, value);
          } catch (error) {
            console.warn('Storage setItem error:', error);
          }
        },
        removeItem: (key) => {
          try {
            window.localStorage.removeItem(key);
          } catch (error) {
            console.warn('Storage removeItem error:', error);
          }
        }
      }
    }
  });

  return supabaseInstance;
};

// Exportar o client singleton
export const supabase = createSupabaseClient();

// ==================== AUTH HELPERS ====================

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
};

export const getUserProfile = async (userId) => {
  console.log('🔍 Buscando profile para userId:', userId);
  
  try {
    // Tentar buscar por id
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // maybeSingle() não lança erro se não encontrar
    
    if (error) {
      console.error('❌ Erro ao buscar profile:', error);
      
      // Se erro 406, pode ser problema de RLS ou perfil não existe
      if (error.code === 'PGRST116' || error.message.includes('406')) {
        console.warn('⚠️ Profile não encontrado ou bloqueado por RLS');
        
        // Tentar criar perfil automaticamente
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          console.log('🔧 Tentando criar profile automaticamente...');
          return await createMissingProfile(user);
        }
      }
      
      return null;
    }
    
    if (!data) {
      console.warn('⚠️ Profile não encontrado no banco');
      // Tentar criar perfil automaticamente
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        console.log('🔧 Tentando criar profile automaticamente...');
        return await createMissingProfile(user);
      }
      return null;
    }
    
    console.log('✅ Profile encontrado:', data.email, 'Role:', data.role);
    return data;
    
  } catch (error) {
    console.error('❌ Erro fatal ao buscar profile:', error);
    return null;
  }
};

// Criar perfil faltante automaticamente
const createMissingProfile = async (authUser) => {
  try {
    console.log('🆕 Criando profile para:', authUser.email);
    
    // Verificar se já existe por email
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', authUser.email)
      .maybeSingle();
    
    if (existing) {
      console.log('✅ Profile já existe (encontrado por email)');
      return existing;
    }
    
    // Criar novo profile com role visitor por padrão
    // Admin precisa promover para professional ou admin depois
    const newProfile = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name || authUser.email.split('@')[0],
      role: 'visitor', // Papel padrão, admin pode alterar depois
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar profile:', error);
      return null;
    }
    
    console.log('✅ Profile criado com sucesso');
    return data;
    
  } catch (error) {
    console.error('❌ Erro fatal ao criar profile:', error);
    return null;
  }
};

export const signIn = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  try {
    // Limpar localStorage ANTES do signOut
    localStorage.removeItem('fitjourney_user_type');
    localStorage.removeItem('fitjourney_user_email');
    localStorage.removeItem('fitjourney_user_id');
    localStorage.removeItem('fitjourney_patient_id');
    localStorage.removeItem('fitjourney_patient_name');
    
    // Fazer signOut no Supabase
    const result = await supabase.auth.signOut();
    
    console.log('✅ Logout completo');
    return result;
  } catch (error) {
    console.error('❌ Erro no signOut:', error);
    // Mesmo com erro, garantir limpeza local
    return { data: null, error };
  }
};

export const updatePassword = async (newPassword) => {
  console.log('🔐 Atualizando senha...');
  
  try {
    const result = await supabase.auth.updateUser({
      password: newPassword
    }).catch(err => {
      // Capturar erro do Supabase sem processar
      return { data: null, error: { message: 'Erro ao atualizar senha' } };
    });
    
    if (result.error) {
      console.error('❌ Erro ao atualizar senha');
      return { success: false, error: { message: 'Erro ao atualizar senha' } };
    }
    
    console.log('✅ Senha atualizada com sucesso');
    return { success: true, error: null };
    
  } catch (error) {
    console.error('❌ Erro fatal');
    return { success: false, error: { message: 'Erro fatal ao atualizar senha' } };
  }
};

// ==================== PROFILE HELPERS ====================

export const getProfileById = async (profileId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .is('deleted_at', null)
    .single();
  return { data, error };
};

export const updateProfile = async (profileId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();
  return { data, error };
};

// ==================== PATIENTS MANAGEMENT ====================

// Buscar pacientes do profissional (ou todos se admin)
export const getProfessionalPatients = async (professionalId, isAdmin = false, filters = {}) => {
  console.log('📋 Buscando pacientes do profissional:', professionalId);
  
  try {
    // Buscar pela tabela patient_profiles com JOIN em profiles
    let query = supabase
      .from('patient_profiles')
      .select('*, patient:profiles!patient_id(*)');
    
    // Se não for admin, filtrar por profissional
    if (!isAdmin) {
      query = query.eq('professional_id', professionalId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar pacientes:', error);
      return { data: [], error };
    }
    
    console.log(`✅ ${data?.length || 0} pacientes encontrados`);
    return { data: data || [], error: null };
    
  } catch (err) {
    console.error('❌ Erro fatal:', err);
    return { data: [], error: err };
  }
};

export const getPatientById = async (patientId) => {
  try {
    // Buscar dados do paciente
    const { data: patientData, error: patientError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', patientId)
      .eq('role', 'patient')
      .is('deleted_at', null)
      .single();
    
    if (patientError) return { data: null, error: patientError };
    
    // Buscar professional_id via patient_profiles
    const { data: linkData } = await supabase
      .from('patient_profiles')
      .select('professional_id')
      .eq('patient_id', patientId)
      .maybeSingle();
    
    // Combinar dados
    const data = {
      ...patientData,
      professional_id: linkData?.professional_id || null
    };
    
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const createPatientByProfessional = async (professionalId, patientData) => {
  console.log('🆕 Criando paciente...');
  
  const patientId = crypto.randomUUID();
  
  try {
    // WORKAROUND: Se Supabase Auth estiver falhando, criar paciente SEM login
    // Isso permite que o profissional gerencie o paciente, mas o paciente não consegue fazer login
    const USE_BYPASS = true; // Alterar para false quando Auth estiver funcionando
    
    if (USE_BYPASS) {
      console.log('🔄 Usando bypass do Supabase Auth (criando paciente sem login)');
      console.log('📧 Email para criar:', patientData.email);
      
      // NÃO verificar email duplicado aqui (RLS bloqueia SELECT genérico)
      // O banco vai retornar erro 23505 se email já existir
      
      // Criar profile diretamente (sem auth)
      const newPatientId = crypto.randomUUID();
      
      console.log('🔨 Tentando criar profile com ID:', newPatientId);
      console.log('📝 Dados:', {
        id: newPatientId,
        email: patientData.email,
        name: patientData.name,
        role: 'patient'
      });
      
      try {
        console.log('⏳ Enviando INSERT para Supabase...');
        
        const { data: createdProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: newPatientId,
            email: patientData.email,
            name: patientData.name,
            phone: patientData.phone || null,
            role: 'patient',
            status: 'active',
            plan_type: 'basic'
          })
          .select()
          .single();
        
        console.log('📬 Resposta recebida do Supabase');
        console.log('📊 createdProfile:', createdProfile);
        console.log('📊 profileError:', profileError);
        
        if (profileError) {
          console.error('❌ Erro ao criar profile');
          
          // NÃO acessar NENHUMA propriedade que cause body stream read
          // Usar apenas toString() ou type checking básico
          const errorString = String(profileError);
          const isAuthError = profileError?.__isAuthError === true;
          
          console.error('📊 Erro (string):', errorString);
          console.error('📊 É AuthError?:', isAuthError);
          
          // Verificar padrões na string sem acessar propriedades
          if (errorString.includes('duplicate') || errorString.includes('23505')) {
            return { 
              data: null, 
              error: { 
                message: '❌ Email já cadastrado no sistema.',
                code: 'EMAIL_EXISTS'
              } 
            };
          }
          
          if (errorString.includes('permission') || errorString.includes('policy') || errorString.includes('42501')) {
            return { 
              data: null, 
              error: { 
                message: `❌ Erro de permissão RLS.

Execute no Supabase Dashboard → SQL Editor:
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

Depois teste novamente.`,
                code: 'PERMISSION_DENIED'
              } 
            };
          }
          
          // Erro genérico SEM acessar propriedades
          return { 
            data: null, 
            error: { 
              message: `❌ Erro ao criar perfil no banco de dados.

Possível causa: RLS (Row Level Security) bloqueando INSERT.

Solução: Desabilite RLS temporariamente:
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;`,
              code: 'INSERT_ERROR'
            } 
          };
        }
        
        console.log('✅ Profile criado (modo bypass):', newPatientId);
      } catch (profileException) {
        console.error('❌ EXCEÇÃO ao criar profile:', profileException);
        console.error('📋 Exception name:', profileException.name);
        console.error('📋 Exception message:', profileException.message);
        console.error('📋 Exception stack:', profileException.stack);
        
        return {
          data: null,
          error: {
            message: `❌ Exceção ao criar perfil: ${profileException.message}`,
            code: 'EXCEPTION'
          }
        };
      }
      
      // Criar vínculo
      try {
        await supabase
          .from('patient_profiles')
          .insert({
            patient_id: newPatientId,
            professional_id: professionalId
          });
        console.log('✅ Vínculo criado');
      } catch (linkErr) {
        console.warn('⚠️ Vínculo não criado:', linkErr);
      }
      
      // Criar anamnese se tiver dados
      if (patientData.birth_date || patientData.gender || patientData.height) {
        try {
          await supabase.from('anamnesis').insert({
            patient_id: newPatientId,
            professional_id: professionalId,
            birth_date: patientData.birth_date,
            gender: patientData.gender,
            height: patientData.height,
            current_weight: patientData.current_weight,
            goal_weight: patientData.goal_weight,
            goal: patientData.goal,
            notes: patientData.notes
          });
          console.log('✅ Anamnese criada');
        } catch (anamErr) {
          console.warn('⚠️ Anamnese não criada:', anamErr);
        }
      }
      
      // Criar assinatura se dados foram fornecidos
      if (patientData.packageType || patientData.tier) {
        try {
          await upsertPatientSubscription(newPatientId, professionalId, {
            package_type: patientData.packageType || 'mensal',
            tier: patientData.tier || 'basic',
            start_date: patientData.startDate || new Date().toISOString().split('T')[0],
            end_date: patientData.endDate || null,
            amount_paid: patientData.amountPaid || null,
            status: 'active',
            current_plan_name: 'Plano Inicial'
          });
          console.log('✅ Assinatura criada');
        } catch (subscErr) {
          console.warn('⚠️ Assinatura não criada:', subscErr);
        }
      }
      
      return {
        data: {
          id: newPatientId,
          email: patientData.email,
          name: patientData.name,
          bypass_mode: true // Indica que foi criado sem auth
        },
        error: null
      };
    }
    
    // MODO NORMAL: Criar usuário no Supabase Auth (com senha)
    if (patientData.password) {
      let authUserId = null;
      
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: patientData.email,
          password: patientData.password,
          options: {
            data: {
              name: patientData.name,
              role: 'patient'
            }
          }
        });

        if (authError) {
          console.error('❌ Erro auth detectado');
          console.error('📊 authError completo:', authError);
          console.error('📊 authError.message:', authError?.message);
          console.error('📊 authError.status:', authError?.status);
          console.error('📊 authError.__isAuthError:', authError?.__isAuthError);
          
          const errorMsg = String(authError?.message || '').toLowerCase();
          
          // CASO 1: Body stream already read = Erro 500 do Supabase (SDK já consumiu o body)
          if (errorMsg.includes('body stream already read')) {
            console.error('🔍 DIAGNÓSTICO: Erro 500 do Supabase Auth (body já lido pelo SDK)');
            console.error('💡 CAUSA PROVÁVEL: Email já existe OU configuração de Auth incorreta');
            
            return { 
              data: null, 
              error: { 
                message: `⚠️ Erro ao criar conta. Possíveis causas:
                
1. Este email já está cadastrado no sistema
2. Configuração de confirmação de email no Supabase
3. Problema temporário do servidor Supabase

🔧 Solução sugerida: Tente com um email diferente ou verifique as configurações de Auth no Supabase Dashboard.`,
                details: 'Supabase Auth retornou erro 500 (Internal Server Error)',
                code: 'AUTH_500_BODY_CONSUMED'
              } 
            };
          }
          
          // CASO 2: Erro 500 com status definido
          if (authError.status === 500 || errorMsg.includes('500') || errorMsg.includes('internal server')) {
            return { 
              data: null, 
              error: { 
                message: 'Erro do servidor Supabase. Tente novamente em alguns segundos ou use um email diferente.',
                details: authError.message || 'Erro 500 do Supabase Auth',
                code: 'AUTH_500_ERROR'
              } 
            };
          }
          
          // CASO 3: Email já existe
          if (errorMsg.includes('already registered') || errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
            return {
              data: null,
              error: {
                message: 'Este email já está cadastrado no sistema.',
                code: 'EMAIL_EXISTS'
              }
            };
          }
          
          // CASO 4: Senha fraca
          if (errorMsg.includes('password') && (errorMsg.includes('short') || errorMsg.includes('weak') || errorMsg.includes('length'))) {
            return {
              data: null,
              error: {
                message: 'Senha muito curta. Use pelo menos 6 caracteres.',
                code: 'WEAK_PASSWORD'
              }
            };
          }
          
          // CASO 5: Rate limit
          if (errorMsg.includes('rate') || errorMsg.includes('too many')) {
            return {
              data: null,
              error: {
                message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
                code: 'RATE_LIMIT'
              }
            };
          }
          
          // CASO 6: Erro genérico
          const safeError = extractSafeError(authError);
          return { data: null, error: safeError };
        } else {
          console.log('✅ Auth criado:', authData.user?.id);
          authUserId = authData.user?.id;
        }
      } catch (authException) {
        console.error('❌ Exceção no Auth:', authException);
        console.error('📋 Exception stack:', authException.stack);
        
        // Retornar erro em vez de fallback silencioso
        return {
          data: null,
          error: {
            message: 'Erro inesperado ao criar conta. Tente novamente.',
            details: authException.message,
            code: 'AUTH_EXCEPTION'
          }
        };
      }
      
      if (authUserId) {
        // 2. Atualizar/criar profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authUserId,
            email: patientData.email,
            name: patientData.name,
            phone: patientData.phone || null,
            role: 'patient',
            status: 'active'
          });
        
        if (profileError) {
          console.error('❌ Erro profile:', profileError);
          return { data: null, error: { message: 'Erro ao criar perfil' } };
        }
        
        console.log('✅ Profile criado/atualizado');
        
        // 3. Criar vínculo
        try {
          await supabase
            .from('patient_profiles')
            .insert({
              patient_id: authUserId,
              professional_id: professionalId
            });
          console.log('✅ Vínculo criado');
        } catch (linkErr) {
          console.warn('⚠️ Vínculo não criado');
        }
        
        // 4. Anamnese (opcional)
        try {
          await supabase.from('anamnesis').insert({
            patient_id: authUserId,
            professional_id: professionalId,
            birth_date: patientData.birth_date,
            gender: patientData.gender,
            height: patientData.height,
            current_weight: patientData.current_weight,
            goal_weight: patientData.goal_weight,
            goal: patientData.goal,
            notes: patientData.notes
          });
          console.log('✅ Anamnese criada');
        } catch (anamErr) {
          console.warn('⚠️ Anamnese não criada');
        }
        
        // 5. Criar assinatura se dados foram fornecidos
        if (patientData.packageType || patientData.tier) {
          try {
            await upsertPatientSubscription(authUserId, professionalId, {
              package_type: patientData.packageType || 'mensal',
              tier: patientData.tier || 'basic',
              start_date: patientData.startDate || new Date().toISOString().split('T')[0],
              end_date: patientData.endDate || null,
              amount_paid: patientData.amountPaid || null,
              status: 'active',
              current_plan_name: 'Plano Inicial'
            });
            console.log('✅ Assinatura criada');
          } catch (subscErr) {
            console.warn('⚠️ Assinatura não criada:', subscErr);
          }
        }
        
        return { 
          data: { 
            id: authUserId, 
            email: patientData.email, 
            name: patientData.name 
          }, 
          error: null 
        };
      }
    }
    
    return { data: null, error: { message: 'Senha é obrigatória' } };
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
    return { data: null, error: { message: error.message || 'Erro ao criar paciente' } };
  }
};

export const updatePatient = async (patientId, updates) => {
  console.log('✏️ Atualizando paciente...', { patientId });
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', patientId)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('❌ Erro ao atualizar paciente');
      return { data: null, error: { message: 'Erro ao atualizar paciente' } };
    }
    
    console.log('✅ Paciente atualizado');
    return { data, error: null };
  } catch (error) {
    console.error('❌ Erro fatal ao atualizar paciente');
    return { data: null, error: { message: 'Erro fatal ao atualizar paciente' } };
  }
};

// Soft delete
export const archivePatient = async (patientId) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
    .eq('id', patientId)
    .select()
    .single();
  return { data, error };
};

// Restaurar paciente
export const restorePatient = async (patientId) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ deleted_at: null, status: 'active' })
    .eq('id', patientId)
    .select()
    .single();
  return { data, error };
};

// ==================== ANAMNESIS ====================

export const getAnamnesis = async (patientId) => {
  const { data, error } = await supabase
    .from('anamnesis')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
};

// Whitelist centralizada de campos da tabela anamnesis
const VALID_ANAMNESIS_FIELDS = [
  'patient_id', 'professional_id', 'medical_conditions', 'allergies',
  'food_intolerances', 'smoking', 'alcohol', 'sleep_hours', 'stress_level', 'water_intake',
  'meals_per_day', 'food_preference', 'favorite_foods',
  'exercises_regularly', 'physical_activity_level', 'sports_goal',
  'status', 'last_edited_by', 'updated_at', 'created_at',
  'medications', 'supplements', 'digestive_issues', 'menstrual_cycle',
  'pregnancy', 'breastfeeding', 'chronic_diseases', 'surgeries',
  'family_history', 'eating_habits', 'dietary_restrictions',
  'cooking_skills', 'budget', 'meal_prep_time', 'dining_out_frequency',
  'main_goal', 'notes', 'disliked_foods', 'breakfast_habits',
  'lunch_habits', 'dinner_habits', 'snack_habits', 'weekend_eating',
  'work_schedule', 'appetite', 'bowel_frequency', 'constipation',
  'bloating', 'heartburn', 'nausea', 'food_cravings', 'emotional_eating'
];

// Campos que NÃO pertencem à tabela anamnesis
const IGNORED_ANAMNESIS_FIELDS = [
  'current_weight', 'height', 'goal_weight', 'goal', 'birth_date', 
  'gender', 'phone', 'id', 'name', 'email'
];

/**
 * Limpa payload removendo campos inválidos para a tabela anamnesis
 */
const cleanAnamnesisPayload = (data) => {
  return Object.keys(data)
    .filter(key => VALID_ANAMNESIS_FIELDS.includes(key) && !IGNORED_ANAMNESIS_FIELDS.includes(key))
    .reduce((obj, key) => { obj[key] = data[key]; return obj; }, {});
};

/**
 * Extrai erro seguro sem acessar body do Response (previne "body stream already read")
 */
const extractSafeError = (error) => {
  if (!error) return { message: 'Erro desconhecido' };
  // NUNCA acessar response.text() ou response.json() - usar apenas propriedades diretas
  const safe = { message: 'Erro ao salvar', code: '', details: '', hint: '' };
  try { safe.message = String(error.message || error || 'Erro ao salvar'); } catch (_) {}
  try { safe.code = String(error.code || ''); } catch (_) {}
  try { safe.details = String(error.details || ''); } catch (_) {}
  try { safe.hint = String(error.hint || ''); } catch (_) {}
  return safe;
};

/**
 * Executa operação Supabase com retry automático (até 2 tentativas)
 */
const withRetry = async (fn, maxRetries = 2) => {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (result.error) {
        lastError = result.error;
        console.warn(`⚠️ Tentativa ${attempt + 1} falhou:`, extractSafeError(result.error));
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1))); // Backoff
          continue;
        }
        return { data: null, error: extractSafeError(lastError) };
      }
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Exceção tentativa ${attempt + 1}:`, String(err.message || err));
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
    }
  }
  return { data: null, error: extractSafeError(lastError) };
};

export const createAnamnesis = async (data) => {
  // VALIDATE
  if (!data.patient_id || !data.professional_id) {
    return { data: null, error: { message: 'patient_id e professional_id são obrigatórios' } };
  }

  const cleanPayload = cleanAnamnesisPayload(data);
  console.log('📤 Anamnese payload:', Object.keys(cleanPayload).length, 'campos');

  try {
    // Verificar se já existe (upsert)
    const { data: existing } = await supabase
      .from('anamnesis')
      .select('id')
      .eq('patient_id', data.patient_id)
      .maybeSingle();

    if (existing) {
      console.log('📝 Anamnese existente, atualizando:', existing.id);
      return await updateAnamnesis(existing.id, data);
    }

    // Criar nova com retry
    return await withRetry(async () => {
      const { data: result, error } = await supabase
        .from('anamnesis')
        .insert({ ...cleanPayload, created_at: new Date().toISOString() })
        .select()
        .maybeSingle();
      
      if (error) return { data: null, error };
      console.log('✅ Anamnese criada com sucesso!');
      return { data: result, error: null };
    });
  } catch (err) {
    return { data: null, error: extractSafeError(err) };
  }
};

export const updateAnamnesis = async (anamnesisId, updates) => {
  const cleanUpdates = cleanAnamnesisPayload(updates);
  
  // Remover campos que não devem estar no update
  delete cleanUpdates.patient_id;
  delete cleanUpdates.professional_id;
  delete cleanUpdates.created_at;

  console.log('🔄 Atualizando anamnese:', anamnesisId, '| Campos:', Object.keys(cleanUpdates).length);

  return await withRetry(async () => {
    const { data, error } = await supabase
      .from('anamnesis')
      .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
      .eq('id', anamnesisId)
      .select()
      .maybeSingle();

    if (error) return { data: null, error };
    console.log('✅ Anamnese atualizada com sucesso');
    return { data, error: null };
  });
};

export const saveAnamnesisDraft = async (patientId, professionalId, updates) => {
  // Verificar se existe
  const { data: existing } = await supabase
    .from('anamnesis')
    .select('id')
    .eq('patient_id', patientId)
    .maybeSingle();
  
  if (existing) {
    return await updateAnamnesis(existing.id, { ...updates, status: 'draft' });
  } else {
    return await createAnamnesis({ ...updates, patient_id: patientId, professional_id: professionalId, status: 'draft' });
  }
};


// Excluir anamnese (para começar nova)
export const deleteAnamnesis = async (anamnesisId) => {
  const { data, error } = await supabase
    .from('anamnesis')
    .delete()
    .eq('id', anamnesisId)
    .select()
    .single();
  return { data, error };
};


// ==================== DRAFT MEAL PLAN (PRÉ-PLANO) ====================

/**
 * Salva pré-plano gerado pela anamnese inteligente
 * Visível apenas para profissionais
 */
export const saveDraftMealPlan = async (patientId, professionalId, draftPlan) => {
  try {
    // Verificar se já existe um draft para este paciente
    const { data: existing } = await supabase
      .from('draft_meal_plans')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle();
    
    if (existing) {
      // Atualizar existente
      const { data, error } = await supabase
        .from('draft_meal_plans')
        .update({
          professional_id: professionalId,
          draft_data: draftPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar draft_meal_plan:', error);
      }
      return { data, error };
    } else {
      // Criar novo
      const { data, error } = await supabase
        .from('draft_meal_plans')
        .insert({
          patient_id: patientId,
          professional_id: professionalId,
          draft_data: draftPlan,
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar draft_meal_plan:', error);
      }
      return { data, error };
    }
  } catch (err) {
    console.error('Erro em saveDraftMealPlan:', err);
    return { data: null, error: err };
  }
};

/**
 * Busca pré-plano do paciente
 */
export const getDraftMealPlan = async (patientId) => {
  const { data, error } = await supabase
    .from('draft_meal_plans')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();
  return { data, error };
};

/**
 * Atualiza pré-plano (quando profissional edita)
 */
export const updateDraftMealPlan = async (patientId, updates) => {
  const { data, error } = await supabase
    .from('draft_meal_plans')
    .update({
      draft_data: updates,
      updated_at: new Date().toISOString()
    })
    .eq('patient_id', patientId)
    .select()
    .single();
  return { data, error };
};

/**
 * Cria dicas automáticas baseadas no pré-plano
 */
export const createAutomaticTips = async (patientId, professionalId, tips) => {
  const tipsToInsert = tips.map(tip => ({
    patient_id: patientId,
    professional_id: professionalId,
    title: tip.title,
    content: tip.content,
    category: 'nutrition',
    is_active: true,
    auto_generated: true
  }));

  const { data, error } = await supabase
    .from('tips')
    .insert(tipsToInsert)
    .select();
  
  return { data, error };
};

// Criar dica personalizada especial (fica destacada no topo)
export const createPersonalizedTip = async (patientId, professionalId, personalizedTip) => {
  try {
    // Primeiro, desativar dicas personalizadas antigas deste paciente
    await supabase
      .from('tips')
      .update({ is_active: false })
      .eq('patient_id', patientId)
      .eq('category', 'personalized');
    
    // Criar nova dica personalizada
    const { data, error } = await supabase
      .from('tips')
      .insert({
        patient_id: patientId,
        professional_id: professionalId,
        title: personalizedTip.title,
        content: personalizedTip.content,
        category: 'personalized',
        is_active: true,
        auto_generated: true,
        is_pinned: true // Fica fixada no topo
      })
      .select()
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('Erro ao criar dica personalizada:', err);
    return { data: null, error: err };
  }
};


// Buscar dicas personalizadas do paciente
export const getPatientPersonalizedTips = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);
    
    return { data, error };
  } catch (err) {
    console.error('Erro ao buscar dicas personalizadas:', err);
    return { data: [], error: err };
  }
};


// ==================== CHECKLIST / TASKS ====================

export const getChecklistTemplates = async (patientId) => {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .order('order_index');
  return { data, error };
};

export const createChecklistTemplate = async (templateData) => {
  const { data, error } = await supabase
    .from('checklist_templates')
    .insert(templateData)
    .select()
    .single();
  return { data, error };
};

export const updateChecklistTemplate = async (templateId, updates) => {
  const { data, error } = await supabase
    .from('checklist_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();
  return { data, error };
};

export const deleteChecklistTemplate = async (templateId) => {
  const { error } = await supabase
    .from('checklist_templates')
    .update({ is_active: false })
    .eq('id', templateId);
  return { error };
};


// ==================== DICAS E TAREFAS GLOBAIS DO PROFISSIONAL ====================

// Criar dica global (aparece para todos os pacientes do profissional)
export const createGlobalTip = async (professionalId, tip) => {
  const { data, error } = await supabase
    .from('global_tips')
    .insert({
      professional_id: professionalId,
      tip: tip,
      is_active: true
    })
    .select()
    .single();
  return { data, error };
};

// Buscar dicas globais do profissional
export const getGlobalTips = async (professionalId) => {
  const { data, error } = await supabase
    .from('global_tips')
    .select('*')
    .eq('professional_id', professionalId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

// Deletar dica global
export const deleteGlobalTip = async (tipId) => {
  const { error } = await supabase
    .from('global_tips')
    .update({ is_active: false })
    .eq('id', tipId);
  return { error };
};

// Criar tarefa global (aparece para todos os pacientes do profissional)
export const createGlobalTask = async (professionalId, title) => {
  const { data, error } = await supabase
    .from('global_tasks')
    .insert({
      professional_id: professionalId,
      title: title,
      is_active: true
    })
    .select()
    .single();
  return { data, error };
};

// Buscar tarefas globais do profissional
export const getGlobalTasks = async (professionalId) => {
  const { data, error } = await supabase
    .from('global_tasks')
    .select('*')
    .eq('professional_id', professionalId)
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  return { data: data || [], error };
};

// Deletar tarefa global
export const deleteGlobalTask = async (taskId) => {
  const { error } = await supabase
    .from('global_tasks')
    .update({ is_active: false })
    .eq('id', taskId);
  return { error };
};


export const getChecklistEntries = async (patientId, startDate, endDate) => {
  const { data, error } = await supabase
    .from('checklist_entries')
    .select(`
      *,
      template:checklist_templates(*)
    `)
    .eq('patient_id', patientId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });
  return { data, error };
};

export const getChecklistEntriesForDate = async (patientId, date) => {
  const { data, error } = await supabase
    .from('checklist_entries')
    .select(`
      *,
      template:checklist_templates(*)
    `)
    .eq('patient_id', patientId)
    .eq('date', date);
  return { data, error };
};

export const toggleChecklistEntry = async (templateId, patientId, date, completed) => {
  // Upsert: criar se não existe, atualizar se existe
  const { data, error } = await supabase
    .from('checklist_entries')
    .upsert({
      template_id: templateId,
      patient_id: patientId,
      date: date,
      completed: completed,
      completed_at: completed ? new Date().toISOString() : null
    }, {
      onConflict: 'template_id,patient_id,date'
    })
    .select()
    .single();
  return { data, error };
};


// Buscar feedbacks do paciente
export const getPatientFeedbacks = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    return { data: data || [], error };
  } catch (err) {
    console.error('Erro ao buscar feedbacks:', err);
    return { data: [], error: err };
  }
};

// Enviar resposta de feedback do paciente
export const sendFeedbackReply = async (feedbackId, replyText) => {
  try {
    const { data, error } = await supabase
      .from('feedbacks')
      .update({ 
        patient_response: replyText,
        patient_response_at: new Date().toISOString()
      })
      .eq('id', feedbackId)
      .select()
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('Erro ao enviar resposta:', err);
    return { data: null, error: err };
  }
};


// Calcular aderência simples (para o resumo do paciente)
export const getChecklistAdherence = async (patientId, days = 7) => {
  // Para MVP simples, apenas contar tarefas completas vs totais
  const { data: tasks } = await supabase
    .from('checklist_tasks')
    .select('*')
    .eq('patient_id', patientId);
  
  if (!tasks || tasks.length === 0) {
    return { adherence: 0, completed: 0, total: 0 };
  }
  
  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const adherence = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { adherence, completed, total };
};

// ==================== PATIENT MESSAGES / TIPS ====================

export const getPatientMessages = async (patientId, onlyActive = true) => {
  let query = supabase
    .from('patient_messages')
    .select('*')
    .eq('patient_id', patientId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (onlyActive) {
    const today = new Date().toISOString().split('T')[0];
    query = query
      .lte('valid_from', today)
      .or(`valid_until.is.null,valid_until.gte.${today}`);
  }
  
  const { data, error } = await query;
  return { data, error };
};

export const createPatientMessage = async (messageData) => {
  const { data, error } = await supabase
    .from('patient_messages')
    .insert(messageData)
    .select()
    .single();
  return { data, error };
};

export const updatePatientMessage = async (messageId, updates) => {
  const { data, error } = await supabase
    .from('patient_messages')
    .update(updates)
    .eq('id', messageId)
    .select()
    .single();
  return { data, error };
};

export const deletePatientMessage = async (messageId) => {
  const { error } = await supabase
    .from('patient_messages')
    .delete()
    .eq('id', messageId);
  return { error };
};

export const markMessageAsRead = async (messageId) => {
  const { data, error } = await supabase
    .from('patient_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', messageId)
    .select()
    .single();
  return { data, error };
};

// ==================== MEAL PLANS ====================

export const getMealPlans = async (userId, userRole) => {
  let query = supabase.from('meal_plans').select(`
    *,
    patient:profiles!patient_id(id, name, email)
  `);
  
  if (userRole === 'professional') {
    query = query.eq('professional_id', userId);
  } else if (userRole === 'patient') {
    query = query.eq('patient_id', userId);
  }
  
  const { data, error } = await query.order('updated_at', { ascending: false });
  return { data, error };
};

export const getMealPlan = async (planId) => {
  const { data, error } = await supabase
    .from('meal_plans')
    .select(`*, patient:profiles!patient_id(id, name, email)`)
    .eq('id', planId)
    .single();
  return { data, error };
};

export const getPatientMealPlan = async (patientId, professionalId = null) => {
  // 1) Buscar plano ATIVO primeiro
  let query = supabase
    .from('meal_plans')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1);
  
  if (professionalId) {
    query = query.eq('professional_id', professionalId);
  }
  
  const { data, error } = await query.maybeSingle();
  
  // Se encontrou plano ativo, retornar
  if (data) return { data, error: null };
  
  // 2) Fallback: buscar o plano mais recente (mesmo inativo), 
  //    excluindo apenas 'archived'. Isso evita "plans que somem".
  let fallbackQuery = supabase
    .from('meal_plans')
    .select('*')
    .eq('patient_id', patientId)
    .not('plan_status', 'eq', 'archived')
    .order('updated_at', { ascending: false })
    .limit(1);
  
  if (professionalId) {
    fallbackQuery = fallbackQuery.eq('professional_id', professionalId);
  }
  
  const { data: fallbackData, error: fallbackError } = await fallbackQuery.maybeSingle();
  
  if (fallbackData) {
    console.log('⚠️ getPatientMealPlan: Plano ativo não encontrado, usando plano mais recente:', fallbackData.id, 'status:', fallbackData.plan_status);
  }
  
  return { data: fallbackData || null, error: fallbackError || error };
};

export const createMealPlan = async (planData) => {
  try {
    console.log('🔍 createMealPlan - Dados recebidos:', {
      patient_id: planData.patient_id,
      professional_id: planData.professional_id,
      name: planData.name,
      has_plan_data: !!planData.plan_data,
      meals_count: planData.plan_data?.meals?.length,
      has_daily_targets: !!planData.daily_targets
    });

    // Verificar se já existe um plano ativo para este paciente
    const { data: existingList, error: selectError } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('patient_id', planData.patient_id)
      .eq('is_active', true)
      .limit(1);
    
    if (selectError) {
      console.error('❌ Erro ao verificar plano existente');
      console.error('Message:', selectError?.message || 'Sem mensagem');
      
      return { 
        data: null, 
        error: { 
          message: selectError?.message || selectError?.msg || 'Erro ao verificar plano existente',
          code: selectError?.code || '',
          type: 'select_error'
        } 
      };
    }
    
    const existing = existingList && existingList.length > 0 ? existingList[0] : null;
    
    if (existing) {
      console.log('♻️ Plano existente encontrado, atualizando:', existing.id);
      // Atualizar plano existente
      const updateData = {
        name: planData.name,
        plan_data: planData.plan_data || { meals: [] },
        daily_targets: planData.daily_targets || { calorias: 2000, proteina: 100, carboidrato: 250, gordura: 70 },
        updated_at: new Date().toISOString()
      };
      
      console.log('📝 Dados do UPDATE:', updateData);
      
      const { data: updatedList, error } = await supabase
        .from('meal_plans')
        .update(updateData)
        .eq('id', existing.id)
        .select();
      
      if (error) {
        console.error('❌ Erro ao atualizar plano existente');
        console.error('Message:', error?.message || 'Sem mensagem');
        console.error('Code:', error?.code || 'Sem código');
        
        const cleanError = {
          message: error?.message || error?.msg || 'Erro ao atualizar plano',
          code: error?.code || '',
          type: 'update_error'
        };
        
        return { 
          data: null, 
          error: cleanError
        };
      }
      
      const data = updatedList && updatedList.length > 0 ? updatedList[0] : null;
      console.log('✅ Plano atualizado com sucesso:', data?.id);
      return { data, error: null };
    }
    
    // Criar novo plano
    console.log('➕ Criando novo plano...');
    const insertData = {
      patient_id: planData.patient_id,
      professional_id: planData.professional_id,
      name: planData.name,
      plan_data: planData.plan_data || { meals: [] },
      daily_targets: planData.daily_targets || { calorias: 2000, proteina: 100, carboidrato: 250, gordura: 70 },
      is_active: planData.is_active !== undefined ? planData.is_active : true,
      description: planData.description || null,
      start_date: planData.start_date || null,
      end_date: planData.end_date || null
    };
    
    console.log('📝 Dados do INSERT:', {
      ...insertData,
      plan_data: `${insertData.plan_data.meals?.length || 0} refeições`,
      daily_targets: insertData.daily_targets
    });
    
    // USAR safeFetch (wrapper único que faz clone automático)
    const sUrl = supabase.supabaseUrl;
    const sKey = supabase.supabaseKey;
    
    const { data: fetchData, error: fetchErr } = await safeFetch(
      `${sUrl}/rest/v1/meal_plans?select=*`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(insertData)
      }
    );

    if (fetchErr) {
      console.error('🔴 Erro safeFetch createMealPlan:', fetchErr.message);
      return {
        data: null,
        error: {
          message: fetchErr.message,
          code: fetchErr.code,
          details: fetchErr.details,
          type: 'http_error'
        }
      };
    }

    const data = Array.isArray(fetchData) ? fetchData[0] : fetchData;
    console.log('✅ Plano criado com sucesso:', data?.id);
    return { data: data || null, error: null };
  } catch (err) {
    console.error('❌ Erro inesperado em createMealPlan:', err);
    return { 
      data: null, 
      error: { 
        message: err?.message || 'Erro inesperado ao salvar plano',
        code: 'UNEXPECTED_ERROR',
        details: String(err)
      } 
    };
  }
};

export const updateMealPlan = async (planId, updates) => {
  try {
    const { data: updatedList, error } = await supabase
      .from('meal_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select();
    
    if (error) {
      console.error('Erro ao atualizar plano:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'Sem permissão para atualizar plano',
          code: error.code,
          details: error.details,
          hint: 'Verifique se você tem permissão para editar este plano'
        } 
      };
    }
    
    const data = updatedList && updatedList.length > 0 ? updatedList[0] : null;
    return { data, error: null };
  } catch (err) {
    console.error('Erro inesperado em updateMealPlan:', err);
    return { 
      data: null, 
      error: { 
        message: err?.message || 'Erro inesperado ao atualizar',
        code: 'UNEXPECTED_ERROR',
        details: String(err)
      } 
    };
  }
};

export const deleteMealPlan = async (planId) => {
  const { error } = await supabase.from('meal_plans').delete().eq('id', planId);
  return { error };
};

// ==================== MULTI-PLANOS ====================

/**
 * Buscar todos os planos de um paciente (incluindo scheduled)
 */
export const getPatientAllMealPlans = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('patient_id', patientId)
      .order('available_at', { ascending: true, nullsFirst: false });
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err };
  }
};

/**
 * Criar plano agendado (Multi-Plano)
 */
export const createScheduledMealPlan = async (planData) => {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        patient_id: planData.patient_id,
        professional_id: planData.professional_id,
        name: planData.name,
        description: planData.description || '',
        plan_data: planData.plan_data || { meals: [] },
        daily_targets: planData.daily_targets || {},
        plan_status: 'scheduled',
        available_at: planData.available_at,
        criteria_json: planData.criteria_json || {},
        is_multi_plan: true,
        is_active: false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Registrar transição
    await supabase.from('meal_plan_transitions').insert({
      plan_id: data.id,
      patient_id: planData.patient_id,
      from_status: 'draft',
      to_status: 'scheduled',
      reason: 'Plano criado como agendado',
      executed_by: planData.professional_id
    });
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Ativar plano agendado manualmente
 */
export const activateScheduledPlan = async (planId, executedBy) => {
  try {
    const { data, error } = await supabase.rpc('activate_scheduled_plan', {
      p_plan_id: planId,
      p_executed_by: executedBy
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Verificar planos prontos para ativar
 */
export const checkPlansReadyToActivate = async () => {
  try {
    const { data, error } = await supabase.rpc('check_plans_ready_to_activate');
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err };
  }
};

/**
 * Buscar transições de um plano
 */
export const getPlanTransitions = async (planId) => {
  try {
    const { data, error } = await supabase
      .from('meal_plan_transitions')
      .select('*, executor:profiles!executed_by(name)')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err };
  }
};

/**
 * Arquivar plano
 */
export const archiveMealPlan = async (planId, executedBy) => {
  try {
    const { data: plan } = await supabase
      .from('meal_plans')
      .select('plan_status, patient_id')
      .eq('id', planId)
      .single();
    
    if (!plan) throw new Error('Plano não encontrado');
    
    await supabase
      .from('meal_plans')
      .update({ plan_status: 'archived', is_active: false })
      .eq('id', planId);
    
    await supabase.from('meal_plan_transitions').insert({
      plan_id: planId,
      patient_id: plan.patient_id,
      from_status: plan.plan_status,
      to_status: 'archived',
      reason: 'Arquivado manualmente',
      executed_by: executedBy
    });
    
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err };
  }
};

// ==================== CUSTOM FOODS ====================

export const getCustomFoods = async (professionalId) => {
  const { data, error } = await supabase
    .from('custom_foods')
    .select('*')
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const createCustomFood = async (professionalId, foodData) => {
  const { data, error } = await supabase
    .from('custom_foods')
    .insert({ professional_id: professionalId, source: 'CUSTOM', ...foodData })
    .select()
    .single();
  return { data, error };
};

export const updateCustomFood = async (foodId, updates) => {
  const { data, error } = await supabase
    .from('custom_foods')
    .update(updates)
    .eq('id', foodId)
    .select()
    .single();
  return { data, error };
};

export const deleteCustomFood = async (foodId) => {
  const { error } = await supabase.from('custom_foods').delete().eq('id', foodId);
  return { error };
};

// ==================== PROFESSIONALS (Admin) ====================

export const getAllProfessionals = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'professional')
    .is('deleted_at', null)
    .order('name');
  return { data, error };
};

// ==================== STATISTICS ====================

export const getProfessionalStats = async (professionalId, isAdmin = false) => {
  let patientQuery = supabase
    .from('patient_profiles')
    .select('*, patient:profiles!patient_id(*)', { count: 'exact' });
  
  if (!isAdmin) {
    patientQuery = patientQuery.eq('professional_id', professionalId);
  }
  
  const { data: patients, count: totalPatients } = await patientQuery;
  
  // Planos ativos
  let plansQuery = supabase
    .from('meal_plans')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  if (!isAdmin) {
    plansQuery = plansQuery.eq('professional_id', professionalId);
  }
  
  const { count: activePlans } = await plansQuery;
  
  // Pacientes recentes
  let recentQuery = supabase
    .from('patient_profiles')
    .select('*, patient:profiles!patient_id(*)')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (!isAdmin) {
    recentQuery = recentQuery.eq('professional_id', professionalId);
  }
  
  const { data: recentPatients } = await recentQuery;
  
  // Pacientes com planos ativos
  let activePlansQuery = supabase
    .from('meal_plans')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (!isAdmin) {
    activePlansQuery = activePlansQuery.eq('professional_id', professionalId);
  }
  
  const { data: activePlansData } = await activePlansQuery;
  
  // Buscar dados dos pacientes separadamente para evitar problemas com joins
  let patientsWithActivePlans = [];
  if (activePlansData && activePlansData.length > 0) {
    const patientIds = [...new Set(activePlansData.map(p => p.patient_id).filter(Boolean))];
    
    if (patientIds.length > 0) {
      const { data: patientsData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', patientIds);
      
      // Mapear pacientes aos planos
      patientsWithActivePlans = activePlansData.map(plan => ({
        ...plan,
        patient: patientsData?.find(p => p.id === plan.patient_id) || null
      }));
    }
  }

  // Contar planos por tipo (geral vs especial)
  let plansByType = { general: 0, special: 0, specialBreakdown: {} };
  if (activePlansData) {
    activePlansData.forEach(plan => {
      const planData = plan.plan_data || {};
      if (planData.specialPlan || planData.planType === 'special') {
        plansByType.special++;
        const specialType = planData.specialPlan || 'other';
        plansByType.specialBreakdown[specialType] = (plansByType.specialBreakdown[specialType] || 0) + 1;
      } else {
        plansByType.general++;
      }
    });
  }

  // Anamneses pendentes (status != complete)
  let pendingAnamnesisQuery = supabase
    .from('anamnesis')
    .select('id', { count: 'exact' })
    .neq('status', 'complete');
  if (!isAdmin) {
    pendingAnamnesisQuery = pendingAnamnesisQuery.eq('professional_id', professionalId);
  }
  const { count: pendingAnamneses } = await pendingAnamnesisQuery;

  // Compromissos de hoje
  const today = new Date().toISOString().split('T')[0];
  let appointmentsTodayQuery = supabase
    .from('appointments')
    .select('id', { count: 'exact' })
    .eq('date', today);
  if (!isAdmin) {
    appointmentsTodayQuery = appointmentsTodayQuery.eq('professional_id', professionalId);
  }
  const { count: appointmentsToday } = await appointmentsTodayQuery;
  
  return {
    activePatients: totalPatients || 0,
    totalPatients: totalPatients || 0,
    activePlans: activePlans || 0,
    recentPatients: recentPatients || [],
    patientsWithActivePlans: patientsWithActivePlans || [],
    plansByType,
    pendingAnamneses: pendingAnamneses || 0,
    pendingAssessments: 0,
    pendingFeedbacks: 0,
    appointmentsToday: appointmentsToday || 0
  };
};

export const getPatientStats = async (patientId) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', patientId)
    .maybeSingle();
  
  const { data: activePlan } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .maybeSingle();
  
  const { data: anamnesis } = await supabase
    .from('anamnesis')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  const adherence = await getChecklistAdherence(patientId, 7);
  
  return { profile, activePlan, anamnesis, adherence };
};

// ==================== BRANDING ====================
// DEPRECATED: Funções antigas usando branding_configs (tabela não existe mais)
// Use as funções getProfessionalBranding, upsertProfessionalBranding, etc. mais abaixo

/**
 * @deprecated Use getProfessionalBranding() ou getCurrentProfessionalBranding()
 */
export const getBranding = async (userId) => {
  console.warn('getBranding() is deprecated. Use getProfessionalBranding() instead.');
  return await getProfessionalBranding(userId);
};

/**
 * @deprecated Use upsertProfessionalBranding()
 */
export const saveBranding = async (userId, brandingData) => {
  console.warn('saveBranding() is deprecated. Use upsertProfessionalBranding() instead.');
  return await upsertProfessionalBranding(userId, brandingData);
};

// ==================== CHECKLIST SIMPLES (MVP) ====================

export const getChecklistTasks = async (patientId) => {
  const { data, error } = await supabase
    .from('checklist_tasks')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });
  
  if (error || !data) return { data, error };

  // === RESET DIÁRIO: Verificar se tarefas completadas são de dias anteriores ===
  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  const tasksToReset = data.filter(task => {
    if (!task.completed) return false;
    // Usar updated_at como referência de quando foi completada
    const taskDate = task.updated_at ? task.updated_at.split('T')[0] : '';
    return taskDate < today;
  });

  if (tasksToReset.length > 0) {
    console.log(`🔄 Resetando ${tasksToReset.length} tarefas do checklist (dia anterior)`);
    // Resetar em batch
    const resetIds = tasksToReset.map(t => t.id);
    await supabase
      .from('checklist_tasks')
      .update({ completed: false, updated_at: new Date().toISOString() })
      .in('id', resetIds);
    
    // Atualizar dados locais
    const resetData = data.map(task => 
      resetIds.includes(task.id) ? { ...task, completed: false } : task
    );
    return { data: resetData, error: null };
  }

  return { data, error };
};

export const createChecklistTask = async (patientId, title) => {
  const { data, error } = await supabase
    .from('checklist_tasks')
    .insert({ patient_id: patientId, title })
    .select()
    .single();
  return { data, error };
};

export const updateChecklistTask = async (taskId, updates) => {
  const { data, error } = await supabase
    .from('checklist_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
  return { data, error };
};

export const toggleChecklistTask = async (taskId, completed) => {
  return await updateChecklistTask(taskId, { 
    completed, 
    updated_at: new Date().toISOString() 
  });
};

export const deleteChecklistTask = async (taskId) => {
  const { error } = await supabase
    .from('checklist_tasks')
    .delete()
    .eq('id', taskId);
  return { error };
};



// ==================== PATIENT MENU CONFIG ====================

// Menu SIMPLIFICADO padrão para pacientes (nova estrutura)
export const DEFAULT_PATIENT_MENU = [
  // 🏠 Dashboard - Visão rápida
  { id: 'dashboard', name: 'Dashboard', icon: 'Home', route: '/patient/dashboard', visible: true, order: 1, fixed: true },
  // 🚀 Minha Jornada - CORAÇÃO DO APP (Principal)
  { id: 'minha-jornada', name: 'Minha Jornada', icon: 'Rocket', route: '/patient/minha-jornada', visible: true, order: 2, fixed: true, highlight: true },
  // 📅 Minha Agenda
  { id: 'agenda', name: 'Minha Agenda', icon: 'Calendar', route: '/patient/agenda', visible: true, order: 3 },
  // 🥗 Meu Plano
  { id: 'meal-plan', name: 'Meu Plano', icon: 'Utensils', route: '/patient/meal-plan', visible: true, order: 4 },
  // 📸 Análise do Prato (IA)
  { id: 'meal-photo', name: 'Análise do Prato', icon: 'Camera', route: '/patient/meal-photo', visible: true, order: 5, badge: 'novo' },
  // 💪 Análise Corporal (IA)
  { id: 'body-analysis', name: 'Análise Corporal', icon: 'User', route: '/patient/body-analysis', visible: true, order: 6, badge: 'novo' },
  // 📚 Biblioteca (agrupa receitas, lista, suplementos, calculadoras)
  { id: 'biblioteca', name: 'Biblioteca', icon: 'Book', route: '/patient/biblioteca', visible: true, order: 7 },
  // Itens secundários (podem ser ocultados ou acessados via biblioteca)
  { id: 'avaliacao-fisica', name: 'Avaliação Física', icon: 'Activity', route: '/patient/avaliacao-fisica', visible: false, order: 8 },
  { id: 'feedbacks', name: 'Meus Feedbacks', icon: 'MessageSquare', route: '/patient/feedbacks', visible: false, order: 9 },
  { id: 'receitas', name: 'Minhas Receitas', icon: 'ChefHat', route: '/patient/receitas', visible: false, order: 10 },
  { id: 'lista-compras', name: 'Lista de Compras', icon: 'ShoppingCart', route: '/patient/lista-compras', visible: false, order: 11 },
  { id: 'suplementos', name: 'Suplementos', icon: 'Pill', route: '/patient/suplementos', visible: false, order: 12 },
  { id: 'dicas', name: 'Dicas', icon: 'Lightbulb', route: '/patient/dicas', visible: false, order: 13 },
  { id: 'calculadoras', name: 'Calculadoras', icon: 'Calculator', route: '/patient/calculadoras', visible: false, order: 14 },
  { id: 'calculadora-agua', name: 'Calculadora de Agua', icon: 'Droplets', route: '/patient/calculator/water', visible: true, order: 8 }
];

// Buscar configuração do menu do paciente
export const getPatientMenuConfig = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('patient_menu_config')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Erro ao buscar menu config:', error);
      return { data: { menu_items: DEFAULT_PATIENT_MENU }, error: null };
    }
    
    if (!data) {
      // Retornar menu padrão se não existir configuração
      return { data: { menu_items: DEFAULT_PATIENT_MENU }, error: null };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('❌ Erro fatal ao buscar menu config:', error);
    return { data: { menu_items: DEFAULT_PATIENT_MENU }, error };
  }
};

// Criar ou atualizar configuração do menu
export const upsertPatientMenuConfig = async (patientId, menuItems, professionalId = null) => {
  try {
    const { data, error } = await supabase
      .from('patient_menu_config')
      .upsert({
        patient_id: patientId,
        professional_id: professionalId,
        menu_items: menuItems,
        updated_at: new Date().toISOString()
      }, { onConflict: 'patient_id' })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao salvar menu config:', error);
      return { data: null, error };
    }
    
    console.log('✅ Menu config salvo:', data);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Erro fatal ao salvar menu config:', error);
    return { data: null, error };
  }
};

// ==================== PATIENT JOURNEY ====================

// Buscar jornada do paciente
export const getPatientJourney = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('patient_journey')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Erro ao buscar jornada:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('❌ Erro fatal ao buscar jornada:', error);
    return { data: null, error };
  }
};

// Criar/atualizar jornada do paciente
export const upsertPatientJourney = async (patientId, journeyData) => {
  try {
    const { data, error } = await supabase
      .from('patient_journey')
      .upsert({
        patient_id: patientId,
        ...journeyData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao salvar jornada:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('❌ Erro fatal ao salvar jornada:', error);
    return { data: null, error };
  }
};

// Buscar histórico de peso
export const getWeightHistory = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('weight_history')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar histórico de peso:', error);
      return { data: [], error };
    }
    
    return { data: data || [], error: null };
  } catch (error) {
    console.error('❌ Erro fatal ao buscar histórico de peso:', error);
    return { data: [], error };
  }
};

// Adicionar registro de peso
export const addWeightRecord = async (patientId, weight, notes = '') => {
  try {
    const { data, error } = await supabase
      .from('weight_history')
      .insert({
        patient_id: patientId,
        weight,
        notes,
        recorded_at: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao adicionar peso:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('❌ Erro fatal ao adicionar peso:', error);
    return { data: null, error };
  }
};

// Buscar fotos de progresso
export const getProgressPhotos = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('patient_id', patientId)
      .order('taken_at', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar fotos:', error);
      return { data: [], error };
    }
    
    return { data: data || [], error: null };
  } catch (error) {
    console.error('❌ Erro fatal ao buscar fotos:', error);
    return { data: [], error };
  }
};

// Upload de foto de perfil do paciente
export const uploadProfilePhoto = async (userId, file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `profile_${userId}_${Date.now()}.${fileExt}`;

    // Tentar upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file, { upsert: true });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);
      return await updateProfile(userId, { photo_url: publicUrl });
    }

    // Fallback: base64 direto no profile
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = await updateProfile(userId, { photo_url: reader.result });
        resolve(result);
      };
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('❌ Erro ao fazer upload da foto:', error);
    return { data: null, error };
  }
};

// Adicionar foto de progresso
export const addProgressPhoto = async (patientId, photoUrl, photoType = 'progress', notes = '') => {
  try {
    const { data, error } = await supabase
      .from('progress_photos')
      .insert({
        patient_id: patientId,
        photo_url: photoUrl,
        photo_type: photoType,
        notes,
        taken_at: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao adicionar foto:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('❌ Erro fatal ao adicionar foto:', error);
    return { data: null, error };
  }
};


// ==================== AGENDA DE CONSULTAS ====================

export const getAppointments = async (professionalId) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patient:profiles!patient_id(id, name, email, phone)')
    .eq('professional_id', professionalId)
    .order('date', { ascending: true })
    .order('time', { ascending: true });
  return { data: data || [], error };
};

export const getPatientAppointments = async (patientId) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: true });
  return { data: data || [], error };
};

export const createAppointment = async (appointmentData) => {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single();
  return { data, error };
};

export const updateAppointment = async (id, updates) => {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
};

export const deleteAppointment = async (id) => {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  return { error };
};

// ==================== LEMBRETES E NOTIFICAÇÕES ====================

/**
 * Cria um lembrete programado (feedback, vencimento de plano, etc)
 */
export const createReminder = async (reminderData) => {
  // Remove is_reminder pois coluna não existe na tabela appointments
  const { is_reminder, ...cleanData } = reminderData;
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      ...cleanData,
      type: cleanData.type || 'lembrete'
    })
    .select()
    .single();
  return { data, error };
};

/**
 * Busca lembretes próximos (próximos 7 dias) para exibir notificações
 */
export const getUpcomingReminders = async (userId, userRole = 'patient') => {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  
  const todayStr = today.toISOString().split('T')[0];
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  
  let query = supabase
    .from('appointments')
    .select('*, patient:profiles!patient_id(id, name, email)')
    .gte('date', todayStr)
    .lte('date', nextWeekStr)
    .order('date', { ascending: true });
  
  if (userRole === 'patient') {
    query = query.eq('patient_id', userId);
  } else {
    query = query.eq('professional_id', userId);
  }
  
  const { data, error } = await query;
  return { data: data || [], error };
};

/**
 * Cria lembrete de feedback para um paciente
 */
export const createFeedbackReminder = async (patientId, professionalId, scheduledDate, notes = '') => {
  return createReminder({
    patient_id: patientId,
    professional_id: professionalId,
    title: '📝 Feedback do Paciente',
    date: scheduledDate,
    type: 'feedback',
    status: 'scheduled',
    notes: notes || 'Solicitar feedback sobre o plano alimentar'
  });
};

/**
 * Cria lembrete de vencimento do plano
 */
export const createPlanExpirationReminder = async (patientId, professionalId, expirationDate, planName = '') => {
  return createReminder({
    patient_id: patientId,
    professional_id: professionalId,
    title: `⚠️ Plano "${planName || 'Alimentar'}" vence em breve`,
    date: expirationDate,
    type: 'vencimento',
    status: 'scheduled',
    notes: 'Verificar se paciente deseja renovar ou ajustar o plano'
  });
};

/**
 * Marca notificação como lida
 */
export const markReminderAsRead = async (reminderId) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ is_read: true })
    .eq('id', reminderId)
    .select()
    .single();
  return { data, error };
};

// ==================== GESTÃO FINANCEIRA ====================

export const getFinancialRecords = async (professionalId, year = null) => {
  let query = supabase
    .from('financial_records')
    .select('*, patient:profiles!patient_id(id, name)')
    .eq('professional_id', professionalId)
    .order('date', { ascending: false });
  if (year) {
    query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
  }
  const { data, error } = await query;
  return { data: data || [], error };
};

export const createFinancialRecord = async (record) => {
  const { data, error } = await supabase
    .from('financial_records')
    .insert(record)
    .select()
    .single();
  return { data, error };
};

export const updateFinancialRecord = async (id, updates) => {
  const { data, error } = await supabase
    .from('financial_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
};

export const deleteFinancialRecord = async (id) => {
  const { error } = await supabase.from('financial_records').delete().eq('id', id);
  return { error };
};

// ==================== PLANO FINANCEIRO DO PACIENTE ====================

export const getPatientPlan = async (patientId) => {
  const { data, error } = await supabase
    .from('patient_plans')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
};

export const upsertPatientPlan = async (patientId, planData) => {
  const { data: existing } = await supabase
    .from('patient_plans')
    .select('id')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('patient_plans')
      .update({ ...planData, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from('patient_plans')
      .insert({ patient_id: patientId, ...planData })
      .select()
      .single();
    return { data, error };
  }
};

// ==================== BRANDING ====================

/**
 * Busca o branding de um profissional
 * @param {string} professionalId - UUID do profissional
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export const getProfessionalBranding = async (professionalId) => {
  console.log('🔍 [SUPABASE DEBUG] getProfessionalBranding chamado com ID:', professionalId);
  
  const { data, error } = await supabase
    .from('professional_branding')
    .select('*')
    .eq('professional_id', professionalId)
    .maybeSingle();
  
  console.log('🔍 [SUPABASE DEBUG] Resultado:', { data, error });
  
  return { data, error };
};

/**
 * Atualiza ou cria branding do profissional
 * @param {string} professionalId - UUID do profissional
 * @param {Object} brandingData - {logo_url, primary_color, secondary_color, accent_color}
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export const upsertProfessionalBranding = async (professionalId, brandingData) => {
  const { data: existing } = await supabase
    .from('professional_branding')
    .select('id')
    .eq('professional_id', professionalId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('professional_branding')
      .update({ ...brandingData, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from('professional_branding')
      .insert({ professional_id: professionalId, ...brandingData })
      .select()
      .single();
    return { data, error };
  }
};

/**
 * Busca branding do profissional atual logado
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export const getCurrentProfessionalBranding = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return { data: null, error: { message: 'Usuário não autenticado' } };

    // O professional_id é o próprio user.id (não há tabela professional_profiles separada)
    return await getProfessionalBranding(user.id);
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Busca branding do profissional do paciente atual
 * Usado quando paciente está logado e precisa ver o branding do seu nutricionista
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export const getPatientProfessionalBranding = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return { data: null, error: { message: 'Usuário não autenticado' } };

    // Buscar o patient_profile do usuário atual para pegar professional_id
    const { data: patientProfile, error: profileError } = await supabase
      .from('patient_profiles')
      .select('professional_id')
      .eq('patient_id', user.id)
      .maybeSingle();

    if (profileError || !patientProfile) {
      return { data: null, error: profileError || { message: 'Perfil de paciente não encontrado' } };
    }

    return await getProfessionalBranding(patientProfile.professional_id);
  } catch (error) {
    return { data: null, error };
  }
};

// ==================== NOTIFICATIONS ====================

export const getNotifications = async (onlyUnread = false) => {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (onlyUnread) {
    query = query.eq('is_read', false);
  }
  
  const { data, error } = await query.limit(50);
  return { data, error };
};

export const getUnreadNotificationsCount = async () => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  return { count, error };
};

export const markNotificationAsRead = async (notificationId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select()
    .single();
  return { data, error };
};

export const markAllNotificationsAsRead = async () => {
  const user = await getCurrentUser();
  if (!user) return { error: { message: 'Não autenticado' } };
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);
  return { error };
};

export const deleteNotification = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  return { error };
};

/**
 * Cria uma notificação para um usuário
 */
export const createNotification = async (userId, { title, message, type = 'general', link = null }) => {
  try {
    const payload = {
      user_id: userId,
      title,
      message,
      type,
      is_read: false
    };
    // Adicionar link apenas se fornecido (campo pode não existir em todas as instalações)
    if (link) payload.link = link;

    const { data, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select()
      .single();
    
    if (error) {
      // Se falhou com link, tentar sem
      if (link && error.message?.includes('link')) {
        const { link: _removed, ...safePayload } = payload;
        const { data: d2, error: e2 } = await supabase
          .from('notifications')
          .insert(safePayload)
          .select()
          .single();
        return { data: d2, error: e2 };
      }
      console.error('Erro ao criar notificação:', error);
    }
    return { data, error };
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return { data: null, error };
  }
};

// ==================== RECIPES ====================

export const getRecipes = async (professionalId = null, includeAll = true) => {
  let query = supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Se includeAll for false, filtra apenas receitas do profissional
  // Se includeAll for true (padrão), busca todas as receitas que o profissional pode ver
  if (professionalId && !includeAll) {
    query = query.eq('professional_id', professionalId);
  }
  
  const { data, error } = await query;
  return { data, error };
};

export const getRecipeById = async (recipeId) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .single();
  return { data, error };
};

export const createRecipe = async (recipeData) => {
  const { data, error } = await supabase
    .from('recipes')
    .insert(recipeData)
    .select()
    .single();
  return { data, error };
};

export const updateRecipe = async (recipeId, updates) => {
  const { data, error } = await supabase
    .from('recipes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', recipeId)
    .select()
    .single();
  return { data, error };
};

export const deleteRecipe = async (recipeId) => {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId);
  return { error };
};

// ==================== TIPS ====================

export const getTips = async (professionalId = null) => {
  let query = supabase
    .from('tips')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (professionalId) {
    query = query.eq('professional_id', professionalId);
  }
  
  const { data, error } = await query;
  return { data, error };
};

export const createTip = async (tipData) => {
  const { data, error } = await supabase
    .from('tips')
    .insert(tipData)
    .select()
    .single();
  return { data, error };
};

export const updateTip = async (tipId, updates) => {
  const { data, error } = await supabase
    .from('tips')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', tipId)
    .select()
    .single();
  return { data, error };
};

export const deleteTip = async (tipId) => {
  const { error } = await supabase
    .from('tips')
    .delete()
    .eq('id', tipId);
  return { error };
};

// ==================== SUPPLEMENTS ====================

export const getSupplements = async (professionalId = null) => {
  let query = supabase
    .from('supplements')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (professionalId) {
    query = query.eq('professional_id', professionalId);
  }
  
  const { data, error } = await query;
  return { data, error };
};

export const createSupplement = async (supplementData) => {
  const { data, error } = await supabase
    .from('supplements')
    .insert(supplementData)
    .select()
    .single();
  return { data, error };
};

export const updateSupplement = async (supplementId, updates) => {
  const { data, error } = await supabase
    .from('supplements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', supplementId)
    .select()
    .single();
  return { data, error };
};

export const deleteSupplement = async (supplementId) => {
  const { error } = await supabase
    .from('supplements')
    .delete()
    .eq('id', supplementId);
  return { error };
};

// ==================== RECIPE VISIBILITY ====================

// Obter receitas visíveis para um paciente específico
export const getVisibleRecipesForPatient = async (patientId) => {
  try {
    // Primeiro, tentar usar a função do banco
    const { data, error } = await supabase
      .rpc('get_visible_recipes_for_patient', { p_patient_id: patientId });
    
    if (!error && data) {
      return { data, error: null };
    }
    
    // Fallback: buscar receitas globais ou com visibilidade
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .eq('is_active', true)
      .or(`is_global.eq.true,visibility_mode.eq.all`);
    
    if (recipesError) {
      // Se falhar, buscar todas receitas ativas (fallback)
      const { data: allRecipes, error: allError } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_active', true);
      return { data: allRecipes, error: allError };
    }
    
    // Buscar receitas com visibilidade específica para este paciente
    const { data: visibility } = await supabase
      .from('recipe_patient_visibility')
      .select('recipe_id')
      .eq('patient_id', patientId)
      .eq('visible', true);
    
    const visibleIds = visibility?.map(v => v.recipe_id) || [];
    
    // Buscar receitas com visibilidade específica
    if (visibleIds.length > 0) {
      const { data: specificRecipes } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_active', true)
        .in('id', visibleIds);
      
      // Combinar receitas globais com específicas
      const allRecipes = [...(recipes || [])];
      specificRecipes?.forEach(r => {
        if (!allRecipes.find(ar => ar.id === r.id)) {
          allRecipes.push(r);
        }
      });
      return { data: allRecipes, error: null };
    }
    
    return { data: recipes, error: null };
  } catch (err) {
    console.error('Erro ao buscar receitas visíveis:', err);
    return { data: null, error: err };
  }
};

// Obter configuração de visibilidade de uma receita
export const getRecipeVisibility = async (recipeId) => {
  const { data, error } = await supabase
    .from('recipe_patient_visibility')
    .select(`
      *,
      patient:profiles!recipe_patient_visibility_patient_id_fkey(id, name, email)
    `)
    .eq('recipe_id', recipeId);
  return { data, error };
};

// Obter todas as visibilidades de um profissional
export const getRecipeVisibilityByProfessional = async (professionalId) => {
  const { data, error } = await supabase
    .from('recipe_patient_visibility')
    .select(`
      *,
      recipe:recipes(id, name, category),
      patient:profiles!recipe_patient_visibility_patient_id_fkey(id, name, email)
    `)
    .eq('professional_id', professionalId);
  return { data, error };
};

// Definir visibilidade de uma receita para um paciente
export const setRecipeVisibility = async (recipeId, patientId, professionalId, visible = true) => {
  try {
    // Usar upsert para evitar conflitos (409)
    const { data, error } = await supabase
      .from('recipe_patient_visibility')
      .upsert(
        {
          recipe_id: recipeId,
          patient_id: patientId,
          professional_id: professionalId,
          visible,
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'recipe_id,patient_id',
          ignoreDuplicates: false 
        }
      )
      .select()
      .single();
    return { data, error };
  } catch (error) {
    console.error('Erro ao definir visibilidade:', error);
    return { data: null, error };
  }
};

// Definir visibilidade de uma receita para múltiplos pacientes
export const setRecipeVisibilityBulk = async (recipeId, patientIds, professionalId, visible = true) => {
  const results = [];
  for (const patientId of patientIds) {
    const result = await setRecipeVisibility(recipeId, patientId, professionalId, visible);
    results.push(result);
  }
  return results;
};

// Remover visibilidade de uma receita para um paciente
export const removeRecipeVisibility = async (recipeId, patientId) => {
  const { error } = await supabase
    .from('recipe_patient_visibility')
    .delete()
    .eq('recipe_id', recipeId)
    .eq('patient_id', patientId);
  return { error };
};

// Atualizar modo de visibilidade da receita
export const updateRecipeVisibilityMode = async (recipeId, mode) => {
  // mode: 'all' | 'selected' | 'none'
  const { data, error } = await supabase
    .from('recipes')
    .update({ visibility_mode: mode, updated_at: new Date().toISOString() })
    .eq('id', recipeId)
    .select()
    .single();
  return { data, error };
};

// Obter pacientes que podem ver uma receita
export const getPatientsWithRecipeAccess = async (recipeId) => {
  const { data, error } = await supabase
    .from('recipe_patient_visibility')
    .select(`
      patient_id,
      visible,
      patient:profiles!recipe_patient_visibility_patient_id_fkey(id, name, email)
    `)
    .eq('recipe_id', recipeId)
    .eq('visible', true);
  return { data, error };
};

// ==================== AGENDA / CALENDAR EVENTS ====================

export const getCalendarEvents = async (userId, startDate = null, endDate = null) => {
  let query = supabase
    .from('calendar_events')
    .select('*')
    .or(`patient_id.eq.${userId},professional_id.eq.${userId}`)
    .order('event_date', { ascending: true });
  
  if (startDate) {
    query = query.gte('event_date', startDate);
  }
  if (endDate) {
    query = query.lte('event_date', endDate);
  }
  
  const { data, error } = await query;
  return { data, error };
};

export const createCalendarEvent = async (eventData) => {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(eventData)
    .select()
    .single();
  return { data, error };
};

export const updateCalendarEvent = async (eventId, updates) => {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single();
  return { data, error };
};

export const deleteCalendarEvent = async (eventId) => {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);
  return { error };
};

export const getCalendarEventsByPatient = async (patientId, startDate = null, endDate = null) => {
  let query = supabase
    .from('calendar_events')
    .select('*')
    .eq('patient_id', patientId)
    .order('event_date', { ascending: true });
  
  if (startDate) {
    query = query.gte('event_date', startDate);
  }
  if (endDate) {
    query = query.lte('event_date', endDate);
  }
  
  const { data, error } = await query;
  return { data, error };
};


// ==================== PHYSICAL ASSESSMENTS ====================

// Buscar todas as avaliações físicas de um paciente
export const getPhysicalAssessments = async (patientId) => {
  const { data, error } = await supabase
    .from('physical_assessments')
    .select('*')
    .eq('patient_id', patientId)
    .order('assessment_date', { ascending: false });
  return { data, error };
};

// Buscar última avaliação física
export const getLatestPhysicalAssessment = async (patientId) => {
  const { data, error } = await supabase
    .from('physical_assessments')
    .select('*')
    .eq('patient_id', patientId)
    .order('assessment_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
};

// Buscar avaliação específica
export const getPhysicalAssessmentById = async (assessmentId) => {
  const { data, error } = await supabase
    .from('physical_assessments')
    .select('*')
    .eq('id', assessmentId)
    .single();
  return { data, error };
};

// Criar nova avaliação física
export const createPhysicalAssessment = async (assessmentData) => {
  // Calcular IMC se peso e altura foram fornecidos
  if (assessmentData.weight && assessmentData.height) {
    const heightInMeters = assessmentData.height / 100;
    assessmentData.bmi = (assessmentData.weight / (heightInMeters * heightInMeters)).toFixed(2);
  }
  
  // Calcular relação cintura/quadril
  if (assessmentData.waist && assessmentData.hip) {
    assessmentData.waist_hip_ratio = (assessmentData.waist / assessmentData.hip).toFixed(3);
  }
  
  const { data, error } = await supabase
    .from('physical_assessments')
    .insert(assessmentData)
    .select()
    .single();
  return { data, error };
};

// Atualizar avaliação física
export const updatePhysicalAssessment = async (assessmentId, updates) => {
  // Recalcular IMC se peso ou altura mudaram
  if (updates.weight && updates.height) {
    const heightInMeters = updates.height / 100;
    updates.bmi = (updates.weight / (heightInMeters * heightInMeters)).toFixed(2);
  }
  
  // Recalcular relação cintura/quadril
  if (updates.waist && updates.hip) {
    updates.waist_hip_ratio = (updates.waist / updates.hip).toFixed(3);
  }
  
  const { data, error } = await supabase
    .from('physical_assessments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', assessmentId)
    .select()
    .single();
  return { data, error };
};

// Deletar avaliação física
export const deletePhysicalAssessment = async (assessmentId) => {
  const { error } = await supabase
    .from('physical_assessments')
    .delete()
    .eq('id', assessmentId);
  return { error };
};

// Comparar duas avaliações (calcular diferenças)
export const compareAssessments = (current, previous) => {
  if (!current || !previous) return null;
  
  const fields = [
    'weight', 'bmi', 'body_fat_percentage', 'lean_mass', 'fat_mass',
    'waist', 'hip', 'arm_right', 'arm_left', 'thigh_right', 'thigh_left',
    'chest', 'abdomen', 'muscle_mass'
  ];
  
  const comparison = {};
  fields.forEach(field => {
    if (current[field] && previous[field]) {
      const diff = current[field] - previous[field];
      comparison[field] = {
        current: current[field],
        previous: previous[field],
        diff: diff.toFixed(2),
        percentage: ((diff / previous[field]) * 100).toFixed(1)
      };
    }
  });
  
  return comparison;
};


// ==================== DASHBOARD PROFISSIONAL INTELIGENTE ====================

/**
 * Busca dados completos para o dashboard do profissional
 * Query otimizada com agregações
 */
export const getProfessionalDashboardData = async (professionalId) => {
  try {
    // 1. Buscar todos os pacientes vinculados via patient_profiles
    const { data: patientProfiles, error: patientsError } = await supabase
      .from('patient_profiles')
      .select(`
        patient_id,
        professional_id,
        patient:profiles!patient_id(
          id,
          name,
          email,
          created_at,
          current_weight,
          goal_weight
        )
      `)
      .eq('professional_id', professionalId);

    if (patientsError) {
      console.error('❌ Erro na query patient_profiles:', patientsError);
      throw patientsError;
    }

    // Extrair dados dos pacientes
    const patients = (patientProfiles || [])
      .map(pp => pp.patient)
      .filter(p => p !== null); // Remover possíveis nulls

    console.log('✅ Pacientes encontrados:', patients.length);

    // 2. Para cada paciente, buscar estatísticas agregadas
    const enrichedPatients = await Promise.all(
      patients.map(async (patient) => {
        const stats = await getPatientDashboardStats(patient.id);
        return {
          ...patient,
          stats
        };
      })
    );

    return {
      data: enrichedPatients,
      error: null
    };
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return { data: [], error };
  }
};

/**
 * Busca estatísticas agregadas de um paciente específico
 */
export const getPatientDashboardStats = async (patientId) => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    // Checklist completion (últimos 7 dias)
    const { data: checklistTasks } = await supabase
      .from('checklist_tasks')
      .select('completed')
      .eq('patient_id', patientId)
      .gte('created_at', sevenDaysAgo.toISOString());

    const totalTasks = checklistTasks?.length || 0;
    const completedTasks = checklistTasks?.filter(t => t.completed).length || 0;
    const checklistCompletion7d = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Checklist hoje
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const { data: todayTasks } = await supabase
      .from('checklist_tasks')
      .select('completed')
      .eq('patient_id', patientId)
      .gte('created_at', todayStart.toISOString());

    const checklistToday = todayTasks?.filter(t => t.completed).length || 0;

    // Última atualização de peso
    const { data: weightUpdates } = await supabase
      .from('weight_history')
      .select('created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastWeightUpdate = weightUpdates?.[0]?.created_at || null;

    // Feedbacks respondidos (últimos 7 dias)
    const { data: feedbacks } = await supabase
      .from('feedbacks')
      .select('patient_response, created_at')
      .eq('patient_id', patientId)
      .gte('created_at', sevenDaysAgo.toISOString());

    const respondedFeedbacks7d = feedbacks?.filter(f => f.patient_response).length || 0;

    // Último feedback
    const { data: lastFeedback } = await supabase
      .from('feedbacks')
      .select('created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1);

    const daysSinceLastFeedback = lastFeedback?.[0]?.created_at
      ? Math.floor((today - new Date(lastFeedback[0].created_at)) / (1000 * 60 * 60 * 24))
      : 999;

    // Próxima consulta
    const { data: appointments } = await supabase
      .from('appointments')
      .select('date')
      .eq('patient_id', patientId)
      .gte('date', today.toISOString().split('T')[0])
      .order('date')
      .limit(1);

    const hasUpcomingAppointment = appointments && appointments.length > 0;

    // Plano ativo
    const { data: activePlan } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .limit(1);

    const hasActivePlan = activePlan && activePlan.length > 0;

    return {
      checklist_completion_7d: checklistCompletion7d,
      checklist_today: checklistToday,
      last_weight_update: lastWeightUpdate,
      responded_feedbacks_7d: respondedFeedbacks7d,
      days_since_last_feedback: daysSinceLastFeedback,
      has_upcoming_appointment: hasUpcomingAppointment,
      has_active_plan: hasActivePlan
    };
  } catch (error) {
    console.error('Erro ao buscar stats do paciente:', error);
    return {
      checklist_completion_7d: 0,
      checklist_today: 0,
      last_weight_update: null,
      responded_feedbacks_7d: 0,
      days_since_last_feedback: 999,
      has_upcoming_appointment: false,
      has_active_plan: false
    };
  }
};


// ==================== MEAL PHOTO ANALYSIS ====================

/**
 * Upload da foto da refeição para o Supabase Storage
 * @param {File} file - Arquivo de imagem
 * @param {string} patientId - ID do paciente
 * @returns {Object} { path, error }
 */
export const uploadMealPhoto = async (file, patientId) => {
  try {
    const timestamp = Date.now();
    const ext = file.name?.split('.').pop() || 'jpg';
    const filePath = `${patientId}/${timestamp}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('meal-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg'
      });

    if (error) {
      console.warn('⚠️ Storage upload error:', error.message);
      // Se o bucket não existir, retornar path fictício (a análise ainda funciona via base64)
      return { path: filePath, error: null, storageUnavailable: true };
    }

    return { path: data.path || filePath, error: null };
  } catch (err) {
    console.warn('⚠️ Storage upload exception:', err.message);
    return { path: `${patientId}/${Date.now()}.jpg`, error: null, storageUnavailable: true };
  }
};

/**
 * Cria registro de análise de refeição (status=processing)
 */
export const createMealAnalysis = async ({ patientId, professionalId, imagePath }) => {
  try {
    const { data, error } = await supabase
      .from('meal_analyses')
      .insert({
        patient_id: patientId,
        professional_id: professionalId || null,
        image_path: imagePath,
        status: 'processing'
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Erro ao criar meal analysis:', err);
    return { data: null, error: { message: err.message } };
  }
};

/**
 * Atualiza análise de refeição com resultado da IA
 */
export const updateMealAnalysis = async (analysisId, patch) => {
  try {
    const { data, error } = await supabase
      .from('meal_analyses')
      .update({
        ...patch,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Erro ao atualizar meal analysis:', err);
    return { data: null, error: { message: err.message } };
  }
};

/**
 * Lista análises de refeições do paciente (mais recentes primeiro)
 */
export const listPatientMealAnalyses = async (patientId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('meal_analyses')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: data || [], error };
  } catch (err) {
    console.error('Erro ao listar meal analyses:', err);
    return { data: [], error: { message: err.message } };
  }
};

/**
 * Lista análises recentes dos pacientes de um profissional
 */
export const listProfessionalRecentMealAnalyses = async (professionalId, limit = 20) => {
  try {
    // Buscar IDs dos pacientes do profissional
    const { data: patients, error: pError } = await supabase
      .from('patient_profiles')
      .select('patient_id')
      .eq('professional_id', professionalId);

    if (pError || !patients?.length) return { data: [], error: pError };

    const patientIds = patients.map(p => p.patient_id);

    // Buscar análises recentes desses pacientes
    const { data, error } = await supabase
      .from('meal_analyses')
      .select(`
        *,
        patient:profiles!meal_analyses_patient_id_fkey(id, name, email)
      `)
      .in('patient_id', patientIds)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: data || [], error };
  } catch (err) {
    console.error('Erro ao listar professional meal analyses:', err);
    return { data: [], error: { message: err.message } };
  }
};

/**
 * Busca análise por ID
 */
export const getMealAnalysisById = async (analysisId) => {
  try {
    const { data, error } = await supabase
      .from('meal_analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    return { data, error };
  } catch (err) {
    console.error('Erro ao buscar meal analysis:', err);
    return { data: null, error: { message: err.message } };
  }
};

/**
 * Busca análises recentes para cálculo de risco (últimos 7 dias)
 */
export const getRecentMealAnalysesForRisk = async (patientId, days = 7) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('meal_analyses')
      .select('quality_score, adherence_score, flags, created_at')
      .eq('patient_id', patientId)
      .eq('status', 'done')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: { message: err.message } };
  }
};

// ==================== BATCH RISK DATA (Dashboard Inteligente) ====================

/**
 * Busca dados de anamnese e avaliação física para múltiplos pacientes (batch)
 * Usado pelo dashboard profissional para calcular risk scores
 */
export const getBatchPatientRiskData = async (patientIds) => {
  if (!patientIds || patientIds.length === 0) return { data: {}, error: null };

  try {
    // Buscar anamneses em batch
    const { data: anamneses, error: anamError } = await supabase
      .from('anamnesis')
      .select('*')
      .in('patient_id', patientIds);

    if (anamError) console.warn('⚠️ Erro ao buscar anamneses batch:', anamError);

    // Buscar últimas avaliações físicas em batch
    const { data: assessments, error: assError } = await supabase
      .from('physical_assessments')
      .select('*')
      .in('patient_id', patientIds)
      .order('assessment_date', { ascending: false });

    if (assError) console.warn('⚠️ Erro ao buscar avaliações batch:', assError);

    // Organizar por patient_id (última de cada)
    const riskData = {};
    patientIds.forEach(id => {
      riskData[id] = {
        anamnesis: (anamneses || []).find(a => a.patient_id === id) || null,
        assessment: (assessments || []).find(a => a.patient_id === id) || null
      };
    });

    return { data: riskData, error: null };
  } catch (error) {
    console.error('Erro ao buscar risk data batch:', error);
    return { data: {}, error };
  }
};

/**
 * Busca emergências recentes (últimas 72h) para dashboard
 */
export const getRecentEmergencies = async (professionalId) => {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data, error } = await supabase
      .from('feedbacks')
      .select(`
        *,
        patient:profiles!feedbacks_patient_id_fkey(id, name, email)
      `)
      .eq('professional_id', professionalId)
      .eq('type', 'emergency')
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  } catch (error) {
    console.error('Erro ao buscar emergências recentes:', error);
    return { data: [], error };
  }
};

// ==================== TEMPLATES GLOBAIS ====================

/**
 * Buscar templates do profissional por tipo
 */
export const getProfessionalTemplates = async (professionalId, type = null) => {
  try {
    let query = supabase
      .from('professional_templates')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    return { data: [], error };
  }
};

/**
 * Criar novo template
 */
export const createTemplate = async (professionalId, templateData) => {
  const { data, error } = await supabase
    .from('professional_templates')
    .insert({
      professional_id: professionalId,
      ...templateData
    })
    .select()
    .single();
  
  return { data, error };
};

/**
 * Atualizar template e suas instâncias
 */
export const updateTemplate = async (templateId, updates) => {
  try {
    // Chamar função SQL que atualiza template + instâncias
    const { data, error } = await supabase.rpc('update_template_instances', {
      p_template_id: templateId,
      p_new_title: updates.title,
      p_new_content: updates.content || updates.description || ''
    });

    if (error) throw error;

    return { data, error: null, updatedCount: data };
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    return { data: null, error };
  }
};

/**
 * Deletar template
 */
export const deleteTemplate = async (templateId) => {
  const { error } = await supabase
    .from('professional_templates')
    .delete()
    .eq('id', templateId);
  
  return { error };
};

/**
 * Sincronizar templates para um paciente
 */
export const syncTemplatesForPatient = async (patientId) => {
  try {
    const { data, error } = await supabase.rpc('sync_templates_for_patient', {
      p_patient_id: patientId
    });

    if (error) {
      console.warn('⚠️ sync_templates_for_patient:', error.message || 'RPC indisponível');
      return { data: null, error };
    }

    console.log('✅ Templates sincronizados para o paciente');
    return { data, error };
  } catch (error) {
    console.warn('⚠️ sync_templates_for_patient: RPC não disponível');
    return { data: null, error };
  }
};

/**
 * Buscar instâncias do paciente com informação do template
 */
export const getPatientInstancesWithSource = async (patientId, type = 'checklist') => {
  try {
    if (type === 'checklist' || type === 'task') {
      const { data, error } = await supabase
        .from('checklist_tasks')
        .select(`
          *,
          source_template:professional_templates(id, title, type)
        `)
        .eq('patient_id', patientId)
        .eq('is_disabled', false)
        .order('created_at', { ascending: false });

      return { data, error };
    } else if (type === 'tip') {
      const { data, error } = await supabase
        .from('tips')
        .select(`
          *,
          source_template:professional_templates(id, title, type)
        `)
        .eq('patient_id', patientId)
        .eq('is_disabled', false)
        .order('created_at', { ascending: false });

      return { data, error };
    }
  } catch (error) {
    console.error('Erro ao buscar instâncias:', error);
    return { data: [], error };
  }
};

/**
 * Desativar template para um paciente específico
 */
export const disableTemplateForPatient = async (patientId, instanceId, type = 'checklist') => {
  try {
    const table = type === 'tip' ? 'tips' : 'checklist_tasks';
    
    const { error } = await supabase
      .from(table)
      .update({ is_disabled: true })
      .eq('id', instanceId)
      .eq('patient_id', patientId);

    return { error };
  } catch (error) {
    console.error('Erro ao desativar item:', error);
    return { error };
  }
};

/**
 * Marcar instância como customizada
 */
export const markInstanceAsCustomized = async (instanceId, type = 'checklist') => {
  const table = type === 'tip' ? 'tips' : 'checklist_tasks';
  
  const { error } = await supabase
    .from(table)
    .update({ is_customized: true })
    .eq('id', instanceId);

  return { error };
};

/**
 * Contar quantos pacientes usam um template
 */
export const countTemplateInstances = async (templateId) => {
  try {
    const { data, error } = await supabase.rpc('count_template_instances', {
      p_template_id: templateId
    });

    return { data: data || 0, error };
  } catch (error) {
    console.error('Erro ao contar instâncias:', error);
    return { data: 0, error };
  }
};

// ==================== SISTEMA DE EMERGÊNCIA (SOS) ====================

/**
 * Criar feedback de emergência
 */
export const createEmergencyFeedback = async (patientId, professionalId, feedbackData) => {
  const { data, error } = await supabase
    .from('feedbacks')
    .insert({
      patient_id: patientId,
      professional_id: professionalId,
      message: feedbackData.message,
      category: feedbackData.category,
      type: 'emergency',
      priority: 'high',
      status: 'open'
    })
    .select()
    .single();

  // Criar notificação para o profissional
  if (data && !error) {
    try {
      // Buscar nome do paciente
      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', patientId)
        .maybeSingle();
      
      const patientName = patientProfile?.name || 'Paciente';
      
      await createNotification(professionalId, {
        title: `🆘 SOS - ${patientName}`,
        message: `Emergência: ${feedbackData.category} - ${feedbackData.message?.substring(0, 100)}`,
        type: 'emergency',
        link: `/professional/feedbacks`
      });
      console.log('✅ Notificação SOS criada para o profissional');
    } catch (notifError) {
      console.error('⚠️ Erro ao criar notificação SOS (feedback salvo):', notifError);
    }
  }

  return { data, error };
};

/**
 * Buscar emergências do profissional
 */
export const getProfessionalEmergencies = async (professionalId, statusFilter = 'open') => {
  try {
    let query = supabase
      .from('feedbacks')
      .select(`
        *,
        patient:profiles!feedbacks_patient_id_fkey(id, name, email)
      `)
      .eq('professional_id', professionalId)
      .eq('type', 'emergency')
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (error) {
    console.error('Erro ao buscar emergências:', error);
    return { data: [], error };
  }
};

/**
 * Contar emergências abertas do profissional
 */
export const countOpenEmergencies = async (professionalId) => {
  try {
    const { count, error } = await supabase
      .from('feedbacks')
      .select('*', { count: 'exact', head: true })
      .eq('professional_id', professionalId)
      .eq('type', 'emergency')
      .eq('status', 'open');

    return { data: count || 0, error };
  } catch (error) {
    console.error('Erro ao contar emergências:', error);
    return { data: 0, error };
  }
};

/**
 * Atualizar status de feedback/emergência
 */
export const updateFeedbackStatus = async (feedbackId, status) => {
  const { data, error } = await supabase
    .from('feedbacks')
    .update({ status })
    .eq('id', feedbackId)
    .select()
    .single();

  return { data, error };
};

/**
 * Buscar todos os feedbacks do profissional (normais + emergências)
 */
export const getAllProfessionalFeedbacks = async (professionalId, filters = {}) => {
  try {
    let query = supabase
      .from('feedbacks')
      .select(`
        *,
        patient:profiles!feedbacks_patient_id_fkey(id, name, email)
      `)
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (error) {
    console.error('Erro ao buscar feedbacks:', error);
    return { data: [], error };
  }
};



// ==================== BODY COMPOSITION ANALYSIS ====================

/**
 * Upload de foto corporal para o Supabase Storage
 * @param {File} file - Arquivo de imagem
 * @param {string} patientId - ID do paciente
 * @param {string} position - front, side, back
 * @returns {Object} { path, error }
 */
export const uploadBodyPhoto = async (file, patientId, position) => {
  try {
    const timestamp = Date.now();
    const ext = file.name?.split('.').pop() || 'jpg';
    const filePath = `${patientId}/${timestamp}_${position}.${ext}`;

    const { data, error } = await supabase.storage
      .from('body-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg'
      });

    if (error) {
      console.warn('⚠️ Body photo upload error:', error.message);
      return { path: filePath, error: null, storageUnavailable: true };
    }

    return { path: data.path || filePath, error: null };
  } catch (err) {
    console.warn('⚠️ Body photo upload exception:', err.message);
    return { path: `${patientId}/${Date.now()}_${position}.jpg`, error: null, storageUnavailable: true };
  }
};

/**
 * Cria registro de análise corporal (status=processing)
 */
export const createBodyAnalysis = async ({ patientId, professionalId, photoFront, photoSide, photoBack, analysisType = 'progress', feedbackId = null, notes = null }) => {
  try {
    const { data, error } = await supabase
      .from('body_analyses')
      .insert({
        patient_id: patientId,
        professional_id: professionalId || null,
        photo_front: photoFront || null,
        photo_side: photoSide || null,
        photo_back: photoBack || null,
        analysis_type: analysisType,
        feedback_id: feedbackId,
        notes: notes,
        status: 'processing'
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Erro ao criar body analysis:', err);
    return { data: null, error: { message: err.message } };
  }
};

/**
 * Atualiza análise corporal com resultado da IA
 */
export const updateBodyAnalysis = async (analysisId, patch) => {
  try {
    const { data, error } = await supabase
      .from('body_analyses')
      .update({
        ...patch,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Erro ao atualizar body analysis:', err);
    return { data: null, error: { message: err.message } };
  }
};

/**
 * Lista análises corporais do paciente (mais recentes primeiro)
 */
export const listPatientBodyAnalyses = async (patientId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('body_analyses')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: data || [], error };
  } catch (err) {
    console.error('Erro ao listar body analyses:', err);
    return { data: [], error: { message: err.message } };
  }
};

/**
 * Busca última análise corporal do paciente (para comparação)
 */
export const getLastBodyAnalysis = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('body_analyses')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return { data, error };
  } catch (err) {
    // Pode não existir análise anterior
    return { data: null, error: null };
  }
};

/**
 * Busca análise corporal baseline do paciente
 */
export const getBaselineBodyAnalysis = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('body_analyses')
      .select('*')
      .eq('patient_id', patientId)
      .eq('analysis_type', 'baseline')
      .eq('status', 'done')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: null };
  }
};

/**
 * Lista análises corporais recentes dos pacientes de um profissional
 */
export const listProfessionalRecentBodyAnalyses = async (professionalId, limit = 20) => {
  try {
    // Buscar IDs dos pacientes do profissional
    const { data: patients, error: pError } = await supabase
      .from('patient_profiles')
      .select('patient_id')
      .eq('professional_id', professionalId);

    if (pError || !patients?.length) return { data: [], error: pError };

    const patientIds = patients.map(p => p.patient_id);

    // Buscar análises recentes
    const { data, error } = await supabase
      .from('body_analyses')
      .select(`
        *,
        patient:profiles!body_analyses_patient_id_fkey(id, name, email)
      `)
      .in('patient_id', patientIds)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: data || [], error };
  } catch (err) {
    console.error('Erro ao listar professional body analyses:', err);
    return { data: [], error: { message: err.message } };
  }
};

/**
 * Busca análise corporal por ID
 */
export const getBodyAnalysisById = async (analysisId) => {
  try {
    const { data, error } = await supabase
      .from('body_analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    return { data, error };
  } catch (err) {
    console.error('Erro ao buscar body analysis:', err);
    return { data: null, error: { message: err.message } };
  }
};

/**
 * Gera URL assinada para foto corporal
 */
export const getBodyPhotoSignedUrl = async (path) => {
  try {
    const { data, error } = await supabase.storage
      .from('body-photos')
      .createSignedUrl(path, 3600); // 1 hora

    if (error) return { url: null, error };
    return { url: data.signedUrl, error: null };
  } catch (err) {
    return { url: null, error: { message: err.message } };
  }
};



// ==================== AUTOMATION RULES ====================

/**
 * Buscar todas as regras de automação do profissional
 */
export const getAutomationRules = async (professionalId) => {
  try {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });
    if (error) {
      // Tabela pode não existir ainda
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.code === 'PGRST204') {
        console.warn('⚠️ Tabela automation_rules não existe. Execute o SQL de setup.');
        return { data: [], error: null };
      }
      return { data: [], error };
    }
    return { data: data || [], error };
  } catch (error) {
    return { data: [], error: null };
  }
};

/**
 * Criar nova regra de automação
 */
export const createAutomationRule = async (ruleData) => {
  try {
    const { data, error } = await supabase
      .from('automation_rules')
      .insert(ruleData)
      .select()
      .single();
    return { data, error };
  } catch (error) {
    console.error('Erro ao criar automação:', error);
    return { data: null, error };
  }
};

/**
 * Atualizar regra de automação
 */
export const updateAutomationRule = async (ruleId, updates) => {
  try {
    const { data, error } = await supabase
      .from('automation_rules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', ruleId)
      .select()
      .single();
    return { data, error };
  } catch (error) {
    console.error('Erro ao atualizar automação:', error);
    return { data: null, error };
  }
};

/**
 * Deletar regra de automação
 */
export const deleteAutomationRule = async (ruleId) => {
  try {
    const { error } = await supabase
      .from('automation_rules')
      .delete()
      .eq('id', ruleId);
    return { error };
  } catch (error) {
    return { error };
  }
};

/**
 * Toggle ativo/inativo de regra
 */
export const toggleAutomationRule = async (ruleId, isActive) => {
  return updateAutomationRule(ruleId, { is_active: isActive });
};

/**
 * Atualizar contagem de execuções
 */
export const updateAutomationRuleExecution = async (ruleId) => {
  try {
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('execution_count')
      .eq('id', ruleId)
      .single();

    await supabase
      .from('automation_rules')
      .update({
        execution_count: (rule?.execution_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId);
  } catch (error) {
    console.error('Erro ao atualizar execução:', error);
  }
};

// ==================== AUTOMATION LOGS ====================

/**
 * Buscar logs de automação
 */
export const getAutomationLogs = async (professionalId, limit = 100) => {
  try {
    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.code === 'PGRST204') {
        return { data: [], error: null };
      }
      return { data: [], error };
    }
    return { data: data || [], error };
  } catch (error) {
    return { data: [], error: null };
  }
};

/**
 * Criar log de automação
 */
export const createAutomationLog = async (logData) => {
  try {
    const { data, error } = await supabase
      .from('automation_logs')
      .insert(logData)
      .select()
      .single();
    return { data, error };
  } catch (error) {
    console.error('Erro ao criar log:', error);
    return { data: null, error };
  }
};

/**
 * Contar execuções de hoje
 */
export const countTodayExecutions = async (professionalId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('automation_logs')
      .select('*', { count: 'exact', head: true })
      .eq('professional_id', professionalId)
      .gte('created_at', today + 'T00:00:00');
    if (error) return { count: 0, error: null };
    return { count: count || 0, error };
  } catch (error) {
    return { count: 0, error: null };
  }
};


// ==================== COOLDOWN NO BANCO (RPC) ====================

/**
 * Verifica cooldown de automação diretamente no banco
 * Usa função RPC check_automation_cooldown que busca o log mais recente
 * por (rule_id, patient_id) e compara com now() - cooldown_hours
 *
 * @returns {Promise<boolean>} true = pode executar, false = em cooldown
 */
export const checkCooldownInDB = async (ruleId, patientId, cooldownHours) => {
  try {
    const { data, error } = await supabase.rpc('check_automation_cooldown', {
      p_rule_id: ruleId,
      p_patient_id: patientId,
      p_cooldown_hours: cooldownHours
    });

    if (error) {
      // Fallback: se a função RPC não existe, usar query direta
      console.warn('⚠️ RPC check_automation_cooldown não disponível, usando fallback');
      return await checkCooldownFallback(ruleId, patientId, cooldownHours);
    }

    return data === true;
  } catch (err) {
    console.warn('⚠️ Erro no checkCooldownInDB, usando fallback:', err);
    return await checkCooldownFallback(ruleId, patientId, cooldownHours);
  }
};

/**
 * Fallback: check cooldown via query direta (quando RPC não existe)
 */
const checkCooldownFallback = async (ruleId, patientId, cooldownHours) => {
  try {
    const { data } = await supabase
      .from('automation_logs')
      .select('created_at')
      .eq('rule_id', ruleId)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return true; // Nunca executou

    const hoursSince = (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60);
    return hoursSince >= cooldownHours;
  } catch (err) {
    return true; // Em caso de erro, permitir execução
  }
};

// ==================== PLATFORM FEATURES (FONTE ÚNICA DO BANCO) ====================

/**
 * Busca features da plataforma diretamente da tabela platform_features
 * Esta é a FONTE ÚNICA de verdade para contagens e catálogo
 */
export const getPlatformFeaturesFromDB = async () => {
  try {
    const { data, error } = await supabase
      .from('platform_features')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      // Tabela pode não existir ainda
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.code === 'PGRST204') {
        console.warn('⚠️ Tabela platform_features não existe. Usando fallback local.');
        return { data: null, error: null, useFallback: true };
      }
      console.error('❌ Erro ao buscar platform_features:', error);
      return { data: null, error, useFallback: true };
    }

    if (!data || data.length === 0) {
      return { data: null, error: null, useFallback: true };
    }

    return { data, error: null, useFallback: false };
  } catch (err) {
    console.error('❌ Erro fatal ao buscar platform_features:', err);
    return { data: null, error: err, useFallback: true };
  }
};

/**
 * Derivar contagens dinâmicas a partir dos dados do banco
 */
export const deriveDynamicCounts = (features) => {
  if (!features || !Array.isArray(features) || features.length === 0) {
    return null;
  }
  return {
    total: features.length,
    totalAI: features.filter(f => f.is_ai).length,
    totalCategories: new Set(features.map(f => f.category)).size,
    totalActive: features.filter(f => f.is_active).length
  };
};

// ==================== AUTOMATION AVANÇADA - PLANO PROGRAMADO ====================

/**
 * Busca dados de peso do paciente dentro de uma janela de avaliação
 */
export const getPatientWeightInWindow = async (patientId, windowDays) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - windowDays);

    const { data, error } = await supabase
      .from('weight_history')
      .select('weight, recorded_at')
      .eq('patient_id', patientId)
      .gte('recorded_at', startDate.toISOString().split('T')[0])
      .order('recorded_at', { ascending: true });

    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
};

/**
 * Conta feedbacks de um paciente numa janela de tempo
 */
export const countPatientFeedbacksInWindow = async (patientId, windowDays, feedbackType = null) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - windowDays);

    let query = supabase
      .from('feedbacks')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .gte('created_at', startDate.toISOString());

    if (feedbackType === 'weight') {
      query = query.not('patient_response', 'is', null);
    }
    if (feedbackType === 'photo') {
      query = query.not('photo_url', 'is', null);
    }

    const { count, error } = await query;
    return { count: count || 0, error };
  } catch (err) {
    return { count: 0, error: err };
  }
};

/**
 * Ativa um plano alimentar e desativa o anterior
 */
export const activateMealPlan = async (planId, patientId) => {
  try {
    // Desativar planos atuais
    await supabase
      .from('meal_plans')
      .update({ is_active: false })
      .eq('patient_id', patientId)
      .eq('is_active', true);

    // Ativar o plano alvo
    const { data, error } = await supabase
      .from('meal_plans')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Atualizar last_evaluated_at de uma regra
 */
export const updateRuleLastEvaluated = async (ruleId) => {
  try {
    await supabase
      .from('automation_rules')
      .update({ last_evaluated_at: new Date().toISOString() })
      .eq('id', ruleId);
  } catch (err) {
    console.error('Erro ao atualizar last_evaluated_at:', err);
  }
};


// ==================== FEATURE FLAGS — CONTROLE GLOBAL ====================

/**
 * Cache global de features para evitar queries repetidas
 */
let _featureFlagsCache = null;
let _featureFlagsCacheTime = 0;
const FF_CACHE_TTL = 2 * 60 * 1000; // 2 minutos

/**
 * Carrega todas as feature flags do banco com cache
 */
export const loadFeatureFlags = async (forceRefresh = false) => {
  if (!forceRefresh && _featureFlagsCache && (Date.now() - _featureFlagsCacheTime) < FF_CACHE_TTL) {
    return _featureFlagsCache;
  }
  try {
    const { data, error } = await supabase
      .from('platform_features')
      .select('*')
      .order('category')
      .order('name');
    if (error) throw error;
    _featureFlagsCache = data || [];
    _featureFlagsCacheTime = Date.now();
    return _featureFlagsCache;
  } catch (err) {
    console.error('Erro ao carregar feature flags:', err);
    return _featureFlagsCache || [];
  }
};

/**
 * Invalida o cache de feature flags (chamar após toggle no admin)
 */
export const invalidateFeatureFlagsCache = () => {
  _featureFlagsCache = null;
  _featureFlagsCacheTime = 0;
};

/**
 * canAccessFeature(slug) — Função CENTRAL de controle de acesso
 *
 * Ordem de validação:
 * 1. is_active = false → BLOQUEAR geral
 * 2. coming_soon = true → mostrar "Em breve" (sem executar)
 * 3. Verificar plano (Basic/Pro/Trial)
 * 4. Verificar role (enabled_for_professional / enabled_for_patient)
 * 5. Retorna { allowed, readOnly, comingSoon, reason }
 *
 * @param {string} slug - slug da feature
 * @param {object} profile - profile do usuário logado (com role e plan_type)
 * @returns {Promise<{allowed: boolean, readOnly: boolean, comingSoon: boolean, reason?: string}>}
 */
export const canAccessFeature = async (slug, profile) => {
  const BLOCKED = { allowed: false, readOnly: false, comingSoon: false };
  const COMING_SOON = { allowed: false, readOnly: false, comingSoon: true };

  if (!slug || !profile) {
    return { ...BLOCKED, reason: 'Dados insuficientes' };
  }

  // Admin tem acesso total
  if (profile.role === 'admin') {
    return { allowed: true, readOnly: false, comingSoon: false };
  }

  try {
    const features = await loadFeatureFlags();
    const feature = features.find(f => f.slug === slug);

    // Feature não encontrada no banco = permitir (modo defensivo)
    if (!feature) {
      return { allowed: true, readOnly: false, comingSoon: false, reason: 'Não cadastrada' };
    }

    // 1. is_active = false → BLOQUEAR geral
    if (!feature.is_active) {
      return { ...BLOCKED, reason: 'Funcionalidade desativada pelo administrador' };
    }

    // 2. coming_soon = true
    if (feature.coming_soon) {
      return { ...COMING_SOON, reason: 'Em breve — funcionalidade em desenvolvimento' };
    }

    // 3. Verificar role
    const isProf = profile.role === 'professional';
    const isPatient = profile.role === 'patient';

    if (isProf && feature.enabled_for_professional === false) {
      return { ...BLOCKED, reason: 'Indisponível para profissionais' };
    }
    if (isPatient && feature.enabled_for_patient === false) {
      return { ...BLOCKED, reason: 'Indisponível para pacientes' };
    }

    // 4. Verificar plano (apenas profissional)
    if (isProf && feature.is_pro) {
      const planType = profile.plan_type || 'basic';

      if (planType === 'basic') {
        return {
          allowed: false,
          readOnly: true,
          comingSoon: false,
          reason: 'Recurso PRO — faça upgrade para acessar'
        };
      }

      if (planType === 'trial') {
        // Trial vê tudo mas com limitações
        const trialExpired = profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date();
        if (trialExpired) {
          return {
            allowed: false,
            readOnly: true,
            comingSoon: false,
            reason: 'Período de teste expirado — faça upgrade'
          };
        }
        // Trial ativo: acesso com limitações (managed pelo chamador)
        return { allowed: true, readOnly: false, comingSoon: false, reason: 'trial' };
      }
      // PRO: acesso completo
    }

    // 5. Tudo OK
    return { allowed: true, readOnly: false, comingSoon: false };

  } catch (err) {
    console.error('Erro em canAccessFeature:', err);
    // Modo defensivo: permitir em caso de erro
    return { allowed: true, readOnly: false, comingSoon: false, reason: 'Erro na verificação' };
  }
};

/**
 * Versão síncrona usando cache (para componentes que não podem ser async)
 */
export const canAccessFeatureSync = (slug, profile) => {
  const BLOCKED = { allowed: false, readOnly: false, comingSoon: false };

  if (!slug || !profile) return { ...BLOCKED, reason: 'Dados insuficientes' };
  if (profile.role === 'admin') return { allowed: true, readOnly: false, comingSoon: false };

  const features = _featureFlagsCache;
  if (!features) return { allowed: true, readOnly: false, comingSoon: false, reason: 'Cache vazio' };

  const feature = features.find(f => f.slug === slug);
  if (!feature) return { allowed: true, readOnly: false, comingSoon: false };
  if (!feature.is_active) return { ...BLOCKED, reason: 'Desativada' };
  if (feature.coming_soon) return { allowed: false, readOnly: false, comingSoon: true, reason: 'Em breve' };

  const isProf = profile.role === 'professional';
  const isPatient = profile.role === 'patient';
  if (isProf && feature.enabled_for_professional === false) return { ...BLOCKED, reason: 'Indisponível' };
  if (isPatient && feature.enabled_for_patient === false) return { ...BLOCKED, reason: 'Indisponível' };

  if (isProf && feature.is_pro) {
    const plan = profile.plan_type || 'basic';
    if (plan === 'basic') return { allowed: false, readOnly: true, comingSoon: false, reason: 'Recurso PRO' };
    if (plan === 'trial') {
      const expired = profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date();
      if (expired) return { allowed: false, readOnly: true, comingSoon: false, reason: 'Trial expirado' };
    }
  }

  return { allowed: true, readOnly: false, comingSoon: false };
};

// ==================== ADMIN: CRUD FEATURE FLAGS ====================

/**
 * Atualizar feature flag (somente admin)
 */
export const updateFeatureFlag = async (featureId, updates) => {
  try {
    const { data, error } = await supabase
      .from('platform_features')
      .update(updates)
      .eq('id', featureId)
      .select()
      .single();
    if (!error) invalidateFeatureFlagsCache();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Buscar todas as features para o Admin
 */
export const getAllFeaturesAdmin = async () => {
  try {
    const { data, error } = await supabase
      .from('platform_features')
      .select('*')
      .order('category')
      .order('name');
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
};

/**
 * Atualizar plan_type de um profissional (somente admin)
 */
export const updateProfessionalPlan = async (professionalId, planType, expiresAt = null) => {
  try {
    const updates = {
      plan_type: planType,
      plan_started_at: new Date().toISOString()
    };
    if (expiresAt) updates.plan_expires_at = expiresAt;
    if (planType === 'trial' && !expiresAt) {
      const trial = new Date();
      trial.setDate(trial.getDate() + 7); // 7 dias de trial
      updates.plan_expires_at = trial.toISOString();
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', professionalId)
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

// Verificar se trial expirou
export const checkTrialExpiration = async (professionalId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('plan_type, plan_expires_at')
      .eq('id', professionalId)
      .single();
    
    if (error || !data) return { expired: false, data: null };
    
    if (data.plan_type === 'trial' && data.plan_expires_at) {
      const expiresAt = new Date(data.plan_expires_at);
      const now = new Date();
      const expired = now > expiresAt;
      const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      return { expired, daysLeft: Math.max(0, daysLeft), data };
    }
    
    return { expired: false, data };
  } catch (err) {
    return { expired: false, data: null, error: err };
  }
};


// ==================== MEAL TEMPLATES ====================

/**
 * Buscar templates de refeição do profissional
 */
export const getMealTemplates = async (professionalId, category = null) => {
  try {
    let query = supabase
      .from('meal_templates')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .order('use_count', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar meal templates:', error);
      return { data: [], error };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Erro fatal ao buscar meal templates:', err);
    return { data: [], error: err };
  }
};

/**
 * Criar novo template de refeição
 */
export const createMealTemplate = async (professionalId, templateData) => {
  try {
    const { data, error } = await supabase
      .from('meal_templates')
      .insert({
        professional_id: professionalId,
        title: templateData.title,
        description: templateData.description || '',
        category: templateData.category || 'general',
        tags: templateData.tags || [],
        meal_data: templateData.meal_data,
        total_calories: templateData.total_calories || 0,
        total_protein: templateData.total_protein || 0,
        total_carbs: templateData.total_carbs || 0,
        total_fat: templateData.total_fat || 0,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar meal template:', error);
      return { data: null, error };
    }
    
    console.log('✅ Meal template criado:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Erro fatal ao criar meal template:', err);
    return { data: null, error: err };
  }
};

/**
 * Atualizar template de refeição
 */
export const updateMealTemplate = async (templateId, updates) => {
  try {
    const { data, error } = await supabase
      .from('meal_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao atualizar meal template:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Erro fatal ao atualizar meal template:', err);
    return { data: null, error: err };
  }
};

/**
 * Deletar (soft delete) template de refeição
 */
export const deleteMealTemplate = async (templateId) => {
  try {
    const { error } = await supabase
      .from('meal_templates')
      .update({ is_active: false })
      .eq('id', templateId);
    
    if (error) {
      console.error('Erro ao deletar meal template:', error);
      return { error };
    }
    
    return { error: null };
  } catch (err) {
    console.error('Erro fatal ao deletar meal template:', err);
    return { error: err };
  }
};

/**
 * Incrementar contador de uso do template
 */
export const incrementTemplateUse = async (templateId) => {
  try {
    const { error } = await supabase.rpc('increment_template_use', {
      p_template_id: templateId
    });
    
    if (error) {
      // Fallback: update direto
      await supabase
        .from('meal_templates')
        .update({ use_count: supabase.raw('use_count + 1') })
        .eq('id', templateId);
    }
    
    return { error: null };
  } catch (err) {
    console.error('Erro ao incrementar uso do template:', err);
    return { error: err };
  }
};


// ==================== GALERIA DE TEMPLATES PÚBLICOS ====================

/**
 * Buscar templates públicos aprovados (galeria)
 */
export const getPublicMealTemplates = async (category = null, limit = 50) => {
  try {
    // Tentar com approval_status (se migração executada)
    let query = supabase
      .from('meal_templates')
      .select(`
        *,
        creator:profiles!professional_id(id, name, photo_url)
      `)
      .eq('is_active', true)
      .order('use_count', { ascending: false })
      .limit(limit);
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    // Primeira tentativa: approval_status = approved
    const { data: approvedData, error: approvedError } = await query.eq('approval_status', 'approved');
    
    if (!approvedError) {
      return { data: approvedData || [], error: null };
    }
    
    // Fallback: se coluna não existe, buscar is_public = true
    console.log('⚠️ approval_status não existe, usando fallback is_public');
    let fallbackQuery = supabase
      .from('meal_templates')
      .select(`
        *,
        creator:profiles!professional_id(id, name, photo_url)
      `)
      .eq('is_public', true)
      .eq('is_active', true)
      .order('use_count', { ascending: false })
      .limit(limit);
    
    if (category && category !== 'all') {
      fallbackQuery = fallbackQuery.eq('category', category);
    }
    
    const { data, error } = await fallbackQuery;
    
    if (error) {
      console.error('Erro ao buscar templates públicos:', error);
      return { data: [], error };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Erro fatal ao buscar templates públicos:', err);
    return { data: [], error: err };
  }
};

/**
 * Buscar templates pendentes de aprovação (para admin)
 */
export const getPendingMealTemplates = async () => {
  try {
    // Tentar com approval_status
    const { data, error } = await supabase
      .from('meal_templates')
      .select(`
        *,
        creator:profiles!professional_id(id, name, email, photo_url)
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });
    
    if (!error) {
      return { data: data || [], error: null };
    }
    
    // Fallback: se coluna não existe, retornar vazio
    console.log('⚠️ approval_status não existe para pendentes');
    return { data: [], error: null };
  } catch (err) {
    return { data: [], error: err };
  }
};

/**
 * Solicitar publicação de template (PRO only)
 */
export const requestTemplatePublication = async (templateId, professionalId) => {
  try {
    const { data, error } = await supabase.rpc('request_template_publication', {
      p_template_id: templateId,
      p_professional_id: professionalId
    });
    
    if (error) {
      console.error('Erro ao solicitar publicação:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Erro fatal ao solicitar publicação:', err);
    return { data: null, error: err };
  }
};

/**
 * Admin aprovar/rejeitar template
 */
export const adminReviewTemplate = async (templateId, adminId, action, reason = null) => {
  try {
    const { data, error } = await supabase.rpc('admin_review_template', {
      p_template_id: templateId,
      p_admin_id: adminId,
      p_action: action,
      p_reason: reason
    });
    
    if (error) {
      console.error('Erro ao revisar template:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Erro fatal ao revisar template:', err);
    return { data: null, error: err };
  }
};

/**
 * Cancelar solicitação de publicação
 */
export const cancelTemplatePublication = async (templateId) => {
  try {
    const { data, error } = await supabase
      .from('meal_templates')
      .update({ 
        approval_status: 'private', 
        is_public: false,
        approved_by: null,
        approved_at: null,
        rejection_reason: null
      })
      .eq('id', templateId)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao cancelar publicação:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Erro fatal ao cancelar publicação:', err);
    return { data: null, error: err };
  }
};

/**
 * Copiar template público para meus templates
 */
export const copyPublicTemplate = async (templateId, professionalId) => {
  try {
    // Buscar template original
    const { data: original, error: fetchError } = await supabase
      .from('meal_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (fetchError || !original) {
      return { data: null, error: fetchError || { message: 'Template não encontrado' } };
    }
    
    // Incrementar uso do original
    await incrementTemplateUse(templateId);
    
    // Criar cópia para o profissional
    const { data, error } = await supabase
      .from('meal_templates')
      .insert({
        professional_id: professionalId,
        title: `${original.title} (Cópia)`,
        description: original.description,
        category: original.category,
        tags: original.tags,
        meal_data: original.meal_data,
        total_calories: original.total_calories,
        total_protein: original.total_protein,
        total_carbs: original.total_carbs,
        total_fat: original.total_fat,
        is_active: true,
        approval_status: 'private',
        is_public: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao copiar template:', error);
      return { data: null, error };
    }
    
    console.log('✅ Template copiado:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Erro fatal ao copiar template:', err);
    return { data: null, error: err };
  }
};

/**
 * Contar templates públicos do profissional
 */
export const countProfessionalPublicTemplates = async (professionalId) => {
  try {
    const { count, error } = await supabase
      .from('meal_templates')
      .select('*', { count: 'exact', head: true })
      .eq('professional_id', professionalId)
      .in('approval_status', ['pending', 'approved']);
    
    if (error) {
      console.error('Erro ao contar templates públicos:', error);
      return { count: 0, error };
    }
    
    return { count: count || 0, error: null };
  } catch (err) {
    console.error('Erro fatal ao contar templates públicos:', err);
    return { count: 0, error: err };
  }
};

// ==================== PATIENT SUBSCRIPTIONS (ASSINATURAS) ====================

/**
 * Obter assinatura do paciente
 */
export async function getPatientSubscription(patientId) {
  const { data, error } = await supabase
    .from('patient_subscriptions')
    .select('*')
    .eq('patient_id', patientId)
    .single();
  
  return { data, error };
}

/**
 * Criar ou atualizar assinatura do paciente
 */
export async function upsertPatientSubscription(patientId, professionalId, subscriptionData) {
  const { data, error } = await supabase
    .from('patient_subscriptions')
    .upsert({
      patient_id: patientId,
      professional_id: professionalId,
      ...subscriptionData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'patient_id'
    })
    .select()
    .single();
  
  return { data, error };
}

/**
 * Atualizar status das assinaturas (executar periodicamente)
 */
export async function updateSubscriptionStatuses() {
  const { data, error } = await supabase.rpc('update_subscription_status');
  return { data, error };
}

/**
 * Listar assinaturas vencendo (próximos 7 dias)
 */
export async function getExpiringSubscriptions(professionalId) {
  const { data, error } = await supabase
    .from('patient_subscriptions')
    .select('*, patient:patients(*)')
    .eq('professional_id', professionalId)
    .eq('status', 'expiring')
    .order('end_date', { ascending: true });
  
  return { data, error };
}

