import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Store, Clock, CreditCard, Loader2, Palette, Wallet, Info } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/admin/ImageUpload';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useStoreSettings();
  
  const [formData, setFormData] = useState({
    store_name: '',
    store_subtitle: '',
    store_phone: '',
    store_email: '',
    store_address: '',
    pix_key: '',
    pix_key_type: 'cpf',
    pix_beneficiary: '',
    min_order_value: '0',
    delivery_time_min: '30',
    delivery_time_max: '60',
    is_open: true,
    opening_time: '11:00',
    closing_time: '23:00',
    logo_url: '',
    banner_url: '',
    favicon_url: '',
    meta_description: '',
    payevo_secret_key: '',
    hypepay_api_key: '',
    hypepay_base_url: 'https://api.hypepay.com.br',
    primary_gateway: 'payevo',
  });


  useEffect(() => {
    if (settings) {
      setFormData({
        store_name: settings.store_name || '',
        store_subtitle: settings.store_subtitle || '',
        store_phone: settings.store_phone || '',
        store_email: settings.store_email || '',
        store_address: settings.store_address || '',
        pix_key: settings.pix_key || '',
        pix_key_type: settings.pix_key_type || 'cpf',
        pix_beneficiary: settings.pix_beneficiary || '',
        min_order_value: settings.min_order_value?.toString() || '0',
        delivery_time_min: settings.delivery_time_min?.toString() || '30',
        delivery_time_max: settings.delivery_time_max?.toString() || '60',
        is_open: settings.is_open ?? true,
        opening_time: settings.opening_time?.slice(0, 5) || '11:00',
        closing_time: settings.closing_time?.slice(0, 5) || '23:00',
        logo_url: settings.logo_url || '',
        banner_url: settings.banner_url || '',
        favicon_url: settings.favicon_url || '',
        meta_description: settings.meta_description || '',
        payevo_secret_key: settings.payevo_secret_key || '',
        hypepay_api_key: settings.hypepay_api_key || '',
        hypepay_base_url: settings.hypepay_base_url || 'https://api.hypepay.com.br',
        primary_gateway: settings.primary_gateway || 'payevo',
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) return;
      
      const { error } = await supabase
        .from('store_settings')
        .update({
          store_name: formData.store_name,
          store_subtitle: formData.store_subtitle || null,
          store_phone: formData.store_phone || null,
          store_email: formData.store_email || null,
          store_address: formData.store_address || null,
          pix_key: formData.pix_key || null,
          pix_key_type: formData.pix_key_type,
          pix_beneficiary: formData.pix_beneficiary || null,
          min_order_value: parseFloat(formData.min_order_value),
          delivery_time_min: parseInt(formData.delivery_time_min),
          delivery_time_max: parseInt(formData.delivery_time_max),
          is_open: formData.is_open,
          opening_time: formData.opening_time,
          closing_time: formData.closing_time,
          logo_url: formData.logo_url || null,
          banner_url: formData.banner_url || null,
          favicon_url: formData.favicon_url || null,
          meta_description: formData.meta_description || null,
          payevo_secret_key: formData.payevo_secret_key || null,
          hypepay_api_key: formData.hypepay_api_key || null,
          hypepay_base_url: formData.hypepay_base_url || null,
          primary_gateway: formData.primary_gateway || 'payevo',
        })
        .eq('id', settings.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      toast.success('Configurações salvas com sucesso!');
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
            <h1 className="text-2xl lg:text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground text-sm">Gerencie todas as configurações da sua loja</p>
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
        <Tabs defaultValue="loja" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 gap-1">
            <TabsTrigger value="loja" className="gap-2 py-2.5">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Loja</span>
            </TabsTrigger>
            <TabsTrigger value="aparencia" className="gap-2 py-2.5">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Aparência</span>
            </TabsTrigger>
            <TabsTrigger value="horarios" className="gap-2 py-2.5">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Horários</span>
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="gap-2 py-2.5">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Pagamentos</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Loja */}
          <TabsContent value="loja" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Informações da Loja
                </CardTitle>
                <CardDescription>
                  Dados básicos do seu estabelecimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="store_name">Nome da Loja *</Label>
                    <Input
                      id="store_name"
                      value={formData.store_name}
                      onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                      placeholder="Nome do seu estabelecimento"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="store_phone">Telefone / WhatsApp</Label>
                    <Input
                      id="store_phone"
                      value={formData.store_phone}
                      onChange={(e) => setFormData({ ...formData, store_phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="store_email">E-mail</Label>
                    <Input
                      id="store_email"
                      type="email"
                      value={formData.store_email}
                      onChange={(e) => setFormData({ ...formData, store_email: e.target.value })}
                      placeholder="contato@sualoja.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="min_order">Pedido Mínimo (R$)</Label>
                    <Input
                      id="min_order"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.min_order_value}
                      onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="store_address">Endereço Completo</Label>
                  <Textarea
                    id="store_address"
                    value={formData.store_address}
                    onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade - UF"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Aparência */}
          <TabsContent value="aparencia" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Identidade Visual
                </CardTitle>
                <CardDescription>
                  Logo, banner e favicon do seu site
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <ImageUpload
                      label="Logo da Loja"
                      value={formData.logo_url}
                      onChange={(url) => setFormData({ ...formData, logo_url: url || '' })}
                      folder="logo"
                      aspectRatio="logo"
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato quadrado (ex: 200x200)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <ImageUpload
                      label="Banner / Capa"
                      value={formData.banner_url}
                      onChange={(url) => setFormData({ ...formData, banner_url: url || '' })}
                      folder="banner"
                      aspectRatio="banner"
                    />
                    <p className="text-xs text-muted-foreground">
                      Proporção 3:1 (ex: 1200x400)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <ImageUpload
                      label="Favicon"
                      value={formData.favicon_url}
                      onChange={(url) => setFormData({ ...formData, favicon_url: url || '' })}
                      folder="favicon"
                      aspectRatio="logo"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ícone do navegador (32x32)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Textos e SEO</CardTitle>
                <CardDescription>
                  Textos que aparecem no site e nos resultados de busca
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="store_subtitle">Subtítulo / Slogan</Label>
                    <Input
                      id="store_subtitle"
                      value={formData.store_subtitle}
                      onChange={(e) => setFormData({ ...formData, store_subtitle: e.target.value })}
                      placeholder="Ex: Delivery de Qualidade"
                    />
                    <p className="text-xs text-muted-foreground">
                      Exibido abaixo do nome no cabeçalho
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta_description">Descrição para SEO</Label>
                    <Input
                      id="meta_description"
                      value={formData.meta_description}
                      onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                      placeholder="Descrição para Google e redes sociais"
                    />
                    <p className="text-xs text-muted-foreground">
                      Aparece nos resultados de busca
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Horários */}
          <TabsContent value="horarios" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Status da Loja
                </CardTitle>
                <CardDescription>
                  Controle se a loja está aberta ou fechada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_open" className="text-base font-medium">Loja Aberta</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.is_open ? 'Sua loja está recebendo pedidos' : 'Sua loja está fechada para pedidos'}
                    </p>
                  </div>
                  <Switch
                    id="is_open"
                    checked={formData.is_open}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_open: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Horário de Funcionamento</CardTitle>
                <CardDescription>
                  Defina os horários de abertura e fechamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="opening_time">Horário de Abertura</Label>
                    <Input
                      id="opening_time"
                      type="time"
                      value={formData.opening_time}
                      onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closing_time">Horário de Fechamento</Label>
                    <Input
                      id="closing_time"
                      type="time"
                      value={formData.closing_time}
                      onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tempo de Entrega</CardTitle>
                <CardDescription>
                  Tempo estimado para entrega dos pedidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_time_min">Tempo Mínimo (minutos)</Label>
                    <Input
                      id="delivery_time_min"
                      type="number"
                      min="0"
                      value={formData.delivery_time_min}
                      onChange={(e) => setFormData({ ...formData, delivery_time_min: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery_time_max">Tempo Máximo (minutos)</Label>
                    <Input
                      id="delivery_time_max"
                      type="number"
                      min="0"
                      value={formData.delivery_time_max}
                      onChange={(e) => setFormData({ ...formData, delivery_time_max: e.target.value })}
                      placeholder="60"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Pagamentos */}
          <TabsContent value="pagamentos" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  PIX Manual (Fallback)
                </CardTitle>
                <CardDescription>
                  Usado quando os gateways automáticos não estão disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="pix_key_type">Tipo de Chave</Label>
                    <Select
                      value={formData.pix_key_type}
                      onValueChange={(value) => setFormData({ ...formData, pix_key_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                        <SelectItem value="random">Chave Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pix_key">Chave PIX</Label>
                    <Input
                      id="pix_key"
                      value={formData.pix_key}
                      onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                      placeholder="Sua chave PIX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pix_beneficiary">Nome do Beneficiário</Label>
                    <Input
                      id="pix_beneficiary"
                      value={formData.pix_beneficiary}
                      onChange={(e) => setFormData({ ...formData, pix_beneficiary: e.target.value })}
                      placeholder="Nome que aparece no PIX"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Gateways Automáticos
                </CardTitle>
                <CardDescription>
                  Processamento automático de pagamentos PIX
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary Gateway Selection */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="primary_gateway" className="text-base font-medium">Gateway Primário</Label>
                    <Select
                      value={formData.primary_gateway}
                      onValueChange={(value) => setFormData({ ...formData, primary_gateway: value })}
                    >
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payevo">Payevo</SelectItem>
                        <SelectItem value="hypepay">Hypepay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>O sistema tenta o gateway primário primeiro. Se falhar, usa o secundário automaticamente.</p>
                  </div>
                </div>

                {/* Payevo Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <h4 className="font-semibold">Payevo</h4>
                    {formData.primary_gateway === 'payevo' && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Primário</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payevo_secret_key">Secret Key</Label>
                    <Input
                      id="payevo_secret_key"
                      type="password"
                      value={formData.payevo_secret_key}
                      onChange={(e) => setFormData({ ...formData, payevo_secret_key: e.target.value })}
                      placeholder="sk_live_..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Chave secreta da API Payevo
                    </p>
                  </div>
                </div>

                {/* Hypepay Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <h4 className="font-semibold">Hypepay</h4>
                    {formData.primary_gateway === 'hypepay' && (
                      <span className="text-xs bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full">Primário</span>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="hypepay_api_key">API Key</Label>
                      <Input
                        id="hypepay_api_key"
                        type="password"
                        value={formData.hypepay_api_key}
                        onChange={(e) => setFormData({ ...formData, hypepay_api_key: e.target.value })}
                        placeholder="Sua chave de API"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hypepay_base_url">URL Base da API</Label>
                      <Input
                        id="hypepay_base_url"
                        value={formData.hypepay_base_url}
                        onChange={(e) => setFormData({ ...formData, hypepay_base_url: e.target.value })}
                        placeholder="https://api.hypepay.com.br"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure o webhook no painel Hypepay apontando para sua URL de webhook
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
