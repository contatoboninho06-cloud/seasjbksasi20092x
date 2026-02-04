import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

function InlineLoginForm() {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    if (error) {
      toast.error('Email ou senha inválidos');
      setIsLoading(false);
    } else {
      toast.success('Login realizado com sucesso!');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Área Restrita</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Entre com suas credenciais
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={loginData.email}
                onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="login-password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full h-12" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AdminGuard() {
  const { user, isAdmin, loading, adminLoading, checkAdminStatus } = useAuth();

  // Dispara verificação de admin quando acessar esta rota
  useEffect(() => {
    if (user && adminLoading) {
      checkAdminStatus();
    }
  }, [user, adminLoading, checkAdminStatus]);

  // Loading básico da sessão
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não está logado, mostra formulário de login inline
  if (!user) {
    return <InlineLoginForm />;
  }

  // Aguarda verificação de admin (lazy loading)
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  // Se está logado mas não é admin, redireciona para home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
