import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, XCircle, UserCheck, Utensils, Activity, Trophy, 
  MessageCircle, Instagram, Star, ChevronDown, ChevronUp,
  Brain, Camera, Users, Dumbbell, Flame, Clock, Scale,
  Calendar, Award, Sparkles, Heart, ArrowRight, Phone,
  Zap, Target, Crown, Gift, Shield, Rocket, TrendingUp,
  Play, Check, ChevronRight, Gem, PartyPopper, Send,
  Upload, Image as ImageIcon, X, ThumbsUp, MapPin, Loader2,
  Quote, MessageSquareQuote, UserCircle, ExternalLink, HelpCircle
} from 'lucide-react';
import WhatsAppFloating from '@/components/WhatsAppFloating';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ==================== TABS CONFIG ====================
const TABS = [
  { id: 'inicio', label: 'Início', icon: Sparkles },
  { id: 'planos', label: 'Planos', icon: Crown },
  { id: 'depoimentos', label: 'Depoimentos', icon: MessageSquareQuote },
  { id: 'faq', label: 'Dúvidas', icon: HelpCircle }
];

// ==================== TAB NAVIGATION COMPONENT ====================
const TabNavigation = ({ activeTab, onTabChange }) => (
  <div className="flex gap-1 p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
    {TABS.map(tab => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      return (
        <button 
          key={tab.id} 
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
            ${isActive 
              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-200' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
        >
          <Icon className="h-4 w-4" />
          {tab.label}
        </button>
      );
    })}
  </div>
);

