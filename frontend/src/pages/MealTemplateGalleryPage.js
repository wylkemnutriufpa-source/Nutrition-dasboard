/**
 * MealTemplateGalleryPage.js
 * Página da Galeria de Templates Públicos
 * - Profissionais PRO podem publicar (com aprovação do ADM)
 * - Basic e PRO podem ver/usar a galeria
 * - Admin tem aba de revisão de pendentes
 */
import { useState } from 'react';
import Layout from '@/components/Layout';
import PublicTemplatesGallery from '@/components/PublicTemplatesGallery';
import AdminTemplateReview from '@/components/AdminTemplateReview';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Globe, Shield } from 'lucide-react';

const MealTemplateGalleryPage = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState('gallery');

  const tabs = [
    { id: 'gallery', label: 'Galeria Pública', icon: Globe }
  ];

  if (isAdmin) {
    tabs.push({ id: 'review', label: 'Revisão (ADM)', icon: Shield });
  }

  return (
    <Layout title="Galeria de Templates" showBack userType="professional">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Globe className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Galeria de Templates</h1>
              <p className="text-blue-100 text-sm">
                Templates compartilhados pela comunidade de nutricionistas
              </p>
            </div>
          </div>
        </div>

        {/* Tabs (se Admin) */}
        {isAdmin && (
          <div className="flex gap-2 border-b pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  {tab.id === 'review' && (
                    <Badge className="bg-red-100 text-red-700 border-0 text-[10px] ml-1">Pendentes</Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Conteúdo */}
        {activeTab === 'gallery' && (
          <PublicTemplatesGallery />
        )}

        {activeTab === 'review' && isAdmin && (
          <AdminTemplateReview />
        )}
      </div>
    </Layout>
  );
};

export default MealTemplateGalleryPage;
