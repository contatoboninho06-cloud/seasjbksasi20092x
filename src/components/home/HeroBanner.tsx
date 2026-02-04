import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Clock, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStoreSettings } from '@/hooks/useStoreSettings';

export function HeroBanner() {
  const { data: settings } = useStoreSettings();

  return (
    <section className="relative overflow-hidden bg-gradient-dark text-background">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
      
      <div className="container-app relative py-16 md:py-24">
        <div className="max-w-2xl">
          <span className="inline-block bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
            🔥 Peça agora mesmo
          </span>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            O melhor{' '}
            <span className="text-gradient bg-gradient-warm">churrasco</span>
            <br />
            na sua casa
          </h1>
          
          <p className="text-lg text-background/70 mb-8 max-w-lg">
            Carnes selecionadas, preparo artesanal e entrega rápida. 
            Experimente a tradição do churrasco brasileiro com qualidade premium.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link to="/cardapio">
              <Button size="lg" className="gap-2 text-base">
                Ver Cardápio
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/cardapio">
              <Button size="lg" variant="outline" className="text-base border-background/30 text-background hover:bg-background/10">
                Fazer Pedido
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          <div className="flex items-center gap-3 bg-background/5 backdrop-blur-sm rounded-xl p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Entrega Rápida</p>
              <p className="text-sm text-background/60">
                {settings?.delivery_time_min}-{settings?.delivery_time_max} min
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-background/5 backdrop-blur-sm rounded-xl p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Horário Flexível</p>
              <p className="text-sm text-background/60">
                {settings?.opening_time?.slice(0, 5)} - {settings?.closing_time?.slice(0, 5)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-background/5 backdrop-blur-sm rounded-xl p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Qualidade Premium</p>
              <p className="text-sm text-background/60">Carnes selecionadas</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