// ==================== TESTIMONIAL FORM COMPONENT ====================
const TestimonialForm = ({ projectId, whatsappNumber, onSuccess }) => {
  const [formData, setFormData] = useState({
    display_mode: 'initials',
    display_name: '',
    initials: '',
    email: '',
    city: '',
    testimonial_text: '',
    rating: 5,
    kg_lost: '',
    duration_text: '',
    consent_authorized: false,
    terms_accepted: false
  });
  const [photos, setPhotos] = useState({ before: null, after: null, single: null });
  const [previews, setPreviews] = useState({ before: null, after: null, single: null });
  const [submitting, setSubmitting] = useState(false);
  const [photoType, setPhotoType] = useState('none');

  const handlePhotoChange = (type, file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 2MB.'); return; }
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) { toast.error('Formato inválido. Use JPG ou PNG.'); return; }
    setPhotos(prev => ({ ...prev, [type]: file }));
    const reader = new FileReader();
    reader.onloadend = () => setPreviews(prev => ({ ...prev, [type]: reader.result }));
    reader.readAsDataURL(file);
  };

  const removePhoto = (type) => {
    setPhotos(prev => ({ ...prev, [type]: null }));
    setPreviews(prev => ({ ...prev, [type]: null }));
  };

  const generateInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consent_authorized || !formData.terms_accepted) { toast.error('Você precisa aceitar os termos.'); return; }
    if (formData.testimonial_text.length < 20) { toast.error('O depoimento precisa ter pelo menos 20 caracteres.'); return; }

    setSubmitting(true);
    try {
      let photo_before_url = null, photo_after_url = null, photo_single_url = null;
      const uploadPhoto = async (file, prefix) => {
        const ext = file.name.split('.').pop();
        const fileName = `${prefix}_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('testimonials').upload(fileName, file);
        if (error) { return new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(file); }); }
        const { data: { publicUrl } } = supabase.storage.from('testimonials').getPublicUrl(fileName);
        return publicUrl;
      };
      if (photos.before) photo_before_url = await uploadPhoto(photos.before, 'before');
      if (photos.after) photo_after_url = await uploadPhoto(photos.after, 'after');
      if (photos.single) photo_single_url = await uploadPhoto(photos.single, 'single');
      const initials = formData.display_mode === 'initials' ? (formData.initials || generateInitials(formData.display_name)) : null;
      const { error } = await supabase.from('testimonials').insert({ project_id: projectId, display_mode: formData.display_mode, display_name: formData.display_name || null, initials, email: formData.email || null, city: formData.city || null, testimonial_text: formData.testimonial_text, rating: formData.rating || null, kg_lost: formData.kg_lost ? parseFloat(formData.kg_lost) : null, duration_text: formData.duration_text || null, photo_before_url, photo_after_url, photo_single_url, consent_authorized: true, terms_accepted: true, status: 'pending' });
      if (error) throw error;
      toast.success('✅ Depoimento enviado! Será publicado após revisão.');
      setFormData({ display_mode: 'initials', display_name: '', initials: '', email: '', city: '', testimonial_text: '', rating: 5, kg_lost: '', duration_text: '', consent_authorized: false, terms_accepted: false });
      setPhotos({ before: null, after: null, single: null }); setPreviews({ before: null, after: null, single: null }); setPhotoType('none');
      if (onSuccess) onSuccess();
    } catch (error) { console.error('Erro:', error); toast.error('Erro ao enviar. Tente novamente.'); } finally { setSubmitting(false); }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white" id="enviar-depoimento">
      <div className="h-2 bg-gradient-to-r from-pink-500 to-rose-500" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Envie seu Depoimento</h3>
            <p className="text-sm text-gray-500">Compartilhe sua transformação com a comunidade</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Como deseja ser identificado(a)?</Label>
            <div className="grid grid-cols-3 gap-2">
              {[{ value: 'full_name', label: 'Nome Completo' }, { value: 'initials', label: 'Apenas Iniciais' }, { value: 'anonymous', label: 'Anônimo' }].map(opt => (
                <button key={opt.value} type="button" onClick={() => setFormData(prev => ({ ...prev, display_mode: opt.value }))}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${formData.display_mode === opt.value ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 hover:border-gray-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {formData.display_mode !== 'anonymous' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">{formData.display_mode === 'full_name' ? 'Nome Completo' : 'Nome'}</Label>
                <Input value={formData.display_name} onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value, initials: prev.display_mode === 'initials' ? generateInitials(e.target.value) : prev.initials }))} placeholder="Seu nome" className="border-gray-200 focus:border-pink-400" />
              </div>
              {formData.display_mode === 'initials' && (
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Iniciais</Label>
                  <Input value={formData.initials} onChange={(e) => setFormData(prev => ({ ...prev, initials: e.target.value.toUpperCase().slice(0, 3) }))} placeholder="Ex: MC" maxLength={3} className="border-gray-200 focus:border-pink-400" />
                </div>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Cidade (opcional)</Label>
              <Input value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} placeholder="Ex: São Paulo - SP" className="border-gray-200 focus:border-pink-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Email (opcional)</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="seu@email.com" className="border-gray-200 focus:border-pink-400" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Seu Depoimento *</Label>
            <Textarea value={formData.testimonial_text} onChange={(e) => setFormData(prev => ({ ...prev, testimonial_text: e.target.value }))} placeholder="Conte sua experiência... (mínimo 20 caracteres)" rows={4} className="border-gray-200 focus:border-pink-400" required />
            <p className="text-xs text-gray-400">{formData.testimonial_text.length}/400 caracteres</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Kg perdidos</Label>
              <Input type="number" step="0.1" value={formData.kg_lost} onChange={(e) => setFormData(prev => ({ ...prev, kg_lost: e.target.value }))} placeholder="Ex: 12" className="border-gray-200 focus:border-pink-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Tempo no projeto</Label>
              <Input value={formData.duration_text} onChange={(e) => setFormData(prev => ({ ...prev, duration_text: e.target.value }))} placeholder="Ex: 3 meses" className="border-gray-200 focus:border-pink-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Sua nota</Label>
              <div className="flex gap-1">{[1, 2, 3, 4, 5].map(star => (<button key={star} type="button" onClick={() => setFormData(prev => ({ ...prev, rating: star }))} className="p-1"><Star className={`w-7 h-7 ${star <= formData.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} /></button>))}</div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-gray-700 font-medium">Fotos (opcional)</Label>
            <div className="flex gap-2">
              {[{ value: 'none', label: 'Sem foto' }, { value: 'single', label: 'Uma foto' }, { value: 'before_after', label: 'Antes/Depois' }].map(opt => (
                <button key={opt.value} type="button" onClick={() => { setPhotoType(opt.value); if (opt.value === 'none') { setPhotos({ before: null, after: null, single: null }); setPreviews({ before: null, after: null, single: null }); } }}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${photoType === opt.value ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 hover:border-gray-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {photoType === 'single' && (
              <div className="flex items-center gap-4">
                {previews.single ? (<div className="relative"><img src={previews.single} alt="Preview" className="w-24 h-24 object-cover rounded-xl border-2" /><button type="button" onClick={() => removePhoto('single')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button></div>
                ) : (<label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 transition-colors"><Upload className="w-6 h-6 text-gray-400" /><span className="text-xs text-gray-400 mt-1">Foto</span><input type="file" accept="image/jpeg,image/png" onChange={(e) => handlePhotoChange('single', e.target.files[0])} className="hidden" /></label>)}
              </div>
            )}
            {photoType === 'before_after' && (
              <div className="flex items-center gap-4">
                {previews.before ? (<div className="relative"><img src={previews.before} alt="Antes" className="w-24 h-24 object-cover rounded-xl border-2" /><span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">Antes</span><button type="button" onClick={() => removePhoto('before')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button></div>
                ) : (<label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 transition-colors"><Upload className="w-6 h-6 text-gray-400" /><span className="text-xs text-gray-400 mt-1">Antes</span><input type="file" accept="image/jpeg,image/png" onChange={(e) => handlePhotoChange('before', e.target.files[0])} className="hidden" /></label>)}
                <ArrowRight className="w-6 h-6 text-gray-300" />
                {previews.after ? (<div className="relative"><img src={previews.after} alt="Depois" className="w-24 h-24 object-cover rounded-xl border-2" /><span className="absolute bottom-1 left-1 bg-pink-600 text-white text-xs px-2 py-0.5 rounded">Depois</span><button type="button" onClick={() => removePhoto('after')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button></div>
                ) : (<label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 transition-colors"><Upload className="w-6 h-6 text-gray-400" /><span className="text-xs text-gray-400 mt-1">Depois</span><input type="file" accept="image/jpeg,image/png" onChange={(e) => handlePhotoChange('after', e.target.files[0])} className="hidden" /></label>)}
              </div>
            )}
          </div>

          <div className="space-y-3 p-4 bg-pink-50 rounded-xl border border-pink-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={formData.consent_authorized} onChange={(e) => setFormData(prev => ({ ...prev, consent_authorized: e.target.checked }))} className="mt-1 w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500" required />
              <span className="text-sm text-gray-700"><strong>Eu autorizo</strong> o uso do meu depoimento e/ou imagens para fins de divulgação. *</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={formData.terms_accepted} onChange={(e) => setFormData(prev => ({ ...prev, terms_accepted: e.target.checked }))} className="mt-1 w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500" required />
              <span className="text-sm text-gray-700"><strong>Declaro</strong> que as informações são verdadeiras. *</span>
            </label>
          </div>

          <Button type="submit" disabled={submitting || !formData.consent_authorized || !formData.terms_accepted} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white py-6 text-lg font-bold rounded-xl shadow-lg">
            {submitting ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Enviando...</>) : (<><Send className="w-5 h-5 mr-2" />Enviar Depoimento</>)}
          </Button>
        </form>
      </div>
    </div>
  );
};

// ==================== TESTIMONIAL CARD COMPONENT ====================
const TestimonialCard = ({ testimonial, featured = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const displayName = () => { if (testimonial.display_mode === 'anonymous') return 'Anônimo'; if (testimonial.display_mode === 'initials') return testimonial.initials || '??'; return testimonial.display_name || testimonial.initials || 'Participante'; };
  const hasBeforeAfter = testimonial.photo_before_url && testimonial.photo_after_url;
  const hasPhoto = testimonial.photo_single_url || hasBeforeAfter;

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg ${featured ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
        {featured && (<div className="absolute top-0 right-0 z-10"><Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 rounded-bl-xl rounded-tr-none px-3 py-1 text-xs"><Star className="w-3 h-3 fill-current mr-1" />Destaque</Badge></div>)}
        {hasPhoto && (
          <div className="relative cursor-pointer" onClick={() => setShowPhotoModal(true)}>
            {hasBeforeAfter ? (<div className="flex"><div className="relative w-1/2"><img src={testimonial.photo_before_url} alt="Antes" className="w-full h-32 object-cover" /><span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">Antes</span></div><div className="relative w-1/2"><img src={testimonial.photo_after_url} alt="Depois" className="w-full h-32 object-cover" /><span className="absolute bottom-2 left-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs px-2 py-0.5 rounded">Depois</span></div></div>
            ) : (<img src={testimonial.photo_single_url} alt="Foto" className="w-full h-40 object-cover" />)}
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg shadow-md">{testimonial.display_mode === 'anonymous' ? '?' : (testimonial.initials || displayName().charAt(0))}</div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{displayName()}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {testimonial.city && (<span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{testimonial.city}</span>)}
                {testimonial.kg_lost && (<Badge className="bg-pink-100 text-pink-700 text-xs border-0">-{testimonial.kg_lost}kg</Badge>)}
                {testimonial.duration_text && (<Badge className="bg-purple-100 text-purple-700 text-xs border-0">{testimonial.duration_text}</Badge>)}
              </div>
            </div>
          </div>
          {testimonial.rating && (<div className="flex gap-0.5 mb-2">{[1, 2, 3, 4, 5].map(star => (<Star key={star} className={`w-4 h-4 ${star <= testimonial.rating ? 'text-amber-400 fill-current' : 'text-gray-200'}`} />))}</div>)}
          <div className="relative">
            <Quote className="absolute -top-1 -left-1 w-6 h-6 text-pink-200" />
            <p className={`text-gray-700 leading-relaxed pl-5 ${!expanded && testimonial.testimonial_text.length > 200 ? 'line-clamp-3' : ''}`}>{testimonial.testimonial_text}</p>
            {testimonial.testimonial_text.length > 200 && (<button onClick={() => setExpanded(!expanded)} className="text-pink-600 text-sm font-medium mt-1 hover:underline">{expanded ? 'Ver menos' : 'Ler mais'}</button>)}
          </div>
        </div>
      </div>
      {showPhotoModal && hasPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPhotoModal(false)} className="absolute -top-12 right-0 text-white hover:text-gray-300"><X className="w-8 h-8" /></button>
            {hasBeforeAfter ? (<div className="flex gap-4"><div className="relative flex-1"><img src={testimonial.photo_before_url} alt="Antes" className="w-full rounded-xl" /><span className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg font-bold">Antes</span></div><div className="relative flex-1"><img src={testimonial.photo_after_url} alt="Depois" className="w-full rounded-xl" /><span className="absolute bottom-4 left-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 rounded-lg font-bold">Depois</span></div></div>
            ) : (<img src={testimonial.photo_single_url} alt="Foto" className="w-full max-h-[80vh] object-contain rounded-xl" />)}
          </div>
        </div>
      )}
    </>
  );
};

// ==================== MAIN PAGE COMPONENT ====================
const ProjetoBiquiniBranco = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inicio');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [featuredTestimonials, setFeaturedTestimonials] = useState([]);
  const [communityTestimonials, setCommunityTestimonials] = useState([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [testimonialFilter, setTestimonialFilter] = useState('recent');
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);

  const defaultData = {
    projectName: 'Projeto Biquíni Branco',
    heroSubtitle: 'EMAGRECIMENTO INTELIGENTE',
    heroTagline: 'Um processo completo para emagrecer com saúde, sem efeito sanfona e sem sofrimento.',
    myths: ['Emagrecer em 1 mês é furada', 'Remédio não resolve', 'O resultado só permanece quando você aprende a comer', 'A mudança começa na mente e reflete no corpo'],
    benefits: [{ icon: 'Calendar', text: '3 meses de acompanhamento', detail: 'Suporte completo' }, { icon: 'Utensils', text: '3 ajustes estratégicos', detail: 'Protocolo adaptado' }, { icon: 'Clock', text: 'Mudança a cada 30 dias', detail: 'Evolução constante' }],
    biweeklyTasks: ['Envio de peso', 'Fotos de acompanhamento'],
    supportGroups: [{ icon: 'Users', text: 'Grupo de bate-papo', detail: 'Comunidade 24h' }, { icon: 'Camera', text: 'Fotos das refeições', detail: 'Feedback diário' }, { icon: 'Dumbbell', text: 'Treinos e academia', detail: 'Dicas de exercícios' }],
    plans: [
      { name: 'TRIMESTRAL', price: 'R$ 200', priceNote: 'Plano trimestral', tagline: '3 MESES DE FOCO', features: ['Plano personalizado', 'Checklist diário', 'Suporte WhatsApp', 'Ajustes a cada 30 dias', 'Acesso aos 2 grupos'], highlight: true, badge: 'MAIS ESCOLHIDO', gradient: 'from-pink-500 to-rose-500' },
      { name: 'SEMESTRAL', price: 'R$ 360', priceNote: 'Economia de R$40', tagline: '6 MESES PARA TRANSFORMAR', features: ['Tudo do trimestral', 'Receitas exclusivas', 'Prioridade atendimento', 'Suplementação básica'], highlight: false, gradient: 'from-purple-500 to-indigo-600' },
      { name: 'ANUAL', price: 'R$ 660', priceNote: 'Melhor custo-benefício', tagline: '1 ANO PELA SUA SAÚDE', features: ['Tudo dos anteriores', 'Grupo VIP exclusivo', 'Consultas extras', 'Bônus surpresa'], highlight: false, badge: 'ECONOMIA MÁXIMA', gradient: 'from-amber-500 to-orange-600' }
    ],
    faq: [
      { question: 'Como funciona o acompanhamento?', answer: 'Você terá acesso à plataforma FitJourney com seu plano personalizado, tarefas diárias, e suporte direto via WhatsApp.' },
      { question: 'Preciso malhar?', answer: 'Não é obrigatório, mas atividade física potencializa os resultados.' },
      { question: 'Vou passar fome?', answer: 'De jeito nenhum! O diferencial é ensinar você a comer de forma inteligente.' },
      { question: 'E se eu não conseguir seguir?', answer: 'Temos grupos de suporte! Você não está sozinha.' }
    ],
    ctaMain: 'QUERO TRANSFORMAR MEU CORPO',
    ctaUrgency: '🔥 VAGAS LIMITADAS',
    ctaEmotional: 'Seu biquíni branco não vai se conquistar sozinho. Garanta sua vaga agora!',
    whatsappNumber: '5591980124814',
    instagramUrl: 'https://www.instagram.com/dr_wylkem_raiol/'
  };

  useEffect(() => { loadProjectData(); loadTestimonials(); }, []);

  const loadProjectData = async () => {
    try {
      const { data, error } = await supabase.from('project_showcase').select('*').eq('project_name', 'biquini_branco').maybeSingle();
      if (error || !data) setProjectData(defaultData);
      else setProjectData({ ...defaultData, ...data.content });
    } catch (error) { console.error('Erro:', error); setProjectData(defaultData); } finally { setLoading(false); }
  };

  const loadTestimonials = async () => {
    setLoadingTestimonials(true);
    try {
      const { data: featured } = await supabase.from('testimonials').select('*').eq('project_id', 'biquini_branco').eq('status', 'approved').eq('is_featured', true).order('approved_at', { ascending: false }).limit(6);
      setFeaturedTestimonials(featured || []);
      const { data: community } = await supabase.from('testimonials').select('*').eq('project_id', 'biquini_branco').eq('status', 'approved').eq('is_featured', false).order('created_at', { ascending: false }).limit(20);
      setCommunityTestimonials(community || []);
    } catch (error) { console.error('Erro:', error); } finally { setLoadingTestimonials(false); }
  };

  const scrollToForm = () => { setShowTestimonialForm(true); setActiveTab('depoimentos'); setTimeout(() => { document.getElementById('enviar-depoimento')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); };

  const getIcon = (iconName) => { const icons = { Calendar, Utensils, Clock, Users, Camera, Dumbbell, Scale, UserCheck, Activity, Trophy, Brain, Flame, Award, Target, Heart, Sparkles, Shield, Rocket, TrendingUp, Gift }; return icons[iconName] || Activity; };

  const sortedCommunityTestimonials = [...communityTestimonials].sort((a, b) => { if (testimonialFilter === 'recent') return new Date(b.created_at) - new Date(a.created_at); if (testimonialFilter === 'results') return (b.kg_lost || 0) - (a.kg_lost || 0); return 0; });

  if (loading || !projectData) {
    return (
      <Layout title="Carregando..." userType="visitor">
        <div className="flex items-center justify-center h-64">
          <div className="relative"><div className="w-16 h-16 border-4 border-pink-200 rounded-full animate-spin border-t-pink-600" /><Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-pink-600" /></div>
        </div>
      </Layout>
    );
  }

  // ==================== RENDER TAB CONTENT ====================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <div className="space-y-6">
            {/* Verdades */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg"><Shield className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{projectData.sectionTitles?.myths || '⚠️ VERDADES QUE NINGUÉM TE CONTA'}</h3>
                    <p className="text-sm text-gray-500">Pontos importantes sobre emagrecimento real</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {projectData.myths.map((myth, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-amber-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white"><Check className="w-4 h-4" /></div>
                      <p className="text-gray-700 font-medium">{myth}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Benefícios */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="h-2 bg-gradient-to-r from-pink-500 to-rose-500" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg"><Gift className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{projectData.sectionTitles?.benefits || '✅ O QUE VOCÊ VAI TER'}</h3>
                    <p className="text-sm text-gray-500">Benefícios exclusivos do programa</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {projectData.benefits.map((benefit, index) => {
                    const Icon = getIcon(benefit.icon);
                    return (
                      <div key={index} className="p-5 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-100 hover:shadow-md transition-all text-center">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg"><Icon className="w-7 h-7" /></div>
                        <h4 className="font-bold text-gray-900 mb-1">{benefit.text}</h4>
                        {benefit.detail && <p className="text-sm text-gray-500">{benefit.detail}</p>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 p-4 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl text-white flex flex-wrap items-center justify-center gap-4">
                  <div className="flex items-center gap-2"><Camera className="w-5 h-5" /><span className="font-bold">A cada 15 dias:</span></div>
                  {projectData.biweeklyTasks.map((task, index) => (<span key={index} className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium">✓ {task}</span>))}
                </div>
              </div>
            </div>

            {/* Suporte */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><Users className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{projectData.sectionTitles?.support || '👥 SUPORTE EM 2 GRUPOS'}</h3>
                    <p className="text-sm text-gray-500">Você não vai estar sozinha!</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {projectData.supportGroups.map((group, index) => {
                    const Icon = getIcon(group.icon);
                    return (
                      <div key={index} className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 hover:shadow-md transition-all text-center">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><Icon className="w-7 h-7" /></div>
                        <h4 className="font-bold text-gray-900 mb-1">{group.text}</h4>
                        {group.detail && <p className="text-sm text-gray-500">{group.detail}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 'planos':
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {projectData.plans.filter(plan => plan.active !== false).map((plan, index) => (
                <div key={index} className={`relative overflow-hidden rounded-2xl border transition-all hover:shadow-xl ${plan.highlight ? 'border-pink-300 shadow-lg shadow-pink-100/50' : 'border-gray-100 bg-white'}`}>
                  <div className={`h-2 bg-gradient-to-r ${plan.gradient}`} />
                  {plan.badge && (<div className="absolute top-4 right-4"><Badge className={`bg-gradient-to-r ${plan.gradient} text-white border-0 shadow-lg text-[10px]`}>{plan.highlight ? <Flame className="w-3 h-3 mr-1" /> : <Gem className="w-3 h-3 mr-1" />}{plan.badge}</Badge></div>)}
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-black text-gray-900 mb-2">{plan.name}</h3>
                    <p className={`text-4xl font-black bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>{plan.price}</p>
                    <p className="text-sm text-gray-500 mt-1">{plan.priceNote}</p>
                    <p className={`font-bold text-sm mt-2 bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>{plan.tagline}</p>
                    <div className="my-5 space-y-2">
                      {plan.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-center gap-2 text-left">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center flex-shrink-0`}><Check className="w-3 h-3 text-white" /></div>
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <a href={`https://wa.me/${projectData.whatsappNumber}?text=${encodeURIComponent(`Olá! Quero o Plano ${plan.name}! 🔥`)}`} target="_blank" rel="noopener noreferrer"
                      className={`w-full inline-flex items-center justify-center py-4 rounded-xl font-bold text-white transition-all bg-gradient-to-r ${plan.gradient} hover:opacity-90 shadow-lg`}>
                      QUERO ESSE PLANO <ArrowRight className="ml-2 w-5 h-5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'depoimentos':
        return (
          <div className="space-y-6">
            {featuredTestimonials.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-amber-500 fill-current" />Depoimentos em Destaque</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{featuredTestimonials.map(t => <TestimonialCard key={t.id} testimonial={t} featured />)}</div>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />Mural da Comunidade
                  {(featuredTestimonials.length + communityTestimonials.length) > 0 && (<Badge className="bg-purple-100 text-purple-700 border-0 ml-2">+{featuredTestimonials.length + communityTestimonials.length}</Badge>)}
                </h3>
                <div className="flex gap-2">
                  {[{ value: 'recent', label: 'Mais Recentes' }, { value: 'results', label: 'Maior Transformação' }].map(f => (
                    <button key={f.value} onClick={() => setTestimonialFilter(f.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${testimonialFilter === f.value ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f.label}</button>
                  ))}
                </div>
              </div>
              {loadingTestimonials ? (<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
              ) : sortedCommunityTestimonials.length > 0 ? (<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{sortedCommunityTestimonials.map(t => <TestimonialCard key={t.id} testimonial={t} />)}</div>
              ) : featuredTestimonials.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl"><MessageSquareQuote className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 mb-4">Nenhum depoimento ainda.</p><Button onClick={() => setShowTestimonialForm(true)} className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">Seja o primeiro!</Button></div>
              ) : null}
            </div>
            {!showTestimonialForm && (<div className="text-center"><Button onClick={() => setShowTestimonialForm(true)} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-8 py-4 font-bold rounded-xl shadow-lg"><Send className="w-5 h-5 mr-2" />Enviar meu depoimento</Button></div>)}
            {showTestimonialForm && <TestimonialForm projectId="biquini_branco" whatsappNumber={projectData.whatsappNumber} onSuccess={loadTestimonials} />}
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-3">
            {projectData.faq.map((item, index) => (
              <div key={index} className={`rounded-xl border transition-all ${expandedFaq === index ? 'border-pink-200 shadow-md bg-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                <button onClick={() => setExpandedFaq(expandedFaq === index ? null : index)} className="w-full flex items-center justify-between p-4 text-left">
                  <span className="font-semibold text-gray-900 text-sm pr-4">{item.question}</span>
                  {expandedFaq === index ? <ChevronUp className="h-4 w-4 text-pink-500 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                </button>
                {expandedFaq === index && (<div className="px-4 pb-4 border-t border-gray-100 pt-3"><p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p></div>)}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout title={projectData.projectName} userType="visitor">
      <WhatsAppFloating phoneNumber={projectData.whatsappNumber} message="Olá! Quero saber mais sobre o Projeto Biquíni Branco!" />

      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        {/* ==================== HERO PREMIUM ====================  */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-pink-600 via-rose-500 to-orange-500 p-6 md:p-10 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="absolute top-1/2 right-1/4 opacity-20"><Flame className="w-24 h-24" /></div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-white/30">
                <Crown className="w-4 h-4 text-yellow-300" />
                <span className="font-bold text-sm">PROJETO EXCLUSIVO</span>
                <Badge className="bg-white/20 text-white border-0 text-[10px]">PRO</Badge>
              </div>
              
              <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight">{projectData.projectName.toUpperCase()}</h1>
              
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-yellow-300" />
                <h2 className="text-lg md:text-xl font-bold text-yellow-300 tracking-widest">{projectData.heroSubtitle}</h2>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-yellow-300" />
              </div>
              
              <p className="text-base md:text-lg mb-6 max-w-xl mx-auto text-white/90">{projectData.heroTagline}</p>
              
              <a href={`https://wa.me/${projectData.whatsappNumber}?text=${encodeURIComponent('Olá! Quero saber mais sobre o Projeto Biquíni Branco! 💪')}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center bg-white text-pink-600 hover:bg-white/90 text-base md:text-lg px-8 py-4 rounded-full shadow-xl font-bold transition-all hover:scale-105">
                <MessageCircle className="mr-2" size={22} />{projectData.ctaMain}<ChevronRight className="ml-2" size={20} />
              </a>
              
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span className="relative h-3 w-3 rounded-full bg-yellow-300"></span></span>
                <p className="text-yellow-300 font-bold text-sm">{projectData.ctaUrgency}</p>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mt-8 max-w-sm mx-auto">
                {[{ value: '500+', label: 'Transformações' }, { value: '98%', label: 'Satisfação' }, { value: '12kg', label: 'Média perdida' }].map((stat, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-2 text-center"><p className="text-xl md:text-2xl font-bold">{stat.value}</p><p className="text-[10px] text-white/70">{stat.label}</p></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== TAB NAVIGATION ==================== */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ==================== TAB CONTENT ==================== */}
        {renderTabContent()}

        {/* ==================== CTA FINAL ==================== */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-br from-pink-600 via-rose-500 to-orange-500 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16" />
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-white/30">
                <PartyPopper className="w-4 h-4 text-yellow-300" />
                <span className="font-bold text-sm">SUA VEZ CHEGOU</span>
              </div>
              
              <h2 className="text-xl md:text-2xl font-black mb-4 max-w-lg mx-auto">{projectData.ctaEmotional}</h2>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href={`https://wa.me/${projectData.whatsappNumber}?text=${encodeURIComponent('Olá! Quero transformar meu corpo! 💪')}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-white text-pink-600 hover:bg-white/90 px-8 py-4 rounded-full shadow-xl font-bold transition-all">
                  <MessageCircle className="mr-2" size={20} />FALAR NO WHATSAPP<ExternalLink className="w-4 h-4 ml-2 opacity-70" />
                </a>
                <a href={projectData.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-2 border-white/40 px-6 py-4 rounded-full transition-all font-bold">
                  <Instagram className="mr-2" size={18} />INSTAGRAM<ExternalLink className="w-4 h-4 ml-2 opacity-70" />
                </a>
              </div>
              
              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span className="relative h-3 w-3 rounded-full bg-yellow-300"></span></span>
                <p className="text-yellow-300 font-bold text-sm">⚠️ VAGAS LIMITADAS!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProjetoBiquiniBranco;
