import { MapPin, Phone, Mail, Clock, Instagram, Facebook } from 'lucide-react';
import { useStoreSettings } from '@/hooks/useStoreSettings';
export function Footer() {
  const {
    data: settings
  } = useStoreSettings();
  return <footer className="bg-foreground text-background">
      
    </footer>;
}