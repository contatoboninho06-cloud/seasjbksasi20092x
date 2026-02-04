import { useEffect, useState } from 'react';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package, Clock, Truck, CheckCircle, XCircle, MapPin, Phone, Copy, Check, Timer, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderItem, OrderStatus } from '@/types/database';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-warning' },
  confirmed: { label: 'Confirmado', icon: Package, color: 'text-blue-500' },
  preparing: { label: 'Preparando', icon: Package, color: 'text-orange-500' },
  out_for_delivery: { label: 'Saiu para Entrega', icon: Truck, color: 'text-purple-500' },
  delivered: { label: 'Entregue', icon: CheckCircle, color: 'text-success' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-destructive' },
};

const statusOrder: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

export default function OrderTrackingPage() {
  useForceLightTheme();
  const { orderId } = useParams<{ orderId: string }>();
  const [copied, setCopied] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      return data as Order & { items: OrderItem[] };
    },
    enabled: !!orderId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, refetch]);

  // Polling for payment status when payment is pending
  useEffect(() => {
    if (!order || order.payment_status !== 'pending' || !order.payevo_transaction_id) return;

    const interval = setInterval(async () => {
      await refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [order?.payment_status, order?.payevo_transaction_id, refetch]);

  const copyPixCode = () => {
    if (order?.pix_qrcode) {
      navigator.clipboard.writeText(order.pix_qrcode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const checkPaymentStatus = async () => {
    if (!order?.payevo_transaction_id) return;
    
    setIsCheckingPayment(true);
    try {
      const response = await supabase.functions.invoke('payevo-status', {
        body: null,
        headers: {},
      });
      
      // Use query params instead
      const statusResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payevo-status?transactionId=${order.payevo_transaction_id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (statusResponse.ok) {
        await refetch();
        toast.success('Status atualizado!');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const formatExpirationTime = (expirationDate: string) => {
    const expiration = new Date(expirationDate);
    const now = new Date();
    const diffMs = expiration.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expirado';
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
  };

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

  if (isLoading) {
    return (
      <Layout>
        <div className="container-app py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="container-app py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Pedido não encontrado</h1>
          <Link to="/pedidos">
            <Button>Ver meus pedidos</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const currentStatusIndex = statusOrder.indexOf(order.status as OrderStatus);
  const StatusIcon = statusConfig[order.status as OrderStatus]?.icon || Package;

  return (
    <Layout>
      <div className="bg-secondary/30 py-8">
        <div className="container-app">
          <Link to="/pedidos">
            <Button variant="ghost" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Meus Pedidos
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Pedido #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-muted-foreground">
            Realizado em {formatDate(order.created_at)}
          </p>
        </div>
      </div>
      
      <div className="container-app py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Status Tracker */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon className={cn("h-5 w-5", statusConfig[order.status as OrderStatus]?.color)} />
                  {statusConfig[order.status as OrderStatus]?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.status !== 'cancelled' ? (
                  <div className="flex items-center justify-between">
                    {statusOrder.map((status, index) => {
                      const config = statusConfig[status];
                      const Icon = config.icon;
                      const isActive = index <= currentStatusIndex;
                      const isCurrent = index === currentStatusIndex;
                      
                      return (
                        <div key={status} className="flex flex-col items-center flex-1">
                          <div className={cn(
                            "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                            isActive ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-muted",
                            isCurrent && "ring-4 ring-primary/20"
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className={cn(
                            "text-xs mt-2 text-center hidden sm:block",
                            isActive ? "text-foreground font-medium" : "text-muted-foreground"
                          )}>
                            {config.label}
                          </span>
                          {index < statusOrder.length - 1 && (
                            <div className={cn(
                              "absolute h-0.5 w-full top-5 left-1/2",
                              index < currentStatusIndex ? "bg-primary" : "bg-muted"
                            )} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-destructive">
                    <XCircle className="h-12 w-12 mx-auto mb-2" />
                    <p className="font-medium">Pedido cancelado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PIX Payment Section - Show when payment is pending and has QR code */}
            {order.payment_status === 'pending' && order.pix_qrcode && (
              <Card className="border-warning/50 bg-warning/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-warning" />
                    Aguardando Pagamento PIX
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.pix_qrcode)}`}
                      alt="QR Code PIX"
                      className="rounded-lg border bg-white p-2"
                      width={200}
                      height={200}
                    />
                  </div>

                  {order.pix_expiration && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      <span>Expira em: {formatExpirationTime(order.pix_expiration)}</span>
                    </div>
                  )}

                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-2">PIX Copia e Cola:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-background rounded px-2 py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                        {order.pix_qrcode.slice(0, 40)}...
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyPixCode}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={checkPaymentStatus}
                    disabled={isCheckingPayment}
                  >
                    {isCheckingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Verificar Pagamento
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Payment Confirmed Banner */}
            {order.payment_status === 'paid' && (
              <Card className="border-success/50 bg-success/5">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-success" />
                    <div>
                      <p className="font-medium text-success">Pagamento Confirmado!</p>
                      <p className="text-sm text-muted-foreground">Seu pagamento foi recebido com sucesso</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Itens do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.quantity}x {item.product_name}</p>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground">Obs: {item.notes}</p>
                        )}
                      </div>
                      <span className="font-medium">{formatPrice(item.total_price)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Delivery Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {order.is_pickup ? <Package className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  {order.is_pickup ? 'Retirada no Local' : 'Endereço de Entrega'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.is_pickup ? (
                  <p className="text-muted-foreground">
                    O cliente irá retirar o pedido no estabelecimento
                  </p>
                ) : (
                  <p>{order.delivery_address}</p>
                )}
                
                <div className="flex items-center gap-2 mt-4 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customer_phone}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa de entrega</span>
                    <span>{order.is_pickup ? 'Grátis' : formatPrice(order.delivery_fee)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Desconto</span>
                      <span>-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Pagamento</p>
                  <p className="font-medium uppercase">{order.payment_method}</p>
                  <span className={cn(
                    "inline-block mt-1 text-xs px-2 py-0.5 rounded-full",
                    order.payment_status === 'paid' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  )}>
                    {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
