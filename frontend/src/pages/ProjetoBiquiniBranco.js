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
  Quote, MessageSquareQuote, UserCircle, ExternalLink
} from 'lucide-react';
import WhatsAppFloating from '@/components/WhatsAppFloating';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Formato inválido. Use JPG ou PNG.');
      return;
    }
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
    
    if (!formData.consent_authorized || !formData.terms_accepted) {
      toast.error('Você precisa aceitar os termos e autorizar o uso do depoimento.');
      return;
    }
    if (formData.testimonial_text.length < 20) {
      toast.error('O depoimento precisa ter pelo menos 20 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      let photo_before_url = null, photo_after_url = null, photo_single_url = null;

      const uploadPhoto = async (file, prefix) => {
        const ext = file.name.split('.').pop();
        const fileName = `${prefix}_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('testimonials').upload(fileName, file);
        if (error) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        }
        const { data: { publicUrl } } = supabase.storage.from('testimonials').getPublicUrl(fileName);
        return publicUrl;
      };

      if (photos.before) photo_before_url = await uploadPhoto(photos.before, 'before');
      if (photos.after) photo_after_url = await uploadPhoto(photos.after, 'after');
      if (photos.single) photo_single_url = await uploadPhoto(photos.single, 'single');

      const initials = formData.display_mode === 'initials' 
        ? (formData.initials || generateInitials(formData.display_name))
        : null;

      const { error } = await supabase.from('testimonials').insert({
        project_id: projectId,
        display_mode: formData.display_mode,
        display_name: formData.display_name || null,
        initials,
        email: formData.email || null,
        city: formData.city || null,
        testimonial_text: formData.testimonial_text,
        rating: formData.rating || null,
        kg_lost: formData.kg_lost ? parseFloat(formData.kg_lost) : null,
        duration_text: formData.duration_text || null,
        photo_before_url,
        photo_after_url,
        photo_single_url,
        consent_authorized: true,
        terms_accepted: true,
        status: 'pending'
      });

      if (error) throw error;

      toast.success('✅ Depoimento enviado! Ele será publicado após revisão.');
      setFormData({
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
      setPhotos({ before: null, after: null, single: null });
      setPreviews({ before: null, after: null, single: null });
      setPhotoType('none');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar depoimento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-0 shadow-2xl overflow-hidden bg-white" id="enviar-depoimento">
      <div className="h-2 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-xl">Envie seu Depoimento</CardTitle>
            <p className="text-gray-500 text-sm">Compartilhe sua transformação com a comunidade</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Display mode */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Como deseja ser identificado(a)?</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'full_name', label: 'Nome Completo' },
                { value: 'initials', label: 'Apenas Iniciais' },
                { value: 'anonymous', label: 'Anônimo' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, display_mode: opt.value }))}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all
                    ${formData.display_mode === opt.value 
                      ? 'border-pink-500 bg-pink-50 text-pink-700' 
                      : 'border-gray-200 hover:border-gray-300'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name fields */}
          {formData.display_mode !== 'anonymous' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  {formData.display_mode === 'full_name' ? 'Nome Completo' : 'Nome (para gerar iniciais)'}
                </Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    display_name: e.target.value,
                    initials: prev.display_mode === 'initials' ? generateInitials(e.target.value) : prev.initials
                  }))}
                  placeholder="Seu nome"
                  className="border-gray-200 focus:border-pink-400"
                />
              </div>
              {formData.display_mode === 'initials' && (
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Iniciais (auto ou manual)</Label>
                  <Input
                    value={formData.initials}
                    onChange={(e) => setFormData(prev => ({ ...prev, initials: e.target.value.toUpperCase().slice(0, 3) }))}
                    placeholder="Ex: MC"
                    maxLength={3}
                    className="border-gray-200 focus:border-pink-400"
                  />
                </div>
              )}
            </div>
          )}

          {/* City and email */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Cidade (opcional)</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Ex: São Paulo - SP"
                className="border-gray-200 focus:border-pink-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Email (opcional, não será exibido)</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="seu@email.com"
                className="border-gray-200 focus:border-pink-400"
              />
            </div>
          </div>

          {/* Testimonial text */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Seu Depoimento *</Label>
            <Textarea
              value={formData.testimonial_text}
              onChange={(e) => setFormData(prev => ({ ...prev, testimonial_text: e.target.value }))}
              placeholder="Conte sua experiência com o projeto... (mínimo 20 caracteres)"
              rows={4}
              className="border-gray-200 focus:border-pink-400"
              required
            />
            <p className="text-xs text-gray-400">{formData.testimonial_text.length}/400 caracteres</p>
          </div>

          {/* Results */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Kg perdidos (opcional)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.kg_lost}
                onChange={(e) => setFormData(prev => ({ ...prev, kg_lost: e.target.value }))}
                placeholder="Ex: 12"
                className="border-gray-200 focus:border-pink-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Tempo no projeto (opcional)</Label>
              <Input
                value={formData.duration_text}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_text: e.target.value }))}
                placeholder="Ex: 3 meses"
                className="border-gray-200 focus:border-pink-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Sua nota (opcional)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                    className="p-1"
                  >
                    <Star className={`w-7 h-7 ${star <= formData.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-3">
            <Label className="text-gray-700 font-medium">Fotos (opcional)</Label>
            <div className="flex gap-2">
              {[
                { value: 'none', label: 'Sem foto' },
                { value: 'single', label: 'Uma foto' },
                { value: 'before_after', label: 'Antes/Depois' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setPhotoType(opt.value);
                    if (opt.value === 'none') {
                      setPhotos({ before: null, after: null, single: null });
                      setPreviews({ before: null, after: null, single: null });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                    ${photoType === opt.value 
                      ? 'border-pink-500 bg-pink-50 text-pink-700' 
                      : 'border-gray-200 hover:border-gray-300'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {photoType === 'single' && (
              <div className="flex items-center gap-4">
                {previews.single ? (
                  <div className="relative">
                    <img src={previews.single} alt="Preview" className="w-24 h-24 object-cover rounded-xl border-2" />
                    <button type="button" onClick={() => removePhoto('single')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">Foto</span>
                    <input type="file" accept="image/jpeg,image/png" onChange={(e) => handlePhotoChange('single', e.target.files[0])} className="hidden" />
                  </label>
                )}
              </div>
            )}

            {photoType === 'before_after' && (
              <div className="flex items-center gap-4">
                {previews.before ? (
                  <div className="relative">
                    <img src={previews.before} alt="Antes" className="w-24 h-24 object-cover rounded-xl border-2" />
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">Antes</span>
                    <button type="button" onClick={() => removePhoto('before')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">Antes</span>
                    <input type="file" accept="image/jpeg,image/png" onChange={(e) => handlePhotoChange('before', e.target.files[0])} className="hidden" />
                  </label>
                )}
                <ArrowRight className="w-6 h-6 text-gray-300" />
                {previews.after ? (
                  <div className="relative">
                    <img src={previews.after} alt="Depois" className="w-24 h-24 object-cover rounded-xl border-2" />
                    <span className="absolute bottom-1 left-1 bg-pink-600 text-white text-xs px-2 py-0.5 rounded">Depois</span>
                    <button type="button" onClick={() => removePhoto('after')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">Depois</span>
                    <input type="file" accept="image/jpeg,image/png" onChange={(e) => handlePhotoChange('after', e.target.files[0])} className="hidden" />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Consent checkboxes */}
          <div className="space-y-3 p-4 bg-pink-50 rounded-xl border border-pink-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.consent_authorized}
                onChange={(e) => setFormData(prev => ({ ...prev, consent_authorized: e.target.checked }))}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                required
              />
              <span className="text-sm text-gray-700">
                <strong>Eu autorizo</strong> o uso do meu depoimento e/ou imagens para fins institucionais e de divulgação do projeto, podendo ser exibido publicamente nesta página. *
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.terms_accepted}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_accepted: e.target.checked }))}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                required
              />
              <span className="text-sm text-gray-700">
                <strong>Declaro</strong> que as informações enviadas são verdadeiras e que não incluí dados sensíveis de terceiros. *
              </span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={submitting || !formData.consent_authorized || !formData.terms_accepted}
            className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 hover:from-pink-600 hover:via-rose-600 hover:to-orange-600 text-white py-6 text-lg font-bold rounded-xl shadow-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Enviar Depoimento
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// ==================== TESTIMONIAL CARD COMPONENT ====================
const TestimonialCard = ({ testimonial, featured = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const displayName = () => {
    if (testimonial.display_mode === 'anonymous') return 'Anônimo';
    if (testimonial.display_mode === 'initials') return testimonial.initials || '??';
    return testimonial.display_name || testimonial.initials || 'Participante';
  };

  const hasBeforeAfter = testimonial.photo_before_url && testimonial.photo_after_url;
  const hasPhoto = testimonial.photo_single_url || hasBeforeAfter;

  return (
    <>
      <Card className={`border-0 shadow-lg overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
        ${featured ? 'ring-2 ring-amber-400' : ''}`}
      >
        {/* Top bar - matching editor style */}
        <div className={`h-2 ${featured ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500'}`} />
        
        {/* Featured badge */}
        {featured && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-lg">
              <Star className="w-3 h-3 fill-current mr-1" />
              Destaque
            </Badge>
          </div>
        )}

        {/* Photo section */}
        {hasPhoto && (
          <div className="relative cursor-pointer" onClick={() => setShowPhotoModal(true)}>
            {hasBeforeAfter ? (
              <div className="flex">
                <div className="relative w-1/2">
                  <img src={testimonial.photo_before_url} alt="Antes" className="w-full h-32 object-cover" />
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">Antes</span>
                </div>
                <div className="relative w-1/2">
                  <img src={testimonial.photo_after_url} alt="Depois" className="w-full h-32 object-cover" />
                  <span className="absolute bottom-2 left-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs px-2 py-0.5 rounded">Depois</span>
                </div>
              </div>
            ) : (
              <img src={testimonial.photo_single_url} alt="Foto" className="w-full h-40 object-cover" />
            )}
          </div>
        )}

        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
              {testimonial.display_mode === 'anonymous' ? '?' : (testimonial.initials || displayName().charAt(0))}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{displayName()}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {testimonial.city && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {testimonial.city}
                  </span>
                )}
                {testimonial.kg_lost && (
                  <Badge className="bg-pink-100 text-pink-700 text-xs border-0">
                    -{testimonial.kg_lost}kg
                  </Badge>
                )}
                {testimonial.duration_text && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs border-0">
                    {testimonial.duration_text}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Rating */}
          {testimonial.rating && (
            <div className="flex gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className={`w-4 h-4 ${star <= testimonial.rating ? 'text-amber-400 fill-current' : 'text-gray-200'}`} />
              ))}
            </div>
          )}

          {/* Text */}
          <div className="relative">
            <Quote className="absolute -top-1 -left-1 w-6 h-6 text-pink-200" />
            <p className={`text-gray-700 leading-relaxed pl-5 ${!expanded && testimonial.testimonial_text.length > 200 ? 'line-clamp-3' : ''}`}>
              {testimonial.testimonial_text}
            </p>
            {testimonial.testimonial_text.length > 200 && (
              <button 
                onClick={() => setExpanded(!expanded)}
                className="text-pink-600 text-sm font-medium mt-1 hover:underline"
              >
                {expanded ? 'Ver menos' : 'Ler mais'}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {showPhotoModal && hasPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPhotoModal(false)} className="absolute -top-12 right-0 text-white hover:text-gray-300">
              <X className="w-8 h-8" />
            </button>
            {hasBeforeAfter ? (
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <img src={testimonial.photo_before_url} alt="Antes" className="w-full rounded-xl" />
                  <span className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg font-bold">Antes</span>
                </div>
                <div className="relative flex-1">
                  <img src={testimonial.photo_after_url} alt="Depois" className="w-full rounded-xl" />
                  <span className="absolute bottom-4 left-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 rounded-lg font-bold">Depois</span>
                </div>
              </div>
            ) : (
              <img src={testimonial.photo_single_url} alt="Foto" className="w-full max-h-[80vh] object-contain rounded-xl" />
            )}
          </div>
        </div>
      )}
    </>
  );
};

// ==================== MAIN PAGE COMPONENT ====================
const ProjetoBiquiniBranco = () => {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  // Testimonials state
  const [featuredTestimonials, setFeaturedTestimonials] = useState([]);
  const [communityTestimonials, setCommunityTestimonials] = useState([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [testimonialFilter, setTestimonialFilter] = useState('recent');
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const formRef = useRef(null);

  // Dados padrão
  const defaultData = {
    projectName: 'Projeto Biquíni Branco',
    heroSubtitle: 'EMAGRECIMENTO INTELIGENTE',
    heroTagline: 'Um processo completo para emagrecer com saúde, sem efeito sanfona e sem sofrimento.',
    myths: [
      'Emagrecer em 1 mês é furada',
      'Remédio não resolve',
      'O resultado só permanece quando você aprende a comer',
      'A mudança começa na mente e reflete no corpo'
    ],
    benefits: [
      { icon: 'Calendar', text: '3 meses de acompanhamento', detail: 'Suporte completo durante toda sua transformação' },
      { icon: 'Utensils', text: '3 ajustes estratégicos na dieta', detail: 'Protocolo adaptado ao seu corpo' },
      { icon: 'Clock', text: 'Mudança de protocolo a cada 30 dias', detail: 'Evolução constante e resultados reais' }
    ],
    biweeklyTasks: ['Envio de peso', 'Fotos de acompanhamento'],
    supportGroups: [
      { icon: 'Users', text: 'Grupo de bate-papo', detail: 'Comunidade de apoio 24h' },
      { icon: 'Camera', text: 'Fotos das refeições', detail: 'Feedback diário das suas refeições' },
      { icon: 'Dumbbell', text: 'Treinos e academia', detail: 'Dicas exclusivas de exercícios' }
    ],
    plans: [
      { name: 'TRIMESTRAL', price: 'R$ 200', priceNote: 'Plano trimestral', duration: '3 meses', tagline: '3 MESES DE FOCO TOTAL', features: ['Plano alimentar personalizado', 'Checklist diário', 'Suporte WhatsApp', 'Ajustes a cada 30 dias', 'Acesso aos 2 grupos'], highlight: true, badge: 'MAIS ESCOLHIDO', gradient: 'from-pink-500 via-rose-500 to-orange-500' },
      { name: 'SEMESTRAL', price: 'R$ 360', priceNote: 'Economia de R$40', duration: '6 meses', tagline: '6 MESES PARA TRANSFORMAR', features: ['Tudo do plano trimestral', 'Receitas exclusivas', 'Prioridade no atendimento', 'Suplementação básica'], highlight: false, gradient: 'from-purple-500 to-indigo-600' },
      { name: 'ANUAL', price: 'R$ 660', priceNote: 'Melhor custo-benefício', duration: '12 meses', tagline: '1 ANO PELA SUA SAÚDE', features: ['Tudo dos planos anteriores', 'Grupo VIP exclusivo', 'Consultas extras', 'Bônus surpresa'], highlight: false, badge: 'ECONOMIA MÁXIMA', gradient: 'from-amber-500 to-orange-600' }
    ],
    faq: [
      { question: 'Como funciona o acompanhamento?', answer: 'Você terá acesso à plataforma FitJourney com seu plano personalizado, tarefas diárias, e suporte direto comigo via WhatsApp. A cada 15 dias você envia seu peso e fotos para ajustarmos o protocolo.' },
      { question: 'Preciso malhar?', answer: 'Não é obrigatório, mas atividade física potencializa os resultados. Temos um grupo específico para treinos onde compartilhamos dicas e exercícios.' },
      { question: 'Vou passar fome?', answer: 'De jeito nenhum! O diferencial do programa é ensinar você a comer de forma inteligente. Você vai se alimentar bem e ainda assim emagrecer.' },
      { question: 'E se eu não conseguir seguir?', answer: 'Por isso temos os grupos de suporte! Você não está sozinha. Compartilhamos dificuldades, conquistas e nos motivamos juntas.' }
    ],
    ctaMain: 'QUERO TRANSFORMAR MEU CORPO',
    ctaUrgency: '🔥 VAGAS LIMITADAS',
    ctaEmotional: 'Seu biquíni branco não vai se conquistar sozinho. Garanta sua vaga agora e comece a mudança hoje!',
    whatsappNumber: '5591980124814',
    instagramUrl: 'https://www.instagram.com/dr_wylkem_raiol/'
  };

  useEffect(() => {
    loadProjectData();
    loadTestimonials();
  }, []);

  const loadProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('project_showcase')
        .select('*')
        .eq('project_name', 'biquini_branco')
        .maybeSingle();
      if (error || !data) setProjectData(defaultData);
      else setProjectData({ ...defaultData, ...data.content });
    } catch (error) {
      console.error('Erro:', error);
      setProjectData(defaultData);
    } finally {
      setLoading(false);
    }
  };

  const loadTestimonials = async () => {
    setLoadingTestimonials(true);
    try {
      const { data: featured } = await supabase
        .from('testimonials')
        .select('*')
        .eq('project_id', 'biquini_branco')
        .eq('status', 'approved')
        .eq('is_featured', true)
        .order('approved_at', { ascending: false })
        .limit(6);
      setFeaturedTestimonials(featured || []);

      const { data: community } = await supabase
        .from('testimonials')
        .select('*')
        .eq('project_id', 'biquini_branco')
        .eq('status', 'approved')
        .eq('is_featured', false)
        .order('created_at', { ascending: false })
        .limit(20);
      setCommunityTestimonials(community || []);
    } catch (error) {
      console.error('Erro ao carregar depoimentos:', error);
    } finally {
      setLoadingTestimonials(false);
    }
  };

  const handleWhatsApp = (message = '') => {
    const msg = message || 'Olá! Quero saber mais sobre o Projeto Biquíni Branco e transformar meu corpo! 💪';
    window.open(`https://wa.me/${projectData?.whatsappNumber || '5591980124814'}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handleCTA = (planName = '') => {
    const message = planName 
      ? `Olá! Quero participar do Projeto Biquíni Branco - Plano ${planName}! 🔥`
      : 'Olá! Quero saber mais sobre o Projeto Biquíni Branco e transformar meu corpo! 💪';
    handleWhatsApp(message);
  };

  const scrollToForm = () => {
    setShowTestimonialForm(true);
    setTimeout(() => {
      document.getElementById('enviar-depoimento')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const getIcon = (iconName) => {
    const icons = { Calendar, Utensils, Clock, Users, Camera, Dumbbell, Scale, UserCheck, Activity, Trophy, Brain, Flame, Award, Target, Heart, Sparkles, Shield, Rocket, TrendingUp, Gift };
    return icons[iconName] || Activity;
  };

  const sortedCommunityTestimonials = [...communityTestimonials].sort((a, b) => {
    if (testimonialFilter === 'recent') return new Date(b.created_at) - new Date(a.created_at);
    if (testimonialFilter === 'likes') return (b.likes_count || 0) - (a.likes_count || 0);
    if (testimonialFilter === 'results') return (b.kg_lost || 0) - (a.kg_lost || 0);
    return 0;
  });

  if (loading || !projectData) {
    return (
      <Layout title="Carregando..." userType="visitor">
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-pink-200 rounded-full animate-spin border-t-pink-600" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-pink-600" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={projectData.projectName} userType="visitor">
      <WhatsAppFloating 
        phoneNumber={projectData.whatsappNumber}
        message="Olá! Quero saber mais sobre o Projeto Biquíni Branco!"
      />

      <div className="max-w-6xl mx-auto space-y-8 pb-8">
        
        {/* ==================== HERO PREMIUM - STYLE LIKE EDITOR ==================== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600 via-rose-500 to-orange-500 p-8 md:p-12 text-white shadow-2xl">
          {/* Background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24 blur-2xl" />
          <div className="absolute top-1/2 right-1/4 opacity-20">
            <Flame className="w-32 h-32" />
          </div>
          <div className="absolute bottom-1/4 left-1/4 opacity-10">
            <Heart className="w-24 h-24" />
          </div>
          
          <div className="relative z-10 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-5 py-2.5 rounded-full mb-6 border border-white/30">
              <Crown className="w-5 h-5 text-yellow-300" />
              <span className="font-bold text-sm tracking-wide">PROJETO EXCLUSIVO</span>
              <Badge className="bg-white/20 text-white border-0 text-[10px]">PRO</Badge>
            </div>
            
            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-4 tracking-tight">
              {projectData.projectName.toUpperCase()}
            </h1>
            
            {/* Subtitle */}
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-yellow-300" />
              <h2 className="text-xl md:text-2xl font-bold text-yellow-300 tracking-widest">
                {projectData.heroSubtitle}
              </h2>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-yellow-300" />
            </div>
            
            {/* Tagline */}
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-white/90 leading-relaxed">
              {projectData.heroTagline}
            </p>
            
            {/* CTA */}
            <a
              href={`https://wa.me/${projectData.whatsappNumber}?text=${encodeURIComponent('Olá! Quero saber mais sobre o Projeto Biquíni Branco e transformar meu corpo! 💪')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-white text-pink-600 hover:bg-white/90 text-lg px-10 py-5 rounded-full shadow-xl font-bold transition-all duration-300 hover:scale-105"
            >
              <MessageCircle className="mr-3" size={24} />
              {projectData.ctaMain}
              <ChevronRight className="ml-2" size={22} />
            </a>
            
            {/* Urgency */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-300"></span>
              </span>
              <p className="text-yellow-300 font-bold">{projectData.ctaUrgency}</p>
            </div>
            
            {/* Stats - like editor */}
            <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
              {[
                { value: '500+', label: 'Transformações' },
                { value: '98%', label: 'Satisfação' },
                { value: '12kg', label: 'Média perdida' }
              ].map((stat, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                  <p className="text-2xl md:text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== VERDADES - CARD STYLE ==================== */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{projectData.sectionTitles?.myths || '⚠️ VERDADES QUE NINGUÉM TE CONTA'}</CardTitle>
                <p className="text-gray-500 text-sm">Pontos importantes sobre emagrecimento real</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {projectData.myths.map((myth, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-amber-50 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
                  <Check className="w-4 h-4" />
                </div>
                <p className="text-gray-700 font-medium">{myth}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ==================== BENEFÍCIOS - CARD STYLE ==================== */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{projectData.sectionTitles?.benefits || '✅ O QUE VOCÊ VAI TER'}</CardTitle>
                <p className="text-gray-500 text-sm">Benefícios exclusivos do programa</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid md:grid-cols-3 gap-4">
              {projectData.benefits.map((benefit, index) => {
                const Icon = getIcon(benefit.icon);
                return (
                  <div key={index} className="p-5 bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl border border-pink-100 hover:shadow-md transition-all text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{benefit.text}</h3>
                    {benefit.detail && <p className="text-sm text-gray-500">{benefit.detail}</p>}
                  </div>
                );
              })}
            </div>
            
            {/* Biweekly tasks */}
            <div className="mt-6 p-4 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl text-white flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <span className="font-bold">A cada 15 dias:</span>
              </div>
              {projectData.biweeklyTasks.map((task, index) => (
                <span key={index} className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium">✓ {task}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ==================== SUPORTE - CARD STYLE ==================== */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{projectData.sectionTitles?.support || '👥 SUPORTE EXCLUSIVO EM 2 GRUPOS'}</CardTitle>
                <p className="text-gray-500 text-sm">Você não vai estar sozinha nessa jornada!</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid md:grid-cols-3 gap-4">
              {projectData.supportGroups.map((group, index) => {
                const Icon = getIcon(group.icon);
                return (
                  <div key={index} className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 hover:shadow-md transition-all text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{group.text}</h3>
                    {group.detail && <p className="text-sm text-gray-500">{group.detail}</p>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ==================== PLANOS - CARD STYLE ==================== */}
        <Card className="border-0 shadow-lg overflow-hidden" id="planos">
          <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-600" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{projectData.sectionTitles?.plans || '🏆 PLANOS DE SUCESSO'}</CardTitle>
                <p className="text-gray-500 text-sm">Escolha o plano ideal para sua transformação</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid md:grid-cols-3 gap-6">
              {projectData.plans.filter(plan => plan.active !== false).map((plan, index) => (
                <div key={index} className={`relative rounded-2xl overflow-hidden border-2 transition-all hover:shadow-xl
                  ${plan.highlight ? 'border-pink-400 shadow-lg shadow-pink-100' : 'border-gray-200'}`}
                >
                  {/* Top bar */}
                  <div className={`h-2 bg-gradient-to-r ${plan.gradient}`} />
                  
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute top-4 right-4">
                      <Badge className={`bg-gradient-to-r ${plan.gradient} text-white border-0 shadow-lg text-[10px]`}>
                        {plan.highlight ? <Flame className="w-3 h-3 mr-1" /> : <Gem className="w-3 h-3 mr-1" />}
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-black text-gray-900 mb-2">{plan.name}</h3>
                    <p className={`text-4xl font-black bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>{plan.price}</p>
                    <p className="text-sm text-gray-500 mt-1">{plan.priceNote}</p>
                    <p className={`font-bold text-sm mt-2 bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>{plan.tagline}</p>
                    
                    <div className="my-5 space-y-2">
                      {plan.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-center gap-2 text-left">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center flex-shrink-0`}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <a
                      href={`https://wa.me/${projectData.whatsappNumber}?text=${encodeURIComponent(`Olá! Quero participar do Projeto Biquíni Branco - Plano ${plan.name}! 🔥`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full inline-flex items-center justify-center py-4 rounded-xl font-bold text-white transition-all
                        bg-gradient-to-r ${plan.gradient} hover:opacity-90 shadow-lg`}
                    >
                      QUERO ESSE PLANO
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ==================== DEPOIMENTOS - CARD STYLE ==================== */}
        <Card className="border-0 shadow-lg overflow-hidden" id="depoimentos">
          <div className="h-2 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                  <MessageSquareQuote className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">Resultados Reais da Comunidade</CardTitle>
                  <p className="text-gray-500 text-sm">Depoimentos reais de pacientes que autorizaram a publicação</p>
                </div>
              </div>
              <Button onClick={scrollToForm} className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white hover:opacity-90">
                <Send className="w-4 h-4 mr-2" />
                Enviar meu depoimento
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            {/* Featured */}
            {featuredTestimonials.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-current" />
                  Depoimentos em Destaque
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredTestimonials.map(t => <TestimonialCard key={t.id} testimonial={t} featured />)}
                </div>
              </div>
            )}

            {/* Community */}
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Mural da Comunidade
                  {(featuredTestimonials.length + communityTestimonials.length) > 0 && (
                    <Badge className="bg-purple-100 text-purple-700 border-0 ml-2">
                      +{featuredTestimonials.length + communityTestimonials.length} depoimentos
                    </Badge>
                  )}
                </h3>
                <div className="flex gap-2">
                  {[
                    { value: 'recent', label: 'Mais Recentes' },
                    { value: 'results', label: 'Maior Transformação' }
                  ].map(f => (
                    <button
                      key={f.value}
                      onClick={() => setTestimonialFilter(f.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                        ${testimonialFilter === f.value ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingTestimonials ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
              ) : sortedCommunityTestimonials.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedCommunityTestimonials.map(t => <TestimonialCard key={t.id} testimonial={t} />)}
                </div>
              ) : featuredTestimonials.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <MessageSquareQuote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Nenhum depoimento publicado ainda.</p>
                  <Button onClick={scrollToForm} className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white">
                    Seja o primeiro a compartilhar!
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Form */}
            {showTestimonialForm && (
              <TestimonialForm 
                projectId="biquini_branco" 
                whatsappNumber={projectData.whatsappNumber}
                onSuccess={loadTestimonials}
              />
            )}
          </CardContent>
        </Card>

        {/* ==================== FAQ - CARD STYLE ==================== */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-teal-500 to-cyan-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{projectData.sectionTitles?.faq || '❓ PERGUNTAS FREQUENTES'}</CardTitle>
                <p className="text-gray-500 text-sm">Tire suas dúvidas sobre o programa</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {projectData.faq.map((item, index) => (
              <div 
                key={index}
                className={`rounded-xl border-2 transition-all cursor-pointer overflow-hidden
                  ${expandedFaq === index ? 'border-teal-400 shadow-md bg-teal-50' : 'border-gray-200 hover:border-teal-200'}`}
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <div className="p-4 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 pr-4">{item.question}</h3>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
                    ${expandedFaq === index ? 'bg-teal-500 text-white rotate-180' : 'bg-gray-100 text-gray-400'}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
                {expandedFaq === index && (
                  <div className="px-4 pb-4">
                    <p className="text-gray-700 bg-white p-3 rounded-lg border border-teal-100">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ==================== CTA FINAL - CARD STYLE ==================== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600 via-rose-500 to-orange-500 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24 blur-2xl" />
          <div className="absolute top-1/2 left-1/4 opacity-10">
            <Heart className="w-32 h-32" />
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-5 py-2 rounded-full mb-6 border border-white/30">
              <PartyPopper className="w-5 h-5 text-yellow-300" />
              <span className="font-bold text-sm">SUA VEZ CHEGOU</span>
            </div>
            
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mb-6 max-w-2xl mx-auto leading-tight">
              {projectData.ctaEmotional}
            </h2>
            
            <p className="text-lg mb-8 text-white/90 max-w-xl mx-auto">
              {projectData.ctaFinal || 'Centenas de mulheres já transformaram suas vidas. Agora é sua vez!'}
            </p>
            
            {/* Contact Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`https://wa.me/${projectData.whatsappNumber}?text=${encodeURIComponent('Olá! Quero saber mais sobre o Projeto Biquíni Branco e transformar meu corpo! 💪')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-white text-pink-600 hover:bg-white/90 text-lg px-10 py-5 rounded-full shadow-xl font-bold transition-all"
              >
                <MessageCircle className="mr-3" size={24} />
                FALAR NO WHATSAPP
                <ExternalLink className="w-4 h-4 ml-2 opacity-70" />
              </a>
              
              <a
                href={projectData.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-2 border-white/40 text-lg px-8 py-5 rounded-full transition-all font-bold"
              >
                <Instagram className="mr-3" size={22} />
                VER NO INSTAGRAM
                <ExternalLink className="w-4 h-4 ml-2 opacity-70" />
              </a>
            </div>
            
            {/* Urgency */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-300"></span>
              </span>
              <p className="text-yellow-300 font-black text-lg">
                ⚠️ VAGAS LIMITADAS - GARANTA A SUA AGORA!
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProjetoBiquiniBranco;
