import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, XCircle, Star, Loader2, Eye, Trash2,
  MessageSquareQuote, Clock, MapPin, User, Search,
  Filter, ChevronDown, ChevronUp, X, ExternalLink,
  Award, AlertTriangle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const TestimonialsModeration = () => {
  const { profile } = useAuth();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);

  useEffect(() => {
    loadTestimonials();
  }, [filter]);

  const loadTestimonials = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('testimonials')
        .select('*')
        .eq('project_id', 'biquini_branco')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Erro ao carregar:', error);
      toast.error('Erro ao carregar depoimentos');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, makeFeatured = false) => {
    setProcessing(id);
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({
          status: 'approved',
          is_featured: makeFeatured,
          approved_by: profile?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(makeFeatured ? '✅ Aprovado e destacado!' : '✅ Depoimento aprovado!');
      loadTestimonials();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao aprovar');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id) => {
    setProcessing(id);
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({
          status: 'rejected',
          moderation_note: rejectReason || null,
          approved_by: profile?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Depoimento reprovado');
      setShowRejectModal(null);
      setRejectReason('');
      loadTestimonials();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao reprovar');
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleFeatured = async (id, currentFeatured) => {
    setProcessing(id);
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({ is_featured: !currentFeatured })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentFeatured ? 'Removido dos destaques' : '⭐ Adicionado aos destaques!');
      loadTestimonials();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este depoimento permanentemente?')) return;
    
    setProcessing(id);
    try {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Depoimento excluído');
      loadTestimonials();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir');
    } finally {
      setProcessing(null);
    }
  };

  const getDisplayName = (t) => {
    if (t.display_mode === 'anonymous') return 'Anônimo';
    if (t.display_mode === 'initials') return t.initials || '??';
    return t.display_name || t.initials || 'Participante';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 border-0">⏳ Pendente</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-0">✅ Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-0">❌ Reprovado</Badge>;
      default:
        return null;
    }
  };

  const filteredTestimonials = testimonials.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.testimonial_text?.toLowerCase().includes(q) ||
      t.display_name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.city?.toLowerCase().includes(q)
    );
  });

  const stats = {
    pending: testimonials.filter(t => t.status === 'pending').length,
    approved: testimonials.filter(t => t.status === 'approved').length,
    featured: testimonials.filter(t => t.is_featured).length,
    rejected: testimonials.filter(t => t.status === 'rejected').length
  };

  return (
    <Layout title="Moderação de Depoimentos" userType="professional">
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 p-8 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-2xl" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <MessageSquareQuote className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight">Moderação de Depoimentos</h1>
                    <p className="text-white/80 text-sm">Aprove, destaque ou rejeite depoimentos da comunidade</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => window.open('/visitor/projeto#depoimentos', '_blank')}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Página
                  <ExternalLink className="h-3 w-3 ml-2 opacity-70" />
                </Button>
                <Button 
                  onClick={loadTestimonials}
                  className="bg-white text-purple-600 hover:bg-white/90"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              {[
                { label: 'Pendentes', value: stats.pending, color: 'bg-amber-500/20', icon: Clock },
                { label: 'Aprovados', value: stats.approved, color: 'bg-green-500/20', icon: CheckCircle },
                { label: 'Destaques', value: stats.featured, color: 'bg-yellow-500/20', icon: Star },
                { label: 'Reprovados', value: stats.rejected, color: 'bg-red-500/20', icon: XCircle }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className={`${stat.color} rounded-xl p-3 text-center`}>
                    <Icon className="w-5 h-5 mx-auto mb-1 opacity-80" />
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-white/70">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, texto, email..."
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'pending', label: 'Pendentes', count: stats.pending },
              { value: 'approved', label: 'Aprovados', count: stats.approved },
              { value: 'rejected', label: 'Reprovados', count: stats.rejected },
              { value: 'all', label: 'Todos', count: testimonials.length }
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2
                  ${filter === f.value 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {f.label}
                {f.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === f.value ? 'bg-white/20' : 'bg-gray-200'}`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Testimonials List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : filteredTestimonials.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
            <MessageSquareQuote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum depoimento encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTestimonials.map((testimonial) => (
              <Card key={testimonial.id} className="border-0 shadow-lg overflow-hidden">
                <div className={`h-1 ${testimonial.status === 'pending' ? 'bg-amber-400' : testimonial.status === 'approved' ? 'bg-green-500' : 'bg-red-400'}`} />
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Photos */}
                    {(testimonial.photo_before_url || testimonial.photo_after_url || testimonial.photo_single_url) && (
                      <div className="flex gap-2 flex-shrink-0">
                        {testimonial.photo_before_url && testimonial.photo_after_url ? (
                          <>
                            <div className="relative">
                              <img src={testimonial.photo_before_url} alt="Antes" className="w-24 h-24 object-cover rounded-xl" />
                              <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">Antes</span>
                            </div>
                            <div className="relative">
                              <img src={testimonial.photo_after_url} alt="Depois" className="w-24 h-24 object-cover rounded-xl" />
                              <span className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded">Depois</span>
                            </div>
                          </>
                        ) : testimonial.photo_single_url && (
                          <img src={testimonial.photo_single_url} alt="Foto" className="w-24 h-24 object-cover rounded-xl" />
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {testimonial.display_mode === 'anonymous' ? '?' : (testimonial.initials || getDisplayName(testimonial).charAt(0))}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-gray-900">{getDisplayName(testimonial)}</p>
                              {getStatusBadge(testimonial.status)}
                              {testimonial.is_featured && (
                                <Badge className="bg-amber-100 text-amber-700 border-0">⭐ Destaque</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              {testimonial.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {testimonial.city}
                                </span>
                              )}
                              {testimonial.email && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {testimonial.email}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(testimonial.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Badges */}
                        <div className="flex gap-2 flex-shrink-0">
                          {testimonial.kg_lost && (
                            <Badge className="bg-green-100 text-green-700 border-0">-{testimonial.kg_lost}kg</Badge>
                          )}
                          {testimonial.duration_text && (
                            <Badge className="bg-blue-100 text-blue-700 border-0">{testimonial.duration_text}</Badge>
                          )}
                          {testimonial.rating && (
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`w-4 h-4 ${s <= testimonial.rating ? 'text-amber-400 fill-current' : 'text-gray-200'}`} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Text */}
                      <p className="text-gray-700 leading-relaxed mb-4 bg-gray-50 p-3 rounded-lg">
                        "{testimonial.testimonial_text}"
                      </p>

                      {/* Moderation note */}
                      {testimonial.moderation_note && (
                        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
                          <p className="text-sm text-red-700">
                            <strong>Motivo da reprovação:</strong> {testimonial.moderation_note}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {testimonial.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => handleApprove(testimonial.id, false)}
                              disabled={processing === testimonial.id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              {processing === testimonial.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                              Aprovar
                            </Button>
                            <Button
                              onClick={() => handleApprove(testimonial.id, true)}
                              disabled={processing === testimonial.id}
                              className="bg-amber-500 hover:bg-amber-600 text-white"
                              size="sm"
                            >
                              <Star className="w-4 h-4 mr-1" />
                              Aprovar + Destacar
                            </Button>
                            <Button
                              onClick={() => setShowRejectModal(testimonial.id)}
                              disabled={processing === testimonial.id}
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              size="sm"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reprovar
                            </Button>
                          </>
                        )}
                        
                        {testimonial.status === 'approved' && (
                          <Button
                            onClick={() => handleToggleFeatured(testimonial.id, testimonial.is_featured)}
                            disabled={processing === testimonial.id}
                            variant="outline"
                            className={testimonial.is_featured ? 'border-amber-300 text-amber-600' : 'border-gray-300'}
                            size="sm"
                          >
                            <Star className={`w-4 h-4 mr-1 ${testimonial.is_featured ? 'fill-current' : ''}`} />
                            {testimonial.is_featured ? 'Remover Destaque' : 'Destacar'}
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => handleDelete(testimonial.id)}
                          disabled={processing === testimonial.id}
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Reprovar Depoimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo da reprovação (opcional)
                  </label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explique o motivo da reprovação..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectModal(null);
                      setRejectReason('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => handleReject(showRejectModal)}
                    disabled={processing === showRejectModal}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {processing === showRejectModal ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                    Confirmar Reprovação
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TestimonialsModeration;
