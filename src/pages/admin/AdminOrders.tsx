import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle, XCircle, Truck, Package, RefreshCw, Copy, QrCode, Trash2, Search, Phone, MapPin, ChevronDown, ChevronUp, Ban, Mail, Globe, MessageSquare, Smartphone, Monitor } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderItem, OrderStatus, PaymentStatus } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10' },
  confirmed: { label: 'Confirmado', icon: Package, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  preparing: { label: 'Preparando', icon: Package, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  out_for_delivery: { label: 'Saiu para Entrega', icon: Truck, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  delivered: { label: 'Entregue', icon: CheckCircle, color: 'text-success', bgColor: 'bg-success/10' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pendente', color: 'text-warning', bgColor: 'bg-warning/10' },
  paid: { label: 'Pago', color: 'text-success', bgColor: 'bg-success/10' },
  failed: { label: 'Falhou', color: 'text-destructive', bgColor: 'bg-destructive/10' },
  refunded: { label: 'Reembolsado', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

interface ExtendedOrder extends Omit<Order, 'customer_ip' | 'customer_device'> {
  items: OrderItem[];
  customer_ip?: string | null;
  customer_device?: 'mobile' | 'desktop' | null;
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const { data: storeSettings } = useStoreSettings();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  // Block customer dialog
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockingOrder, setBlockingOrder] = useState<ExtendedOrder | null>(null);
  const [blockType, setBlockType] = useState<'phone' | 'email' | 'ip'>('phone');
  const [blockReason, setBlockReason] = useState('');

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', statusFilter, paymentFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }
      
      if (paymentFilter !== 'all') {
        query = query.eq('payment_status', paymentFilter as any);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ExtendedOrder[];
    },
  });

  // Filter by search query (including IP)
  const filteredOrders = orders?.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.customer_name.toLowerCase().includes(query) ||
      order.customer_phone.includes(query) ||
      order.id.toLowerCase().includes(query) ||
      (order.customer_ip && order.customer_ip.toLowerCase().includes(query))
    );
  });

  // Calculate status counts
  const statusCounts = {
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    confirmed: orders?.filter(o => o.status === 'confirmed').length || 0,
    preparing: orders?.filter(o => o.status === 'preparing').length || 0,
    out_for_delivery: orders?.filter(o => o.status === 'out_for_delivery').length || 0,
    delivered: orders?.filter(o => o.status === 'delivered').length || 0,
    cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: status as any })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Status atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: PaymentStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: status as any })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Pagamento atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar pagamento');
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data: items } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', orderId);

      if (items && items.length > 0) {
        const itemIds = items.map(item => item.id);
        await supabase
          .from('order_item_options')
          .delete()
          .in('order_item_id', itemIds);
      }

      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Pedido excluído!');
      setExpandedOrderId(null);
    },
    onError: () => {
      toast.error('Erro ao excluir pedido');
    },
  });

  const blockCustomerMutation = useMutation({
    mutationFn: async ({ type, value, reason }: { type: string; value: string; reason: string }) => {
      const { error } = await supabase
        .from('blocked_customers')
        .insert({
          block_type: type,
          block_value: value,
          reason: reason || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cliente bloqueado com sucesso!');
      setBlockDialogOpen(false);
      setBlockingOrder(null);
      setBlockReason('');
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Este cliente já está bloqueado');
      } else {
        toast.error('Erro ao bloquear cliente');
      }
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyPixCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código PIX copiado!');
  };

  const copyPixMessage = (order: ExtendedOrder) => {
    const storeName = storeSettings?.store_name || 'Restaurante';
    const firstName = order.customer_name.split(' ')[0];
    
    // Formatar itens do pedido com variante se houver
    const itemsList = order.items?.map(item => {
      return `• ${item.quantity}x ${item.product_name} — ${formatPrice(item.total_price)}`;
    }).join('\n\n') || '';
    
    // Formatar endereço em duas linhas (rua + cidade/estado/cep)
    const addressParts = order.delivery_address?.split(',') || [];
    let formattedAddress = order.delivery_address || 'Retirada no local';
    if (addressParts.length >= 3) {
      const street = addressParts.slice(0, 2).join(',').trim();
      const cityStateZip = addressParts.slice(2).join(',').trim();
      formattedAddress = `${street}\n${cityStateZip}`;
    }
    
    const message = `Olá, ${firstName}! 👋

Aqui é a equipe da *${storeName}*! Obrigado pela preferência 💚

Seu pedido *#${order.id.slice(0, 8).toUpperCase()}* já está sendo preparado! 🍽️

📋 *Itens do pedido:*

${itemsList}

😋 Subtotal: ${formatPrice(order.subtotal)}
🛵 Taxa de entrega: ${formatPrice(order.delivery_fee)}
💰 *Total: ${formatPrice(order.total)}*

📍 *Endereço de entrega:*
${formattedAddress}

⏳ Falta apenas a confirmação do pagamento via PIX para seguirmos com a entrega!

👉 Para pagar, copie o código abaixo e cole no app do seu banco.

${order.pix_qrcode}`;

    navigator.clipboard.writeText(message);
    toast.success('Mensagem copiada! Cole no WhatsApp.');
  };

  const handleBlockCustomer = (order: ExtendedOrder) => {
    setBlockingOrder(order);
    setBlockType('phone');
    setBlockReason('');
    setBlockDialogOpen(true);
  };

  const getBlockValue = () => {
    if (!blockingOrder) return '';
    switch (blockType) {
      case 'phone':
        return blockingOrder.customer_phone.replace(/\D/g, '');
      case 'email':
        return blockingOrder.customer_email?.toLowerCase() || '';
      case 'ip':
        return blockingOrder.customer_ip || '';
      default:
        return '';
    }
  };

  const confirmBlockCustomer = () => {
    const value = getBlockValue();
    if (!value) {
      toast.error('Valor para bloqueio não disponível');
      return;
    }
    blockCustomerMutation.mutate({
      type: blockType,
      value,
      reason: blockReason,
    });
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pedidos</h1>
            <p className="text-muted-foreground">Gerencie os pedidos dos clientes</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <div className="p-3 bg-warning/10 rounded-lg text-center">
            <p className="text-lg font-bold text-warning">{statusCounts.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-center">
            <p className="text-lg font-bold text-blue-500">{statusCounts.confirmed}</p>
            <p className="text-xs text-muted-foreground">Confirmados</p>
          </div>
          <div className="p-3 bg-orange-500/10 rounded-lg text-center">
            <p className="text-lg font-bold text-orange-500">{statusCounts.preparing}</p>
            <p className="text-xs text-muted-foreground">Preparando</p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-lg text-center">
            <p className="text-lg font-bold text-purple-500">{statusCounts.out_for_delivery}</p>
            <p className="text-xs text-muted-foreground">Em Entrega</p>
          </div>
          <div className="p-3 bg-success/10 rounded-lg text-center">
            <p className="text-lg font-bold text-success">{statusCounts.delivered}</p>
            <p className="text-xs text-muted-foreground">Entregues</p>
          </div>
          <div className="p-3 bg-destructive/10 rounded-lg text-center">
            <p className="text-lg font-bold text-destructive">{statusCounts.cancelled}</p>
            <p className="text-xs text-muted-foreground">Cancelados</p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, ID ou IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="preparing">Preparando</SelectItem>
              <SelectItem value="out_for_delivery">Saiu para Entrega</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos pagamentos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredOrders?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders?.map((order) => {
              const config = statusConfig[order.status as OrderStatus];
              const StatusIcon = config.icon;
              const isExpanded = expandedOrderId === order.id;
              const itemsSummary = order.items?.slice(0, 2).map(i => `${i.quantity}x ${i.product_name}`).join(', ');
              const hasMoreItems = order.items && order.items.length > 2;
              
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Order Header - Always Visible */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleOrderExpansion(order.id)}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full flex-shrink-0",
                            config.bgColor
                          )}>
                            <StatusIcon className={cn("h-6 w-6", config.color)} />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </p>
                              <Badge className={cn(
                                config.bgColor,
                                config.color,
                                "border-0 text-xs"
                              )}>
                                {config.label}
                              </Badge>
                              <Badge className={cn(
                                paymentStatusConfig[order.payment_status as PaymentStatus].bgColor,
                                paymentStatusConfig[order.payment_status as PaymentStatus].color,
                                "border-0 text-xs"
                              )}>
                                {paymentStatusConfig[order.payment_status as PaymentStatus].label}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium mt-1">
                              {order.customer_name}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {order.customer_phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(order.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">
                              {formatPrice(order.total)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Preview - only when collapsed */}
                      {!isExpanded && (
                        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-start gap-2 text-sm">
                            <Package className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">
                              {itemsSummary}
                              {hasMoreItems && ` +${order.items!.length - 2} mais`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
                        {/* Customer Data */}
                        <div className="mt-4">
                          <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-2">Dados do Cliente</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-muted/30 rounded-lg p-4">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-semibold">Nome</p>
                              <p className="font-medium">{order.customer_name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-semibold">Telefone</p>
                              <p className="font-medium flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {order.customer_phone}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-semibold">Dispositivo</p>
                              <p className="font-medium flex items-center gap-1">
                                {order.customer_device === 'mobile' ? (
                                  <>
                                    <Smartphone className="h-3 w-3" />
                                    Mobile
                                  </>
                                ) : (
                                  <>
                                    <Monitor className="h-3 w-3" />
                                    Desktop
                                  </>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-semibold">Email</p>
                              <p className="font-medium flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {order.customer_email || 'Não informado'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-semibold">IP</p>
                              <p className="font-medium font-mono text-sm flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {order.customer_ip || 'Não capturado'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Address */}
                        <div>
                          <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-2">
                            {order.is_pickup ? 'Retirada no Local' : 'Endereço de Entrega'}
                          </h4>
                          <div className="bg-muted/30 rounded-lg p-4">
                            <p className="text-sm flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              {order.is_pickup ? 'Cliente irá retirar no local' : order.delivery_address || 'Endereço não informado'}
                            </p>
                          </div>
                        </div>

                        {/* Products */}
                        <div>
                          <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-2">Produtos</h4>
                          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            {order.items?.map((item) => (
                              <div key={item.id} className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{item.quantity}x {item.product_name}</p>
                                  {item.notes && (
                                    <p className="text-xs text-muted-foreground mt-1">Obs: {item.notes}</p>
                                  )}
                                </div>
                                <span className="font-medium">{formatPrice(item.total_price)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                          <div>
                            <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-2">Observações</h4>
                            <div className="bg-muted/30 rounded-lg p-4">
                              <p className="text-sm">{order.notes}</p>
                            </div>
                          </div>
                        )}

                        {/* Summary */}
                        <div>
                          <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-2">Resumo</h4>
                          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Subtotal</span>
                              <span>{formatPrice(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Taxa de entrega</span>
                              <span>{formatPrice(order.delivery_fee)}</span>
                            </div>
                            {order.discount > 0 && (
                              <div className="flex justify-between text-sm text-success">
                                <span>Desconto</span>
                                <span>-{formatPrice(order.discount)}</span>
                              </div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                              <span>Total</span>
                              <span className="text-primary">{formatPrice(order.total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* PIX */}
                        {order.pix_qrcode && (
                          <div>
                            <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-2">Código PIX</h4>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                              {/* PIX Code visible */}
                              <div className="bg-background rounded-lg p-3 border">
                                <p className="text-xs text-muted-foreground mb-1">Copia e Cola:</p>
                                <code className="text-xs font-mono break-all select-all block">
                                  {order.pix_qrcode}
                                </code>
                              </div>
                              
                              {/* QR Code inline */}
                              <div className="flex justify-center">
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(order.pix_qrcode)}`}
                                  alt="QR Code PIX"
                                  className="rounded-lg border bg-white p-2"
                                  width={180}
                                  height={180}
                                />
                              </div>
                              
                              {/* Buttons */}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); copyPixCode(order.pix_qrcode!); }}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copiar PIX
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); copyPixMessage(order); }}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Copiar Mensagem
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                          <Select
                            value={order.status}
                            onValueChange={(value) => {
                              updateStatusMutation.mutate({ 
                                orderId: order.id, 
                                status: value as OrderStatus 
                              });
                            }}
                          >
                            <SelectTrigger className="w-40" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="confirmed">Confirmado</SelectItem>
                              <SelectItem value="preparing">Preparando</SelectItem>
                              <SelectItem value="out_for_delivery">Saiu para Entrega</SelectItem>
                              <SelectItem value="delivered">Entregue</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {order.payment_status !== 'paid' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePaymentMutation.mutate({
                                  orderId: order.id,
                                  status: 'paid'
                                });
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirmar Pag.
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBlockCustomer(order);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Bloquear
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O pedido será removido permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteOrderMutation.mutate(order.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Block Customer Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Bloquear Cliente</DialogTitle>
            <DialogDescription>
              O cliente não conseguirá gerar PIX no checkout após ser bloqueado.
            </DialogDescription>
          </DialogHeader>
          
          {blockingOrder && (
            <div className="space-y-4">
              <div>
                <Label>Tipo de Bloqueio</Label>
                <Select value={blockType} onValueChange={(v) => setBlockType(v as typeof blockType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Celular
                      </span>
                    </SelectItem>
                    <SelectItem value="email" disabled={!blockingOrder.customer_email}>
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </span>
                    </SelectItem>
                    <SelectItem value="ip" disabled={!blockingOrder.customer_ip}>
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        IP
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Valor a Bloquear</Label>
                <Input 
                  value={getBlockValue()}
                  disabled
                  className="font-mono"
                />
              </div>

              <div>
                <Label>Motivo (opcional)</Label>
                <Textarea 
                  placeholder="Ex: Tentativa de fraude, comportamento suspeito..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmBlockCustomer}
              disabled={blockCustomerMutation.isPending || !getBlockValue()}
            >
              <Ban className="h-4 w-4 mr-2" />
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
