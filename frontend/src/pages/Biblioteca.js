import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Book, ShoppingCart, Pill, Calculator, ChefHat, 
  Apple, Scale, Heart, ChevronRight, Sparkles, ArrowLeft
} from 'lucide-react';

const Biblioteca = () => {
  const navigate = useNavigate();

  const sections = [
    {
      id: 'receitas',
      title: 'Minhas Receitas',
      description: 'Receitas saudáveis personalizadas para você',
      icon: ChefHat,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      route: '/patient/receitas',
      badge: null
    },
    {
      id: 'lista-compras',
      title: 'Lista de Compras',
      description: 'Organize suas compras de forma inteligente',
      icon: ShoppingCart,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      route: '/patient/lista-compras',
      badge: null
    },
    {
      id: 'suplementos',
      title: 'Suplementos',
      description: 'Acompanhe seus suplementos recomendados',
      icon: Pill,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      route: '/patient/suplementos',
      badge: null
    },
    {
      id: 'calculadoras',
      title: 'Calculadoras',
      description: 'IMC, TMB, necessidades calóricas e mais',
      icon: Calculator,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      route: '/patient/calculadoras',
      badge: 'Novo'
    }
  ];

  const quickTools = [
    { icon: Scale, label: 'Calcular IMC', color: 'text-teal-600' },
    { icon: Apple, label: 'Calorias', color: 'text-red-500' },
    { icon: Heart, label: 'Freq. Cardíaca', color: 'text-pink-500' }
  ];

  return (
    <Layout title="Biblioteca" userType="patient">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Botão Voltar */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {/* Header */}
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Book className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Biblioteca</h1>
          <p className="text-gray-600 mt-2">Todas as suas ferramentas em um só lugar</p>
        </div>

        {/* Seções principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => (
            <Card 
              key={section.id}
              className={`${section.bgColor} border-0 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]`}
              onClick={() => navigate(section.route)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`${section.color} p-3 rounded-xl`}>
                    <section.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${section.textColor}`}>
                        {section.title}
                      </h3>
                      {section.badge && (
                        <Badge className="bg-yellow-400 text-yellow-900 border-0 text-xs">
                          {section.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className={`h-5 w-5 ${section.textColor} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ferramentas Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Ferramentas Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {quickTools.map((tool, idx) => (
                <Button 
                  key={idx}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:bg-gray-50"
                  onClick={() => navigate('/patient/calculadoras')}
                >
                  <tool.icon className={`h-6 w-6 ${tool.color}`} />
                  <span className="text-xs text-gray-600">{tool.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dica */}
        <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-teal-800">Dica</h4>
                <p className="text-sm text-teal-700">
                  Use a lista de compras para organizar suas idas ao mercado com base no seu plano alimentar!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Biblioteca;
