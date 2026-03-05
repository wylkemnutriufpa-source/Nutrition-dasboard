import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const ImageUploader = ({ 
  value, 
  onChange, 
  folder = 'uploads',
  label = 'Foto',
  accept = 'image/*',
  maxSizeMB = 5
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    setUploading(true);

    try {
      // Gerar nome único
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // Se o bucket não existe, tentar criar ou usar URL local
        console.error('Erro no upload:', error);
        
        // Fallback: usar base64 para preview local
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
          onChange(reader.result);
          toast.success('Imagem carregada (modo local)');
        };
        reader.readAsDataURL(file);
        return;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      setPreview(publicUrl);
      onChange(publicUrl);
      toast.success('Imagem enviada com sucesso!');

    } catch (error) {
      console.error('Erro:', error);
      
      // Fallback: base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        onChange(reader.result);
      };
      reader.readAsDataURL(file);
      
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      
      {preview ? (
        <div className="relative group">
          <img 
            src={preview} 
            alt={label}
            className="w-full h-32 object-cover rounded-lg border"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              <span className="text-sm text-gray-500 mt-2">Enviando...</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-500 mt-2">Clique para enviar</span>
              <span className="text-xs text-gray-400">Máx: {maxSizeMB}MB</span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ImageUploader;
