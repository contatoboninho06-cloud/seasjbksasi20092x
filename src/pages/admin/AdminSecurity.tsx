import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Phone, Mail, Globe, Trash2, Shield, CreditCard, Search } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type BlockType = 'cpf' | 'email' | 'phone' | 'ip';

interface BlockedCustomer {
  id: string;
  block_type: BlockType;
  block_value: string;
  reason: string | null;
  blocked_at: string;
  is_active: boolean;
  created_at: string;
}

const blockTypeConfig: Record<BlockType, { label: string; icon: React.ElementType; placeholder: string }> = {
  cpf: { label: 'CPF', icon: CreditCard, placeholder: '000.000.000-00' },
  email: { label: 'Email', icon: Mail, placeholder: 'email@exemplo.com' },
  phone: { label: 'Celular', icon: Phone, placeholder: '11999999999' },
  ip: { label: 'IP', icon: Globe, placeholder: '192.168.1.1' },
};

export default function AdminSecurityPage() {
  const queryClient = useQueryClient();
  const [blockType, setBlockType] = useState<BlockType>('phone');
  const [blockValue, setBlockValue] = useState('');
  const [reason, setReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: blocks, isLoading } = useQuery({
    queryKey: ['blocked-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_customers')
        .select('*')
        .eq('is_active', true)
        .order('blocked_at', { ascending: false });
      
      if (error) throw error;
      return data as BlockedCustomer[];
    },
  });

  const addBlockMutation = useMutation({
    mutationFn: async () => {
      const normalizedValue = blockType === 'phone' 
        ? blockValue.replace(/\D/g, '') 
        : blockType === 'email' 
          ? blockValue.toLowerCase().trim()
          : blockValue.trim();

      const { error } = await supabase
        .from('blocked_customers')
        .insert({
          block_type: blockType,
          block_value: normalizedValue,
          reason: reason || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-customers'] });
      toast.success('Cliente bloqueado com sucesso!');
      setBlockValue('');
      setReason('');
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Este valor já está bloqueado');
      } else {
        toast.error('Erro ao bloquear cliente');
      }
    },
  });

  const removeBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blocked_customers')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-customers'] });
      toast.success('Bloqueio removido!');
    },
    onError: () => {
      toast.error('Erro ao remover bloqueio');
    },
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!blockValue.trim()) {
      toast.error('Digite um valor para bloquear');
      return;
    }

    addBlockMutation.mutate();
  };

  const filteredBlocks = blocks?.filter(block => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      block.block_value.toLowerCase().includes(query) ||
      block.reason?.toLowerCase().includes(query) ||
      block.block_type.toLowerCase().includes(query)
    );
  });

  const TypeIcon = blockTypeConfig[blockType].icon;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Segurança
          </h1>
          <p className="text-muted-foreground">
            Gerencie bloqueios de clientes no checkout
          </p>
        </div>

        {/* Add Block Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Bloquear Cliente
            </CardTitle>
            <CardDescription>
              Clientes bloqueados não conseguirão gerar PIX no checkout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Bloqueio</Label>
                  <Select value={blockType} onValueChange={(v) => setBlockType(v as BlockType)}>
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
                      <SelectItem value="email">
                        <span className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </span>
                      </SelectItem>
                      <SelectItem value="cpf">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          CPF
                        </span>
                      </SelectItem>
                      <SelectItem value="ip">
                        <span className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          IP
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor</Label>
                  <div className="relative">
                    <TypeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={blockTypeConfig[blockType].placeholder}
                      value={blockValue}
                      onChange={(e) => setBlockValue(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  placeholder="Ex: Tentativa de fraude, chargeback, comportamento suspeito..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </div>

              <Button type="submit" disabled={addBlockMutation.isPending}>
                <Ban className="h-4 w-4 mr-2" />
                Bloquear
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Blocked List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Clientes Bloqueados</CardTitle>
                <CardDescription>
                  {blocks?.length || 0} bloqueio(s) ativo(s)
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredBlocks?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum bloqueio encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="hidden sm:table-cell">Motivo</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                      <TableHead className="w-16">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBlocks?.map((block) => {
                      const config = blockTypeConfig[block.block_type as BlockType];
                      const Icon = config?.icon || Shield;
                      return (
                        <TableRow key={block.id}>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <Icon className="h-3 w-3" />
                              {config?.label || block.block_type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {block.block_value}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm max-w-xs truncate">
                            {block.reason || '-'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {formatDate(block.blocked_at)}
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover bloqueio?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O cliente poderá gerar PIX novamente no checkout.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeBlockMutation.mutate(block.id)}
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
