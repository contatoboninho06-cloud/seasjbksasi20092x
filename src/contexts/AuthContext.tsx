import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  adminLoading: boolean;
  isAdmin: boolean;
  registrationEnabled: boolean;
  checkAdminStatus: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  
  // Ref para armazenar o userId já verificado como admin - evita race conditions
  const verifiedAdminUserId = useRef<string | null>(null);
  const adminCheckTriggered = useRef(false);

  const checkAdminRole = async (userId: string): Promise<boolean> => {
    console.log('🔍 Verificando role de admin para:', userId);
    
    // Se já verificamos este usuário como admin, retornar true imediatamente
    if (verifiedAdminUserId.current === userId) {
      console.log('✅ Usuário já verificado como admin anteriormente');
      return true;
    }
    
    try {
      // Timeout de 5 segundos para RPC
      const rpcPromise = supabase.rpc('check_is_admin', { user_id_param: userId });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout após 5s')), 5000)
      );
      
      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
      
      console.log('✅ Resultado RPC:', { data, error, isAdmin: data === true });
      
      if (error) throw error;
      
      // Se for admin, armazenar no ref
      if (data === true) {
        verifiedAdminUserId.current = userId;
        return true;
      }
      return false;
      
    } catch (rpcError) {
      console.warn('⚠️ RPC falhou, tentando query direta:', rpcError);
      
      // Fallback com timeout de 3 segundos
      try {
        const queryPromise = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();
        
        const queryTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout após 3s')), 3000)
        );
        
        const { data, error } = await Promise.race([queryPromise, queryTimeout]);
        
        console.log('✅ Resultado query direta:', { data, error, isAdmin: !!data });
        
        if (error) throw error;
        
        // Se for admin, armazenar no ref
        const isAdminUser = !!data;
        if (isAdminUser) {
          verifiedAdminUserId.current = userId;
        }
        return isAdminUser;
        
      } catch (queryError) {
        console.error('❌ Todas verificações falharam:', queryError);
        return false;
      }
    }
  };

  const checkRegistrationEnabled = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('registration_enabled')
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error checking registration status:', error);
        return true;
      }
      
      return data?.registration_enabled ?? true;
    } catch (error) {
      console.error('Error checking registration status:', error);
      return true;
    }
  };

  const checkIfFirstUser = async () => {
    try {
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error checking user count:', error);
        return false;
      }
      
      return count === 0;
    } catch (error) {
      console.error('Error checking user count:', error);
      return false;
    }
  };

  const makeUserAdmin = async (userId: string) => {
    try {
      // Add admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });
      
      if (roleError) {
        console.error('Error adding admin role:', roleError);
        return;
      }
      
      // Disable registration
      const { error: settingsError } = await supabase
        .from('store_settings')
        .update({ registration_enabled: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows
      
      if (settingsError) {
        console.error('Error disabling registration:', settingsError);
      }
      
      setIsAdmin(true);
      setRegistrationEnabled(false);
    } catch (error) {
      console.error('Error making user admin:', error);
    }
  };

  // Função para verificar admin sob demanda (lazy)
  const checkAdminStatus = async () => {
    // Se já verificou ou está verificando, não fazer nada
    if (adminCheckTriggered.current || !user) {
      return;
    }
    
    adminCheckTriggered.current = true;
    console.log('🔍 Verificando admin sob demanda...');
    
    try {
      const adminStatus = await checkAdminRole(user.id);
      setIsAdmin(adminStatus);
      console.log('✅ Admin status verificado:', adminStatus);
    } catch (error) {
      console.error('❌ Erro ao verificar admin:', error);
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      console.log('🔄 Iniciando autenticação (modo rápido)...');
      try {
        // 1. Buscar sessão - ÚNICO passo bloqueante
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // 2. Se não há sessão, não é admin - finaliza tudo
        if (!session?.user) {
          console.log('❌ Nenhuma sessão - cliente anônimo');
          setAdminLoading(false);
        } else {
          console.log('👤 Sessão encontrada - admin será verificado sob demanda');
          // NÃO verificar admin aqui - será feito pelo AdminGuard
        }
      } catch (error) {
        console.error('❌ Erro na inicialização do auth:', error);
        setAdminLoading(false);
      } finally {
        // 3. Finalizar loading do CLIENTE imediatamente
        if (mounted) {
          console.log('✅ Loading do cliente finalizado');
          setLoading(false);
        }
      }
    };
    
    initAuth();
    
    // Registrar listener DEPOIS, com lógica simplificada baseada em eventos
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔔 Auth event:', event);
        
        // Ignorar evento inicial para evitar duplicação
        if (event === 'INITIAL_SESSION') return;
        
        // 1. SIGNED_OUT: Limpar tudo
        if (event === 'SIGNED_OUT') {
          console.log('🚪 Logout detectado - limpando estado');
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminLoading(true);
          verifiedAdminUserId.current = null;
          adminCheckTriggered.current = false;
          return;
        }
        
        // 2. TOKEN_REFRESHED: Apenas atualizar sessão, manter admin
        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refresh - mantendo estado admin');
          setSession(session);
          return; // NÃO reverificar admin
        }
        
        // 3. SIGNED_IN: Configurar usuário, admin será verificado sob demanda
        if (event === 'SIGNED_IN') {
          const newUserId = session?.user?.id;
          
          // Se é o mesmo usuário já verificado como admin, manter estado
          if (newUserId && newUserId === verifiedAdminUserId.current) {
            console.log('🔄 Mesmo usuário admin - mantendo estado');
            setSession(session);
            setUser(session?.user ?? null);
            return;
          }
          
          // Novo usuário - resetar estado admin
          console.log('👤 Novo login - admin será verificado sob demanda');
          setSession(session);
          setUser(session?.user ?? null);
          setIsAdmin(false);
          setAdminLoading(true);
          adminCheckTriggered.current = false;
          return;
        }
        
        // 4. Outros eventos (USER_UPDATED, PASSWORD_RECOVERY, etc)
        console.log('📝 Evento genérico - atualizando sessão');
        setSession(session);
        setUser(session?.user ?? null);
      }
    );
    
    return () => {
      mounted = false;
      verifiedAdminUserId.current = null;
      adminCheckTriggered.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // Check if registration is enabled
    const regEnabled = await checkRegistrationEnabled();
    if (!regEnabled) {
      return { error: new Error('Cadastros desabilitados. Entre em contato com o administrador.') };
    }

    const isFirstUser = await checkIfFirstUser();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });

    if (!error && data.user && isFirstUser) {
      // Make the first user an admin
      await makeUserAdmin(data.user.id);
    }

    return { error };
  };

  const signOut = async () => {
    verifiedAdminUserId.current = null;
    adminCheckTriggered.current = false;
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAdminLoading(true);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      adminLoading,
      isAdmin,
      registrationEnabled,
      checkAdminStatus,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
