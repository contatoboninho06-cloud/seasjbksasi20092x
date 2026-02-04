import { useState, useRef } from 'react';
import { Upload, X, Link, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  label: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
  folder?: string;
  aspectRatio?: 'square' | 'banner' | 'logo';
  className?: string;
}

export function ImageUpload({
  label,
  value,
  onChange,
  bucket = 'store-assets',
  folder = 'images',
  aspectRatio = 'square',
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectClasses = {
    square: 'aspect-square',
    banner: 'aspect-[3/1]',
    logo: 'aspect-square w-24 h-24',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione apenas arquivos de imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    
    // Basic URL validation
    try {
      new URL(urlInput);
      onChange(urlInput);
      setShowUrlInput(false);
      setUrlInput('');
      toast.success('URL da imagem salva!');
    } catch {
      toast.error('URL inválida');
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      
      {value ? (
        <div className="relative group">
          <div className={cn(
            'relative overflow-hidden rounded-lg border border-border bg-muted',
            aspectClasses[aspectRatio]
          )}>
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className={cn(
          'relative border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors',
          aspectClasses[aspectRatio],
          aspectRatio === 'logo' ? 'p-2' : 'p-4'
        )}>
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground text-center">
                Clique para enviar
              </span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={isUploading}
          />
        </div>
      )}

      {!value && (
        <div className="flex gap-2">
          {showUrlInput ? (
            <div className="flex gap-2 flex-1">
              <Input
                placeholder="Cole a URL da imagem..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <Button type="button" size="sm" onClick={handleUrlSubmit}>
                Salvar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowUrlInput(false);
                  setUrlInput('');
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUrlInput(true)}
              className="gap-2"
            >
              <Link className="h-4 w-4" />
              Usar URL
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
