import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut
} from '@/components/ui/command';
import {
  Home, Users, Calendar, Calculator, FileText, Settings, 
  Database, Palette, Shield, ClipboardList, MessageSquare,
  ChefHat, Sparkles, DollarSign, CalendarDays, Bot, BarChart3,
  Book, Rocket, Search, User, Utensils, Camera, Activity,
  Pill, Lightbulb, TrendingUp, ShoppingCart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * GlobalSearch - Command Palette (Ctrl+K / Cmd+K)
 * Busca: Páginas, Pacientes, Funções
 * Disponível para profissionais e admins
 */
const GlobalSearch = ({ userType }) => {
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Atalho Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Carregar pacientes ao abrir (lazy load)
  useEffect(() => {
    if (open && patients.length === 0 && user?.id) {
      loadPatients();
    }
  }, [open, user?.id]);

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const { data } = await supabase
        .from('professional_patients')
        .select('patient:patient_id(id, name, email)')
        .eq('professional_id', user.id)
        .limit(50);
      
      if (data) {
        setPatients(data.map(d => d.patient).filter(Boolean));
      }
    } catch (err) {
      console.error('Erro ao carregar pacientes para busca:', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleSelect = useCallback((path) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  // Páginas do Profissional
  const professionalPages = [
    { path: '/professional/dashboard', label: 'Dashboard', icon: Home, keywords: 'inicio home painel' },
    { path: '/professional/patients', label: 'Pacientes', icon: Users, keywords: 'lista paciente cliente' },
    { path: '/professional/meal-plan-editor', label: 'Editor de Plano Alimentar', icon: Utensils, keywords: 'plano alimentar dieta refeicao cardapio' },
    { path: '/professional/feedbacks', label: 'Feedbacks', icon: MessageSquare, keywords: 'feedback retorno mensagem' },
    { path: '/professional/receitas', label: 'Receitas', icon: ChefHat, keywords: 'receita culinaria preparacao' },
    { path: '/professional/templates', label: 'Templates Globais', icon: Rocket, keywords: 'template modelo padrao' },
    { path: '/professional/agenda', label: 'Agenda', icon: CalendarDays, keywords: 'agenda calendario compromisso consulta' },
    { path: '/professional/financeiro', label: 'Financeiro', icon: DollarSign, keywords: 'financeiro pagamento cobranca' },
    { path: '/professional/food-database', label: 'Banco de Alimentos', icon: Database, keywords: 'alimento comida taco nutriente' },
    { path: '/professional/automations', label: 'Automações', icon: Bot, keywords: 'automacao regra automatico bot' },
    { path: '/professional/reports', label: 'Relatórios Inteligentes', icon: BarChart3, keywords: 'relatorio semanal grafico estatistica' },
    { path: '/professional/guide', label: 'Central de Recursos', icon: Book, keywords: 'recurso guia tutorial ajuda' },
    { path: '/professional/branding', label: 'Personalização', icon: Palette, keywords: 'marca logo cor personalizar' },
    { path: '/professional/settings', label: 'Configurações', icon: Settings, keywords: 'config perfil conta' },
    { path: '/professional/projeto-editor', label: 'Projeto Biquíni', icon: Sparkles, keywords: 'projeto biquini desafio' },
    { path: '/professional/testimonials', label: 'Depoimentos', icon: MessageSquare, keywords: 'depoimento avaliacao opiniao' }
  ];

  // Páginas do Admin
  const adminPages = [
    { path: '/admin/dashboard', label: 'Painel Admin', icon: Shield, keywords: 'admin painel controle' },
    { path: '/admin/features', label: 'Controle de Features', icon: Settings, keywords: 'feature funcionalidade flag controle' }
  ];

  // Ações Rápidas
  const quickActions = [
    { path: '/professional/patients', label: 'Novo Paciente', icon: User, keywords: 'criar novo paciente adicionar' },
    { path: '/professional/meal-plan-editor', label: 'Criar Plano Alimentar', icon: Utensils, keywords: 'criar plano alimentar novo' },
    { path: '/professional/templates', label: 'Criar Template', icon: Rocket, keywords: 'criar template modelo' },
    { path: '/professional/agenda', label: 'Agendar Consulta', icon: Calendar, keywords: 'agendar consulta novo' }
  ];

  // Ferramentas do Paciente (para admin visualizar)
  const patientTools = [
    { path: '/patient/dashboard', label: 'Dashboard Paciente', icon: Home, keywords: 'dashboard paciente inicio' },
    { path: '/patient/anamnese', label: 'Anamnese', icon: ClipboardList, keywords: 'anamnese formulario historico' },
    { path: '/patient/avaliacao-fisica', label: 'Avaliação Física', icon: Activity, keywords: 'avaliacao fisica medidas corpo' },
    { path: '/patient/receitas', label: 'Receitas do Paciente', icon: ChefHat, keywords: 'receitas paciente' },
    { path: '/patient/lista-compras', label: 'Lista de Compras', icon: ShoppingCart, keywords: 'lista compras supermercado' }
  ];

  const isProfessional = userType === 'professional' || userType === 'admin';
  const isAdmin = userType === 'admin';

  return (
    <>
      {/* Botão de busca no header */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-all group"
      >
        <Search size={16} className="text-gray-400 group-hover:text-gray-600" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-gray-500 border-gray-300">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar páginas, pacientes, funções..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          {/* Ações Rápidas */}
          <CommandGroup heading="Ações Rápidas">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <CommandItem
                  key={action.path + action.label}
                  value={`${action.label} ${action.keywords}`}
                  onSelect={() => handleSelect(action.path)}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-2">
                    <Icon size={16} className="text-emerald-600" />
                  </div>
                  <span>{action.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Pacientes */}
          {isProfessional && patients.length > 0 && (
            <>
              <CommandGroup heading="Pacientes">
                {patients.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={`${patient.name} ${patient.email} paciente`}
                    onSelect={() => handleSelect(`/professional/patient/${patient.id}`)}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                      <User size={14} className="text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{patient.name}</span>
                      <span className="text-xs text-gray-500">{patient.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Páginas */}
          {isProfessional && (
            <CommandGroup heading="Páginas">
              {professionalPages.map((page) => {
                const Icon = page.icon;
                return (
                  <CommandItem
                    key={page.path}
                    value={`${page.label} ${page.keywords}`}
                    onSelect={() => handleSelect(page.path)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mr-2">
                      <Icon size={16} className="text-gray-600" />
                    </div>
                    <span>{page.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Admin */}
          {isAdmin && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Administração">
                {adminPages.map((page) => {
                  const Icon = page.icon;
                  return (
                    <CommandItem
                      key={page.path}
                      value={`${page.label} ${page.keywords}`}
                      onSelect={() => handleSelect(page.path)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mr-2">
                        <Icon size={16} className="text-purple-600" />
                      </div>
                      <span>{page.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;
