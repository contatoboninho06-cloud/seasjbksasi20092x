import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryZone } from '@/types/database';

export function useDeliveryZones() {
  return useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('zip_code_start');
      
      if (error) throw error;
      return data as DeliveryZone[];
    },
  });
}

export function calculateDeliveryFee(zipCode: string, zones: DeliveryZone[]): { 
  fee: number; 
  time: number; 
  found: boolean;
  zone: DeliveryZone | null;
} {
  const cleanZip = zipCode.replace(/\D/g, '');
  
  if (cleanZip.length !== 8) {
    return { fee: 0, time: 0, found: false, zone: null };
  }
  
  const zipNum = parseInt(cleanZip, 10);
  
  const zone = zones.find(z => {
    const start = parseInt(z.zip_code_start.replace(/\D/g, ''), 10);
    const end = parseInt(z.zip_code_end.replace(/\D/g, ''), 10);
    return zipNum >= start && zipNum <= end;
  });
  
  if (zone) {
    return { 
      fee: zone.delivery_fee, 
      time: zone.delivery_time, 
      found: true,
      zone 
    };
  }
  
  return { fee: 0, time: 0, found: false, zone: null };
}

export function formatZipCode(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
}
