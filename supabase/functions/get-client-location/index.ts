import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationData {
  ip: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Location API] Iniciando captura de geolocalização server-side...');
    
    // Capturar IP do cliente via headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log('[Location API] IP capturado:', clientIp);

    // Fazer requisição para ip-api.com (gratuito, sem API key)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`http://ip-api.com/json/${clientIp}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`ip-api.com returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validar coordenadas
    if (!data.lat || !data.lon) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const location: LocationData = {
      ip: data.query || clientIp,
      city: data.city || 'Unknown',
      state: data.regionName || 'Unknown',
      country: data.country || 'Unknown',
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
    };
    
    console.log('[Location API] Localização capturada:', location);
    
    return new Response(
      JSON.stringify(location),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[Location API] Erro:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch geolocation'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
