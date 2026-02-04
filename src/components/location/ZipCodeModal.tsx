import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, CheckCircle2, Clock, Bike } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { cn } from '@/lib/utils';

interface AddressData {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface ZipCodeModalProps {
  open: boolean;
  onConfirm: (data: AddressData) => void;
}

const COUNTDOWN_SECONDS = 2;

export function ZipCodeModal({ open, onConfirm }: ZipCodeModalProps) {
  const [zipCode, setZipCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [error, setError] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [progress, setProgress] = useState(100);
  const { data: settings } = useStoreSettings();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const formatZipCode = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const fetchAddress = async (zip: string) => {
    const cleanZip = zip.replace(/\D/g, '');
    if (cleanZip.length !== 8) return null;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
      const data = await response.json();

      if (data.erro) return null;

      return {
        zipCode: cleanZip,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      };
    } catch {
      return null;
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  // Fetch address when ZIP code is complete
  useEffect(() => {
    const cleanZip = zipCode.replace(/\D/g, '');
    if (cleanZip.length === 8 && !isConfirmed) {
      setIsLoading(true);
      setError('');
      fetchAddress(cleanZip).then((data) => {
        setIsLoading(false);
        if (data) {
          setAddressData(data);
          setError('');
        } else {
          setAddressData(null);
          setError('CEP não encontrado. Tente outro.');
        }
      });
    } else if (cleanZip.length < 8) {
      setAddressData(null);
      setError('');
    }
  }, [zipCode, isConfirmed]);

  // Auto-close when address is found
  useEffect(() => {
    if (addressData && !isConfirmed) {
      setIsConfirmed(true);
      setProgress(100);

      // Animate progress bar
      const startTime = Date.now();
      const duration = COUNTDOWN_SECONDS * 1000;
      
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
        
        if (remaining <= 0) {
          if (progressRef.current) clearInterval(progressRef.current);
        }
      }, 50);

      // Close after countdown
      timerRef.current = setTimeout(() => {
        onConfirm(addressData);
      }, duration);
    }
  }, [addressData, isConfirmed, onConfirm]);

  const deliveryTimeMin = settings?.delivery_time_min ?? 30;
  const deliveryTimeMax = settings?.delivery_time_max ?? 45;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        hideCloseButton
        className={cn(
          "sm:max-w-md border-0 overflow-hidden transition-all duration-500",
          isConfirmed 
            ? "bg-gradient-to-b from-green-50 to-background dark:from-green-950/30 dark:to-background" 
            : "bg-background"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Success State */}
        {isConfirmed && addressData ? (
          <div className="py-6 space-y-6 animate-fade-in">
            {/* Success Icon */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                <div className="relative bg-green-100 dark:bg-green-900/50 rounded-full p-4">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Entregamos na sua região!
              </h2>
            </div>

            {/* Address Card */}
            <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full p-2 mt-0.5">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg text-foreground">
                    {addressData.neighborhood}, {addressData.city} - {addressData.state}
                  </p>
                  {addressData.street && (
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {addressData.street}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {deliveryTimeMin}-{deliveryTimeMax} min
                  </span>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <Bike className="h-4 w-4" />
                  <span className="text-sm font-medium">Entrega</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Entrando no cardápio...
              </p>
            </div>
          </div>
        ) : (
          /* Input State */
          <div className="py-4 space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">
                  Qual seu endereço de entrega?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Digite seu CEP para verificar disponibilidade
                </p>
              </div>
            </div>

            {/* Input */}
            <div className="space-y-3">
              <Input
                placeholder="00000-000"
                value={zipCode}
                onChange={(e) => setZipCode(formatZipCode(e.target.value))}
                maxLength={9}
                disabled={isLoading}
                className="text-center text-2xl h-14 font-bold tracking-wide"
                autoFocus
              />
              
              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Buscando seu endereço...</span>
                </div>
              )}
              
              {error && (
                <p className="text-sm text-destructive text-center py-2">
                  {error}
                </p>
              )}
            </div>

            {/* Helper text */}
            <p className="text-xs text-center text-muted-foreground">
              Não sabe seu CEP?{' '}
              <a 
                href="https://buscacepinter.correios.com.br/app/endereco/index.php" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Buscar nos Correios
              </a>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
