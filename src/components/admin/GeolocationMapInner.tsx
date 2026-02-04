import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  step?: string;
  total?: number;
  payment_method?: string;
  created_at: string;
  session_id: string;
}

interface GeolocationMapInnerProps {
  locations: LocationData[];
}

const STEP_COLORS: Record<string, string> = {
  delivery: '#3b82f6',       // blue-500
  identification: '#f97316', // orange-500
  payment: '#22c55e',        // green-500
  default: '#6b7280',        // gray-500
};

const STEP_LABELS: Record<string, string> = {
  delivery: 'Entrega',
  identification: 'Identificação',
  payment: 'Pagamento',
};

export function GeolocationMapInner({ locations }: GeolocationMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // If map already exists, just return
    if (mapRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        attributionControl: false,
        zoomControl: true,
      }).setView([-14.235, -51.9253], 3); // Brazil center - zoom mais afastado

      // OpenStreetMap tiles (free, no API key)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 2,
      }).addTo(map);

      mapRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);

      // Force resize after a short delay to ensure proper rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const validLocations = locations.filter(
      loc => loc.lat && loc.lng && !isNaN(loc.lat) && !isNaN(loc.lng) && loc.lat !== 0 && loc.lng !== 0
    );

    if (validLocations.length === 0) return;

    validLocations.forEach((location) => {
      const stepKey = location.step?.toLowerCase() || 'default';
      const color = STEP_COLORS[stepKey] || STEP_COLORS.default;
      const stepLabel = STEP_LABELS[stepKey] || location.step || 'Início';

      // Create custom pulse marker
      const icon = L.divIcon({
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="
              position: absolute;
              width: 24px;
              height: 24px;
              background: ${color};
              border-radius: 50%;
              opacity: 0.3;
              animation: pulse 2s infinite;
            "></div>
            <div style="
              position: absolute;
              top: 6px;
              left: 6px;
              width: 12px;
              height: 12px;
              background: ${color};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
          </div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 0.3; }
              50% { transform: scale(1.5); opacity: 0.1; }
              100% { transform: scale(1); opacity: 0.3; }
            }
          </style>
        `,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const formattedValue = location.total 
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(location.total)
        : null;

      const time = new Date(location.created_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 150px;">
          <div style="font-weight: 600; color: ${color}; margin-bottom: 4px;">
            ${stepLabel}
          </div>
          <div style="font-size: 13px; color: #374151;">
            ${location.city || 'Cidade desconhecida'}${location.state ? `, ${location.state}` : ''}
          </div>
          ${formattedValue ? `<div style="font-size: 13px; font-weight: 500; margin-top: 4px;">${formattedValue}</div>` : ''}
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
            ${time}
          </div>
        </div>
      `;

      L.marker([location.lat, location.lng], { icon })
        .bindPopup(popupContent)
        .addTo(markersLayerRef.current!);
    });

    // Fit bounds to show all markers
    if (validLocations.length > 1) {
      const bounds = L.latLngBounds(validLocations.map(loc => [loc.lat, loc.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    } else if (validLocations.length === 1) {
      mapRef.current.setView([validLocations[0].lat, validLocations[0].lng], 6);
    }
  }, [locations]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full rounded-lg"
      style={{ minHeight: '200px' }}
    />
  );
}
