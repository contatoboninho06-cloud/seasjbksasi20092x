import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreSettings } from '@/types/database';

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as StoreSettings | null;
    },
  });
}

export function useIsStoreOpen() {
  const { data: settings, isLoading } = useStoreSettings();
  
  if (isLoading || !settings) {
    return { isOpen: null as boolean | null, message: 'Carregando...', isLoading: true };
  }
  
  if (!settings.is_open) {
    return { isOpen: false, message: 'Estamos fechados no momento' };
  }
  
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  if (!settings.working_days.includes(currentDay)) {
    return { isOpen: false, message: 'Não abrimos neste dia' };
  }
  
  const currentTime = now.toTimeString().slice(0, 5);
  const openTime = settings.opening_time.slice(0, 5);
  const closeTime = settings.closing_time.slice(0, 5);
  
  let isWithinHours: boolean;
  
  // Verifica se o horário cruza a meia-noite (ex: 09:00 às 06:00)
  if (closeTime < openTime) {
    // Cruza meia-noite: aberto se >= abertura OU <= fechamento
    isWithinHours = currentTime >= openTime || currentTime <= closeTime;
  } else {
    // Horário normal: aberto se >= abertura E <= fechamento
    isWithinHours = currentTime >= openTime && currentTime <= closeTime;
  }
  
  if (!isWithinHours) {
    return { 
      isOpen: false, 
      message: `Abrimos das ${openTime} às ${closeTime}`,
      isLoading: false
    };
  }
  
  return { isOpen: true, message: 'Aberto agora', isLoading: false };
}
