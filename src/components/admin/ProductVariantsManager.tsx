import { useState, useRef } from 'react';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp, Upload, Link as LinkIcon, Loader2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  useAdminVariantGroups,
  useAdminVariants,
  useVariantGroupMutations,
  useVariantMutations,
  VariantGroup,
  ProductVariant,
} from '@/hooks/useVariants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductVariantsManagerProps {
  productId: string;
  productName: string;
}

interface GroupFormData {
  name: string;
  is_required: boolean;
  is_active: boolean;
}

interface VariantFormData {
  name: string;
  price: string;
  image_url: string;
  is_available: boolean;
}

const initialGroupForm: GroupFormData = {
  name: '',
  is_required: false,
  is_active: true,
};

const initialVariantForm: VariantFormData = {
  name: '',
  price: '',
  image_url: '',
  is_available: true,
};

export function ProductVariantsManager({ productId, productName }: ProductVariantsManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<VariantGroup | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState<GroupFormData>(initialGroupForm);
  const [variantForm, setVariantForm] = useState<VariantFormData>(initialVariantForm);
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url');
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Queries
  const { data: groups = [], isLoading: groupsLoading } = useAdminVariantGroups(productId);
  const { data: variants = [], isLoading: variantsLoading } = useAdminVariants(productId);

  // Mutations
  const { createGroup, updateGroup, deleteGroup } = useVariantGroupMutations();
  const { createVariant, updateVariant, deleteVariant } = useVariantMutations();

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getVariantsForGroup = (groupId: string) => {
    return variants.filter(v => v.group_id === groupId);
  };

  // Upload image
  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `variants/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => setPreviewImage(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const url = await uploadImage(file);
      setVariantForm({ ...variantForm, image_url: url });
      toast.success('Imagem enviada!');
    } catch (error) {
      toast.error('Erro ao enviar imagem');
      setPreviewImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Group handlers
  const openGroupDialog = (group?: VariantGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        is_required: group.is_required,
        is_active: group.is_active,
      });
    } else {
      setEditingGroup(null);
      setGroupForm(initialGroupForm);
    }
    setIsGroupDialogOpen(true);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }

    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          id: editingGroup.id,
          product_id: productId,
          name: groupForm.name,
          is_required: groupForm.is_required,
          is_active: groupForm.is_active,
        });
        toast.success('Grupo atualizado!');
      } else {
        await createGroup.mutateAsync({
          product_id: productId,
          name: groupForm.name,
          is_required: groupForm.is_required,
          is_active: groupForm.is_active,
          display_order: groups.length,
        });
        toast.success('Grupo criado!');
      }
      setIsGroupDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar grupo');
    }
  };

  const handleDeleteGroup = async (group: VariantGroup) => {
    if (!confirm(`Excluir o grupo "${group.name}" e todas suas variantes?`)) return;
    
    try {
      await deleteGroup.mutateAsync({ id: group.id, productId });
      toast.success('Grupo excluído!');
    } catch (error) {
      toast.error('Erro ao excluir grupo');
    }
  };

  // Variant handlers
  const openVariantDialog = (groupId: string, variant?: ProductVariant) => {
    setSelectedGroupId(groupId);
    if (variant) {
      setEditingVariant(variant);
      setVariantForm({
        name: variant.name,
        price: variant.price.toString(),
        image_url: variant.image_url || '',
        is_available: variant.is_available,
      });
      setPreviewImage(variant.image_url);
    } else {
      setEditingVariant(null);
      setVariantForm(initialVariantForm);
      setPreviewImage(null);
    }
    setImageTab('url');
    setIsVariantDialogOpen(true);
  };

  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantForm.name || !variantForm.price) {
      toast.error('Nome e preço são obrigatórios');
      return;
    }

    try {
      if (editingVariant) {
        await updateVariant.mutateAsync({
          id: editingVariant.id,
          product_id: productId,
          name: variantForm.name,
          price: parseFloat(variantForm.price),
          image_url: variantForm.image_url || null,
          is_available: variantForm.is_available,
        });
        toast.success('Variante atualizada!');
      } else {
        const groupVariants = getVariantsForGroup(selectedGroupId!);
        await createVariant.mutateAsync({
          product_id: productId,
          group_id: selectedGroupId,
          name: variantForm.name,
          price: parseFloat(variantForm.price),
          image_url: variantForm.image_url || null,
          is_available: variantForm.is_available,
          display_order: groupVariants.length,
        });
        toast.success('Variante criada!');
      }
      setIsVariantDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar variante');
    }
  };

  const handleDeleteVariant = async (variant: ProductVariant) => {
    if (!confirm(`Excluir a variante "${variant.name}"?`)) return;
    
    try {
      await deleteVariant.mutateAsync({ id: variant.id, productId });
      toast.success('Variante excluída!');
    } catch (error) {
      toast.error('Erro ao excluir variante');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (groupsLoading || variantsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Organize as variantes em grupos (ex: Latas, Garrafas)
        </p>
        <Button onClick={() => openGroupDialog()} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Grupo
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum grupo de variantes cadastrado
            </p>
            <Button onClick={() => openGroupDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const groupVariants = getVariantsForGroup(group.id);
            const isExpanded = expandedGroups.has(group.id);

            return (
              <Card key={group.id} className={cn(!group.is_active && "opacity-60")}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{group.name}</h4>
                              {group.is_required && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  Obrigatório
                                </span>
                              )}
                              {!group.is_active && (
                                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                                  Inativo
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {groupVariants.length} variante{groupVariants.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openGroupDialog(group);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 border-t pt-4">
                      <div className="space-y-2">
                        {groupVariants.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhuma variante neste grupo
                          </p>
                        ) : (
                          groupVariants.map((variant) => (
                            <div
                              key={variant.id}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-lg border bg-background",
                                !variant.is_available && "opacity-60"
                              )}
                            >
                              <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                {variant.image_url ? (
                                  <img
                                    src={variant.image_url}
                                    alt={variant.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                    📷
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{variant.name}</p>
                                <p className="text-sm font-semibold text-primary">
                                  {formatPrice(variant.price)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openVariantDialog(group.id, variant)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteVariant(variant)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2 mt-2"
                          onClick={() => openVariantDialog(group.id)}
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar Variante
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Group Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Editar Grupo' : 'Novo Grupo de Variantes'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGroupSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Nome do Grupo *</Label>
              <Input
                id="group-name"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="Ex: Latas, Garrafas, Tamanhos"
                required
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="group-required">Seleção Obrigatória</Label>
                <p className="text-xs text-muted-foreground">
                  Cliente deve escolher uma variante
                </p>
              </div>
              <Switch
                id="group-required"
                checked={groupForm.is_required}
                onCheckedChange={(checked) => setGroupForm({ ...groupForm, is_required: checked })}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="group-active">Ativo</Label>
              <Switch
                id="group-active"
                checked={groupForm.is_active}
                onCheckedChange={(checked) => setGroupForm({ ...groupForm, is_active: checked })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsGroupDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createGroup.isPending || updateGroup.isPending}
              >
                {(createGroup.isPending || updateGroup.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Variant Dialog */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? 'Editar Variante' : 'Nova Variante'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVariantSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="variant-name">Nome *</Label>
              <Input
                id="variant-name"
                value={variantForm.name}
                onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                placeholder="Ex: Coca-Cola Lata"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variant-price">Preço *</Label>
              <Input
                id="variant-price"
                type="number"
                step="0.01"
                min="0"
                value={variantForm.price}
                onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                placeholder="5.00"
                required
              />
            </div>

            {/* Image Section */}
            <div className="space-y-2">
              <Label>Imagem (opcional)</Label>
              <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as 'url' | 'upload')}>
                <TabsList className="w-full">
                  <TabsTrigger value="url" className="flex-1 gap-2">
                    <LinkIcon className="h-4 w-4" />
                    URL
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex-1 gap-2">
                    <Upload className="h-4 w-4" />
                    Upload
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="mt-3">
                  <Input
                    value={variantForm.image_url}
                    onChange={(e) => {
                      setVariantForm({ ...variantForm, image_url: e.target.value });
                      setPreviewImage(e.target.value);
                    }}
                    placeholder="https://..."
                  />
                </TabsContent>
                <TabsContent value="upload" className="mt-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Selecionar Imagem
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
              {previewImage && (
                <div className="mt-3">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="variant-available">Disponível</Label>
              <Switch
                id="variant-available"
                checked={variantForm.is_available}
                onCheckedChange={(checked) => setVariantForm({ ...variantForm, is_available: checked })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsVariantDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createVariant.isPending || updateVariant.isPending || isUploading}
              >
                {(createVariant.isPending || updateVariant.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
