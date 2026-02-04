import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, BarChart3, Info } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminMarketingPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useStoreSettings();
  
  const [formData, setFormData] = useState({
    google_ads_conversion_id: '',
    meta_pixel_id: '',
    meta_access_token: '',
    utmify_token: '',
    utmify_pixel_id: '',
  });

  const [googleAdsLabels, setGoogleAdsLabels] = useState({
    begin_checkout: '',
    add_payment_info: '',
    purchase: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        google_ads_conversion_id: settings.google_ads_conversion_id || '',
        meta_pixel_id: settings.meta_pixel_id || '',
        meta_access_token: settings.meta_access_token || '',
        utmify_token: settings.utmify_token || '',
        utmify_pixel_id: settings.utmify_pixel_id || '',
      });
      
      const labels = settings.google_ads_labels as Record<string, string> | null;
      if (labels) {
        setGoogleAdsLabels({
          begin_checkout: labels.begin_checkout || '',
          add_payment_info: labels.add_payment_info || '',
          purchase: labels.purchase || '',
        });
      }
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) return;
      
      const labelsToSave: Record<string, string> = {};
      if (googleAdsLabels.begin_checkout) labelsToSave.begin_checkout = googleAdsLabels.begin_checkout;
      if (googleAdsLabels.add_payment_info) labelsToSave.add_payment_info = googleAdsLabels.add_payment_info;
      if (googleAdsLabels.purchase) labelsToSave.purchase = googleAdsLabels.purchase;
      
      const { error } = await supabase
        .from('store_settings')
        .update({
          google_ads_conversion_id: formData.google_ads_conversion_id || null,
          google_ads_labels: Object.keys(labelsToSave).length > 0 ? labelsToSave : null,
          meta_pixel_id: formData.meta_pixel_id || null,
          meta_access_token: formData.meta_access_token || null,
          utmify_token: formData.utmify_token || null,
          utmify_pixel_id: formData.utmify_pixel_id || null,
        })
        .eq('id', settings.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      toast.success('Configurações de marketing salvas!');
    },
    onError: () => {
      toast.error('Erro ao salvar configurações');
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Marketing & Tracking</h1>
            <p className="text-muted-foreground text-sm">Configure suas integrações de ads e analytics</p>
          </div>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending} 
            size="lg"
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="google" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
            <TabsTrigger value="google" className="gap-2 py-2.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Google Ads</span>
            </TabsTrigger>
            <TabsTrigger value="meta" className="gap-2 py-2.5">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="hidden sm:inline">Meta Ads</span>
            </TabsTrigger>
            <TabsTrigger value="utmify" className="gap-2 py-2.5">
              <BarChart3 className="h-4 w-4 text-green-600" />
              <span className="hidden sm:inline">Utmify</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Google Ads */}
          <TabsContent value="google" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Google Ads - Tracking de Conversões
                </CardTitle>
                <CardDescription>
                  Configure o tracking para medir o retorno dos seus anúncios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="google_ads_conversion_id">Conversion ID</Label>
                  <Input
                    id="google_ads_conversion_id"
                    value={formData.google_ads_conversion_id}
                    onChange={(e) => setFormData({ ...formData, google_ads_conversion_id: e.target.value })}
                    placeholder="AW-17532500073"
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontre em: Google Ads {'>'} Conversões {'>'} Tag setup
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <Label className="text-base font-medium">Labels de Conversão</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure os labels para cada evento de conversão
                  </p>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="label_begin_checkout" className="text-sm">
                        Início do Checkout
                      </Label>
                      <Input
                        id="label_begin_checkout"
                        value={googleAdsLabels.begin_checkout}
                        onChange={(e) => setGoogleAdsLabels({ ...googleAdsLabels, begin_checkout: e.target.value })}
                        placeholder="abcXYZ123..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="label_add_payment" className="text-sm">
                        Método de Pagamento Selecionado
                      </Label>
                      <Input
                        id="label_add_payment"
                        value={googleAdsLabels.add_payment_info}
                        onChange={(e) => setGoogleAdsLabels({ ...googleAdsLabels, add_payment_info: e.target.value })}
                        placeholder="defXYZ456..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="label_purchase" className="text-sm">
                        Compra Concluída (Principal)
                      </Label>
                      <Input
                        id="label_purchase"
                        value={googleAdsLabels.purchase}
                        onChange={(e) => setGoogleAdsLabels({ ...googleAdsLabels, purchase: e.target.value })}
                        placeholder="ghiXYZ789..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg text-sm">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <p className="text-muted-foreground">
                    Enhanced Conversions habilitado automaticamente. Dados do cliente (nome, email, telefone) são hashados com SHA-256 antes do envio.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Meta Ads */}
          <TabsContent value="meta" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Meta Ads - Facebook Pixel
                </CardTitle>
                <CardDescription>
                  Rastreie conversões do Facebook e Instagram Ads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="meta_pixel_id">Pixel ID</Label>
                    <Input
                      id="meta_pixel_id"
                      value={formData.meta_pixel_id}
                      onChange={(e) => setFormData({ ...formData, meta_pixel_id: e.target.value })}
                      placeholder="123456789012345"
                    />
                    <p className="text-xs text-muted-foreground">
                      Encontre em: Gerenciador de Eventos {'>'} Fontes de Dados
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta_access_token">Access Token (CAPI)</Label>
                    <Input
                      id="meta_access_token"
                      type="password"
                      value={formData.meta_access_token}
                      onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })}
                      placeholder="EAAxxxxxxxx..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Token para Conversions API (server-side)
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Eventos Rastreados</h4>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm">PageView</p>
                      <p className="text-xs text-muted-foreground">Visita à página</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm">InitiateCheckout</p>
                      <p className="text-xs text-muted-foreground">Início do checkout</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm">Purchase</p>
                      <p className="text-xs text-muted-foreground">Compra concluída</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                  <p className="text-muted-foreground">
                    O Pixel dispara eventos client-side. O Access Token habilita a Conversions API para deduplicação automática e maior precisão.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Utmify */}
          <TabsContent value="utmify" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Utmify - Atribuição Google Ads
                </CardTitle>
                <CardDescription>
                  Melhore a atribuição de conversões no Google Ads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="utmify_pixel_id">Pixel ID</Label>
                    <Input
                      id="utmify_pixel_id"
                      value={formData.utmify_pixel_id}
                      onChange={(e) => setFormData({ ...formData, utmify_pixel_id: e.target.value })}
                      placeholder="ID do pixel Utmify"
                    />
                    <p className="text-xs text-muted-foreground">
                      Encontre no painel Utmify
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utmify_token">API Token</Label>
                    <Input
                      id="utmify_token"
                      type="password"
                      value={formData.utmify_token}
                      onChange={(e) => setFormData({ ...formData, utmify_token: e.target.value })}
                      placeholder="Token de API Utmify"
                    />
                    <p className="text-xs text-muted-foreground">
                      Token para chamadas server-side
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Eventos Enviados</h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm">waiting_payment</p>
                      <p className="text-xs text-muted-foreground">Pedido criado, aguardando pagamento</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm">paid</p>
                      <p className="text-xs text-muted-foreground">Pagamento confirmado</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                  <p className="text-muted-foreground">
                    O Utmify captura parâmetros UTM e gclid automaticamente, consolidando dados de atribuição no dashboard deles para otimizar suas campanhas.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
