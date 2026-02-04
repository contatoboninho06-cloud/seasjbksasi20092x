import { useState, useEffect, useRef } from 'react';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Check, Timer, User, MapPin, ClipboardList, Clock, Bike, Phone, Package, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUTMData, clearUTMData } from '@/hooks/useUTMTracking';
import { trackBeginCheckout, trackPurchase, EnhancedConversionData } from '@/utils/googleAdsConversion';
import { sendMetaInitiateCheckout, sendMetaPurchase, generateEventId } from '@/utils/metaConversion';
import { useCheckoutAnalytics } from '@/hooks/useCheckoutAnalytics';

// Fixed delivery fee
const DELIVERY_FEE = 3;

// Detect device type
const detectDevice = (): 'mobile' | 'desktop' => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;
  return mobileRegex.test(userAgent) ? 'mobile' : 'desktop';
};

// Input masks and formatters
const capitalizeWords = (str: string) => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 0) return '';
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const formatZipCode = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

// Generate automatic email from name
const generateAutoEmail = (name: string): string => {
  const cleanName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '')      // Remove special chars
    .trim()
    .split(/\s+/)
    .join('.');
  
  return `${cleanName}@gmail.com`;
};

export default function CheckoutPage() {
  useForceLightTheme();
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { data: settings } = useStoreSettings();
  const { trackEvent } = useCheckoutAnalytics();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPixInfo, setShowPixInfo] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ qrcode: string; expirationDate: string } | null>(null);
  const [isCreatingPix, setIsCreatingPix] = useState(false);
  
  // Payment confirmation states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const verificationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const hasTrackedStartRef = useRef(false);
  const hasTrackedIdentificationRef = useRef(false);
  const hasTrackedPaymentRef = useRef(false);
  
  const [formData, setFormData] = useState({
    // Contact data (unified name)
    name: '',
    phone: '',
    email: '',
    // Address
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    // Notes
    notes: '',
  });

  const subtotal = getSubtotal();
  const total = subtotal + DELIVERY_FEE;

  // Progressive visibility logic
  const showAddressSection = 
    formData.name.trim().split(' ').length >= 2 && 
    formData.name.trim().length >= 5 &&
    formData.phone.replace(/\D/g, '').length >= 11;
  
  const showSummarySection = 
    showAddressSection && 
    formData.number.trim().length > 0;

  // Load saved address from localStorage
  useEffect(() => {
    const savedAddress = localStorage.getItem('customer_address');
    if (savedAddress) {
      try {
        const address = JSON.parse(savedAddress);
        setFormData(prev => ({
          ...prev,
          zipCode: address.zipCode || '',
          street: address.street || '',
          neighborhood: address.neighborhood || '',
          city: address.city || '',
          state: address.state || '',
        }));
      } catch (error) {
        console.error('Error loading saved address:', error);
      }
    }
  }, []);

  // Trigger begin_checkout event when page loads with items
  useEffect(() => {
    if (items.length > 0) {
      // Google Ads
      if (settings?.google_ads_conversion_id) {
        const labels = (settings.google_ads_labels as Record<string, string>) || {};
        trackBeginCheckout(
          settings.google_ads_conversion_id,
          labels,
          total,
          { country: 'BR' }
        );
      }
      
      // Meta Ads - InitiateCheckout
      if (settings?.meta_pixel_id) {
        sendMetaInitiateCheckout({
          content_type: 'product',
          content_ids: items.map(i => i.product.id),
          currency: 'BRL',
          value: total,
          num_items: items.length,
        }, { country: 'BR' });
      }

      // Real-time analytics - started event
      if (!hasTrackedStartRef.current) {
        hasTrackedStartRef.current = true;
        trackEvent({
          eventType: 'started',
          step: 'delivery',
          products: items.map(i => ({
            id: i.product.id,
            name: i.product.name,
            price: i.selectedVariant?.price ?? i.product.price,
            quantity: i.quantity,
          })),
          subtotal,
          shippingCost: DELIVERY_FEE,
          total,
        });
      }
    }
  }, [settings?.google_ads_conversion_id, settings?.meta_pixel_id, items.length > 0]);

  // Track step change to identification (when name + phone are filled)
  useEffect(() => {
    if (showAddressSection && !hasTrackedIdentificationRef.current) {
      hasTrackedIdentificationRef.current = true;
      trackEvent({
        eventType: 'step_changed',
        step: 'identification',
        total,
      });
    }
  }, [showAddressSection, total]);

  // Track step change to payment (when address number is filled)
  useEffect(() => {
    if (showSummarySection && !hasTrackedPaymentRef.current) {
      hasTrackedPaymentRef.current = true;
      trackEvent({
        eventType: 'step_changed',
        step: 'payment',
        total,
      });
    }
  }, [showSummarySection, total]);

  useEffect(() => {
    if (items.length === 0 && !showPixInfo) {
      navigate('/carrinho');
    }
  }, [items, navigate, showPixInfo]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    switch (name) {
      case 'name':
        setFormData(prev => ({ ...prev, [name]: capitalizeWords(value) }));
        break;
      case 'phone':
        setFormData(prev => ({ ...prev, [name]: formatPhone(value) }));
        break;
      case 'zipCode':
        setFormData(prev => ({ ...prev, [name]: formatZipCode(value) }));
        break;
      default:
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const copyPixCode = () => {
    if (pixData?.qrcode) {
      navigator.clipboard.writeText(pixData.qrcode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } else if (settings?.pix_key) {
      navigator.clipboard.writeText(settings.pix_key);
      setCopied(true);
      toast.success('Chave PIX copiada!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatExpirationTime = (expirationDate: string) => {
    const expiration = new Date(expirationDate);
    const now = new Date();
    const diffMs = expiration.getTime() - now.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    const diffSecs = Math.max(0, Math.floor((diffMs % 60000) / 1000));
    return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
  };

  const createPixTransaction = async (createdOrderId: string, orderTotal: number, customerEmail: string) => {
    setIsCreatingPix(true);
    try {
      // Use the unified pix-gateway function with fallback
      const response = await supabase.functions.invoke('pix-gateway', {
        body: {
          orderId: createdOrderId,
          amount: orderTotal,
          customer: {
            name: formData.name,
            email: customerEmail,
            phone: formData.phone,
          },
          description: `Pedido #${createdOrderId.slice(0, 8).toUpperCase()}`,
        },
      });

      if (response.error) {
        console.error('PIX Gateway error:', response.error);
        toast.error('Erro ao gerar PIX. Use a chave PIX manual.');
        return false;
      }

      const data = response.data;
      if (data?.qrcode) {
        setPixData({
          qrcode: data.qrcode,
          expirationDate: data.expirationDate,
        });
        console.log('PIX generated via gateway:', data.gateway);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error creating PIX transaction:', error);
      toast.error('Erro ao gerar PIX automático.');
      return false;
    } finally {
      setIsCreatingPix(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const nameParts = formData.name.trim().split(' ').filter(p => p.length > 0);
    if (nameParts.length < 2) {
      toast.error('Digite seu nome completo (nome e sobrenome)');
      return;
    }
    if (formData.phone.replace(/\D/g, '').length < 11) {
      toast.error('WhatsApp deve ter 11 dígitos');
      return;
    }
    if (!formData.number.trim()) {
      toast.error('Número do endereço é obrigatório');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get client IP and check if blocked
      let customerIp: string | null = null;
      try {
        const { data: geoData } = await supabase.functions.invoke('get-client-location');
        if (geoData?.ip) {
          customerIp = geoData.ip;
        }
      } catch (err) {
        console.error('Failed to get client IP:', err);
      }

      // Check if customer is blocked
      const phoneDigits = formData.phone.replace(/\D/g, '');
      const emailLower = formData.email.trim().toLowerCase() || '';
      
      const { data: phoneBlocks } = await supabase
        .from('blocked_customers')
        .select('block_type, reason')
        .eq('is_active', true)
        .eq('block_type', 'phone')
        .eq('block_value', phoneDigits);

      if (phoneBlocks && phoneBlocks.length > 0) {
        setIsSubmitting(false);
        toast.error('Não foi possível processar seu pedido. Entre em contato com o suporte.');
        return;
      }

      if (emailLower) {
        const { data: emailBlocks } = await supabase
          .from('blocked_customers')
          .select('block_type, reason')
          .eq('is_active', true)
          .eq('block_type', 'email')
          .eq('block_value', emailLower);

        if (emailBlocks && emailBlocks.length > 0) {
          setIsSubmitting(false);
          toast.error('Não foi possível processar seu pedido. Entre em contato com o suporte.');
          return;
        }
      }

      if (customerIp) {
        const { data: ipBlocks } = await supabase
          .from('blocked_customers')
          .select('block_type, reason')
          .eq('is_active', true)
          .eq('block_type', 'ip')
          .eq('block_value', customerIp);

        if (ipBlocks && ipBlocks.length > 0) {
          setIsSubmitting(false);
          toast.error('Não foi possível processar seu pedido. Entre em contato com o suporte.');
          return;
        }
      }

      // Get UTM data for attribution
      const utmData = getUTMData();
      
      // Generate IDs on the client to avoid SELECT after INSERT (RLS issue for anonymous users)
      const generatedOrderId = crypto.randomUUID();
      
      // Generate email if not provided
      const customerEmail = formData.email.trim() || generateAutoEmail(formData.name);
      
      const deliveryAddress = `${formData.street}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''}, ${formData.neighborhood}, ${formData.city} - ${formData.state}, ${formData.zipCode}`;

      // Create order with client-generated ID (no .select() needed)
      const orderData = {
        id: generatedOrderId,
        user_id: user?.id || null,
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_email: customerEmail,
        customer_ip: customerIp,
        customer_device: detectDevice(),
        delivery_address: deliveryAddress,
        is_pickup: false,
        subtotal: subtotal,
        delivery_fee: DELIVERY_FEE,
        discount: 0,
        total: total,
        status: 'pending' as const,
        payment_status: 'pending' as const,
        payment_method: 'pix',
        notes: formData.notes || null,
        gclid: utmData?.gclid || null,
        utm_data: utmData ? JSON.parse(JSON.stringify(utmData)) : null,
      };
      
      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) {
        console.error('Order insert error:', { code: orderError.code, message: orderError.message, details: orderError.details });
        throw orderError;
      }

      // Create order items with client-generated IDs
      const orderItemsWithIds = items.map(item => {
        const itemPrice = item.selectedVariant?.price ?? item.product.price;
        const productName = item.selectedVariant 
          ? `${item.product.name} - ${item.selectedVariant.name}`
          : item.product.name;
          
        return {
          id: crypto.randomUUID(),
          order_id: generatedOrderId,
          product_id: item.product.id,
          product_name: productName,
          quantity: item.quantity,
          unit_price: itemPrice,
          total_price: itemPrice * item.quantity,
          notes: item.notes || null,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsWithIds);

      if (itemsError) {
        console.error('Order items insert error:', { code: itemsError.code, message: itemsError.message, details: itemsError.details });
        throw itemsError;
      }

      // Create order item options for variants using pre-generated item IDs
      const variantOptions = items
        .filter(item => item.selectedVariant)
        .map((item, index) => ({
          id: crypto.randomUUID(),
          order_item_id: orderItemsWithIds[index].id,
          option_name: item.selectedVariant!.name,
          option_price: item.selectedVariant!.price,
        }));

      if (variantOptions.length > 0) {
        const { error: optionsError } = await supabase
          .from('order_item_options')
          .insert(variantOptions);
          
        if (optionsError) {
          console.error('Order item options insert error:', { code: optionsError.code, message: optionsError.message, details: optionsError.details });
          throw optionsError;
        }
      }

      setOrderId(generatedOrderId);

      // Track purchase conversion
      if (settings?.google_ads_conversion_id) {
        const labels = (settings.google_ads_labels as Record<string, string>) || {};
        const enhanced: EnhancedConversionData = {
          email: customerEmail,
          phone_number: formData.phone,
          first_name: formData.name.split(' ')[0],
          last_name: formData.name.split(' ').slice(1).join(' '),
          city: formData.city,
          region: formData.state,
          postal_code: formData.zipCode.replace(/\D/g, ''),
          country: 'BR',
        };
        
        // Client-side tracking
        await trackPurchase(
          settings.google_ads_conversion_id,
          labels,
          total,
          generatedOrderId,
          enhanced
        );
        
        // Server-side backup (async, don't wait)
        supabase.functions.invoke('send-google-conversion', {
          body: { orderId: generatedOrderId, eventType: 'purchase' }
        }).catch(console.error);
      }

      // Meta Ads - Purchase client-side + server-side
      if (settings?.meta_pixel_id) {
        const metaEventId = generateEventId();
        
        // Client-side tracking
        await sendMetaPurchase(
          {
            content_type: 'product',
            content_ids: items.map(i => i.product.id),
            currency: 'BRL',
            value: total,
            num_items: items.length,
          },
          {
            em: customerEmail,
            ph: formData.phone,
            fn: formData.name.split(' ')[0],
            ln: formData.name.split(' ').slice(1).join(' '),
          },
          metaEventId
        );
        
        // Server-side CAPI (async, don't wait)
        supabase.functions.invoke('send-meta-conversion', {
          body: { orderId: generatedOrderId, eventName: 'Purchase', eventId: metaEventId }
        }).catch(console.error);
      }

      // Utmify - InitiateCheckout (waiting_payment status)
      if (settings?.utmify_token) {
        supabase.functions.invoke('send-utmify-event', {
          body: { orderId: generatedOrderId, eventType: 'initiate_checkout' }
        }).catch(console.error);
      }
      
      // Clear UTM data after successful order
      clearUTMData();

      // Try to create PIX transaction via unified gateway (handles fallback automatically)
      const hasPaymentGateway = settings?.payevo_secret_key || settings?.hypepay_api_key;
      if (hasPaymentGateway) {
        await createPixTransaction(generatedOrderId, total, customerEmail);
      }

      // Real-time analytics - completed event
      trackEvent({
        eventType: 'completed',
        paymentMethod: 'pix',
        products: items.map(i => ({
          id: i.product.id,
          name: i.product.name,
          price: i.selectedVariant?.price ?? i.product.price,
          quantity: i.quantity,
        })),
        subtotal,
        shippingCost: DELIVERY_FEE,
        total,
      });
      
      setShowPixInfo(true);
      toast.success('Pedido criado com sucesso!');
      
    } catch (error: any) {
      console.error('Error creating order:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        full: error,
      });
      toast.error('Erro ao criar pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackOrder = () => {
    setShowPaymentDialog(true);
  };

  const handleConfirmPayment = () => {
    setShowPaymentDialog(false);
    setIsVerifyingPayment(true);
    setVerificationProgress(0);
    
    // Progress animation over 20 seconds
    const duration = 20000;
    const interval = 100;
    const increment = 100 / (duration / interval);
    
    verificationTimerRef.current = setInterval(() => {
      setVerificationProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          if (verificationTimerRef.current) {
            clearInterval(verificationTimerRef.current);
          }
          // Redirect after completion
          setTimeout(() => {
            clearCart();
            navigate(`/pedidos/${orderId}`);
          }, 500);
          return 100;
        }
        return next;
      });
    }, interval);
  };

  // Countdown timer for PIX expiration
  useEffect(() => {
    if (pixData?.expirationDate && showPixInfo) {
      const updateCountdown = () => {
        const expiration = new Date(pixData.expirationDate);
        const now = new Date();
        const diffMs = expiration.getTime() - now.getTime();
        
        if (diffMs <= 0) {
          setTimeRemaining('Expirado');
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          return;
        }
        
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        setTimeRemaining(`${diffMins}:${diffSecs.toString().padStart(2, '0')}`);
      };
      
      updateCountdown();
      countdownRef.current = setInterval(updateCountdown, 1000);
      
      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      };
    }
  }, [pixData?.expirationDate, showPixInfo]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (verificationTimerRef.current) {
        clearInterval(verificationTimerRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Calculate current step
  const currentStep = showSummarySection ? 3 : showAddressSection ? 2 : 1;

  // Payment verification screen
  if (isVerifyingPayment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="overflow-hidden border-0 shadow-xl rounded-2xl max-w-md w-full">
          <div className="h-1 bg-gradient-to-r from-primary to-primary/60" />
          <CardContent className="py-12 px-8 text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mx-auto">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Verificando pagamento...</h2>
              <p className="text-muted-foreground">
                Aguarde enquanto confirmamos seu pagamento PIX
              </p>
            </div>
            <div className="space-y-3">
              <Progress value={verificationProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {Math.round(verificationProgress)}% concluído
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PIX confirmation screen
  if (showPixInfo) {
    const deliveryAddress = `${formData.street}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''}, ${formData.neighborhood}, ${formData.city} - ${formData.state}`;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50/50 to-background">
        <div className="container-app py-6 md:py-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
              {isCreatingPix ? (
                <Loader2 className="h-8 w-8 md:h-10 md:w-10 text-green-600 animate-spin" />
              ) : (
                <Check className="h-8 w-8 md:h-10 md:w-10 text-green-600" />
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {isCreatingPix ? 'Gerando PIX...' : 'Pedido Confirmado!'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Pedido #{orderId?.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Main content - Two columns on larger screens */}
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            {/* Left column - PIX Payment */}
            <Card className="overflow-hidden border-0 shadow-xl rounded-2xl">
              <div className="h-1 bg-gradient-to-r from-green-500 to-green-400" />
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Timer className="h-4 w-4 text-green-600" />
                  </div>
                  Pagamento PIX
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                {/* Total */}
                <div className="text-center bg-green-50 rounded-xl p-4">
                  <p className="text-3xl font-bold text-green-700">
                    {formatPrice(total)}
                  </p>
                  {timeRemaining && (
                    <p className="text-sm text-green-600 mt-1 flex items-center justify-center gap-1">
                      <Timer className="h-3 w-3" />
                      Expira em: {timeRemaining}
                    </p>
                  )}
                </div>

                {/* QR Code */}
                {pixData?.qrcode && (
                  <>
                    <div className="flex justify-center">
                      <div className="bg-white rounded-xl p-3 shadow-sm border">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixData.qrcode)}`}
                          alt="QR Code PIX"
                          className="rounded-lg"
                          width={180}
                          height={180}
                        />
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">PIX Copia e Cola:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-background rounded-lg px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap border">
                          {pixData.qrcode.slice(0, 35)}...
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyPixCode}
                          className="shrink-0"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Manual PIX fallback */}
                {!pixData?.qrcode && !isCreatingPix && (
                  <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Beneficiário</span>
                      <span className="font-medium">{settings?.pix_beneficiary}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tipo de Chave</span>
                      <span className="font-medium uppercase">{settings?.pix_key_type}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Chave PIX</p>
                        <p className="font-mono text-sm bg-background rounded-lg px-3 py-2 truncate border">
                          {settings?.pix_key}
                        </p>
                      </div>
                      <Button variant="outline" size="icon" onClick={copyPixCode}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="space-y-2 text-sm text-muted-foreground bg-muted/30 rounded-xl p-4">
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">1.</span> 
                    Escaneie o QR Code ou copie o código
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">2.</span> 
                    Cole no app do seu banco e pague
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">3.</span> 
                    Confirmação automática em segundos
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Right column - Order Summary */}
            <Card className="overflow-hidden border-0 shadow-xl rounded-2xl">
              <div className="h-1 bg-gradient-to-r from-primary to-primary/60" />
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </div>
                  Resumo do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                {/* Customer info */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-medium truncate">{formData.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">WhatsApp</p>
                      <p className="font-medium">{formData.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Endereço de entrega</p>
                      <p className="font-medium text-sm">{deliveryAddress}</p>
                      <p className="text-xs text-muted-foreground">{formData.zipCode}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Itens do pedido</p>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {items.map((item, index) => {
                      const itemPrice = item.selectedVariant?.price ?? item.product.price;
                      const itemName = item.selectedVariant 
                        ? `${item.product.name} - ${item.selectedVariant.name}`
                        : item.product.name;
                      return (
                        <div key={index} className="flex justify-between text-sm p-2 bg-muted/20 rounded-lg">
                          <span className="flex-1 truncate">
                            {item.quantity}x {itemName}
                          </span>
                          <span className="font-medium ml-2">
                            {formatPrice(itemPrice * item.quantity)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de entrega</span>
                    <span>{formatPrice(DELIVERY_FEE)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Delivery time */}
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <Bike className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700">Tempo estimado</p>
                    <p className="text-xs text-green-600">45-60 minutos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Track order button */}
          <div className="max-w-4xl mx-auto mt-6">
            <Button 
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl transition-all rounded-xl" 
              size="lg"
              onClick={handleTrackOrder}
              disabled={isCreatingPix}
            >
              Acompanhar Pedido
            </Button>
          </div>
        </div>

        {/* Payment confirmation dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Você já realizou o pagamento?</DialogTitle>
              <DialogDescription>
                Precisamos confirmar que o pagamento PIX foi efetuado antes de prosseguir.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
                className="flex-1"
              >
                Ainda não
              </Button>
              <Button
                onClick={handleConfirmPayment}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
              >
                Sim, já paguei
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
        <div className="container-app">
          <div className="py-4">
            <Button
              variant="ghost"
              className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/carrinho')}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao carrinho
            </Button>
          </div>
          <div className="pb-8 pt-2 text-center">
            <h1 className="text-3xl font-bold text-foreground">Finalizar Pedido</h1>
            <p className="text-muted-foreground mt-2">Complete os dados para confirmar seu pedido</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="container-app py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {[
              { num: 1, label: 'Contato', icon: User },
              { num: 2, label: 'Endereço', icon: MapPin },
              { num: 3, label: 'Resumo', icon: ClipboardList },
            ].map((step, index) => (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep >= step.num 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {currentStep > step.num ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    currentStep >= step.num ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < 2 && (
                  <div className={`w-16 sm:w-24 h-1 mx-2 rounded-full transition-all ${
                    currentStep > step.num ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="container-app pb-8">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
          {/* Step 1: Contact Data - Always visible */}
          <Card className="overflow-hidden border-0 shadow-lg rounded-2xl">
            <div className="h-1 bg-gradient-to-r from-primary to-accent" />
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Seus Dados</CardTitle>
                    <p className="text-xs text-muted-foreground">Informações de contato</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  Etapa 1 de 3
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Nome Completo *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="João Silva"
                  className="h-12 text-base rounded-xl border-2 focus:border-primary transition-colors"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">WhatsApp *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(11) 99999-9999"
                    className="h-12 text-base rounded-xl border-2 focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">E-mail <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="seu@email.com"
                    className="h-12 text-base rounded-xl border-2 focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Delivery Address - Shows after contact is filled */}
          {showAddressSection && (
            <Card className="overflow-hidden border-0 shadow-lg rounded-2xl animate-fade-in">
              <div className="h-1 bg-gradient-to-r from-primary to-accent" />
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Endereço de Entrega</CardTitle>
                      <p className="text-xs text-muted-foreground">Onde devemos entregar</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Etapa 2 de 3
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {/* Delivery info banner */}
                <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bike className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Parceiro iFood</p>
                        <p className="text-sm text-muted-foreground">Entrega rápida e segura</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-primary font-semibold">
                        <Clock className="h-4 w-4" />
                        <span>45-60 min</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pre-filled address from CEP */}
                <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {formData.neighborhood}, {formData.city} - {formData.state}
                      </p>
                      <p className="text-sm text-muted-foreground">{formData.street}</p>
                      <p className="text-sm text-muted-foreground">CEP {formData.zipCode}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="number" className="text-sm font-medium">Número *</Label>
                    <Input
                      id="number"
                      name="number"
                      value={formData.number}
                      onChange={handleInputChange}
                      placeholder="123"
                      className="h-12 text-base rounded-xl border-2 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complement" className="text-sm font-medium">Complemento <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <Input
                      id="complement"
                      name="complement"
                      value={formData.complement}
                      onChange={handleInputChange}
                      placeholder="Apto, Bloco..."
                      className="h-12 text-base rounded-xl border-2 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">Observações <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Ponto de referência, instruções de entrega..."
                    className="min-h-[80px] text-base rounded-xl border-2 focus:border-primary transition-colors resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Order Summary - Shows after address number is filled */}
          {showSummarySection && (
            <Card className="overflow-hidden border-0 shadow-lg rounded-2xl animate-fade-in">
              <div className="h-1 bg-gradient-to-r from-primary to-accent" />
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
                      <p className="text-xs text-muted-foreground">Confira antes de confirmar</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Etapa 3 de 3
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {/* Delivery Address Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Entrega</h4>
                  <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                    <p className="font-medium text-foreground">
                      {formData.street}, {formData.number}
                      {formData.complement && ` - ${formData.complement}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formData.neighborhood} - {formData.city}/{formData.state}
                    </p>
                    <p className="text-sm text-muted-foreground">CEP {formData.zipCode}</p>
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-foreground font-medium">Previsão: 45-60 minutos</span>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Produtos</h4>
                  <div className="bg-muted/50 rounded-xl p-4 border border-border/50 space-y-3">
                    {items.map((item, index) => {
                      const itemPrice = item.selectedVariant?.price ?? item.product.price;
                      const productName = item.selectedVariant 
                        ? `${item.product.name} - ${item.selectedVariant.name}`
                        : item.product.name;
                      return (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-foreground">
                            {item.quantity}x {productName}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatPrice(itemPrice * item.quantity)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Pagamento</h4>
                  <div className="bg-muted/50 rounded-xl p-4 border border-border/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de entrega</span>
                      <span className="text-foreground">{formatPrice(DELIVERY_FEE)}</span>
                    </div>
                    <div className="border-t border-border/50 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-lg text-foreground">Total</span>
                        <span className="font-bold text-lg text-primary">{formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl transition-all rounded-xl mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Pedido'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  );
}
