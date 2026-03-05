import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase, getCurrentUser, getUserProfile, signOut } from '@/lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Flags para evitar race conditions e múltiplas chamadas
  const isCheckingUser = useRef(false);
  const isMounted = useRef(true);
  const authListenerRef = useRef(null);

  const handleSignOut = useCallback(() => {
    if (isMounted.current) {
      setUser(null);
      setProfile(null);
      localStorage.removeItem('fitjourney_user_type');
      localStorage.removeItem('fitjourney_user_email');
      localStorage.removeItem('fitjourney_user_id');
      localStorage.removeItem('fitjourney_patient_id');
      localStorage.removeItem('fitjourney_patient_name');
    }
  }, []);

  // Tratamento para sessão corrompida
  const handleCorruptedSession = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      handleSignOut();
    } catch (error) {
      console.error('Error clearing corrupted session:', error);
      // Forçar limpeza local mesmo se signOut falhar
      handleSignOut();
    }
  }, [handleSignOut]);

  const handleSignIn = useCallback(async (authUser) => {
    try {
      const userProfile = await getUserProfile(authUser.id);
      if (isMounted.current) {
        setUser(authUser);
        setProfile(userProfile);
      }
    } catch (error) {
      console.error('Error loading profile after sign in:', error);
      // Em caso de erro, fazer logout seguro
      await handleCorruptedSession();
    }
  }, [handleCorruptedSession]);

  const checkUser = useCallback(async () => {
    // Evitar múltiplas chamadas simultâneas
    if (isCheckingUser.current) {
      return;
    }

    isCheckingUser.current = true;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        await handleCorruptedSession();
        return;
      }

      if (session?.user) {
        const userProfile = await getUserProfile(session.user.id);
        if (isMounted.current) {
          setUser(session.user);
          setProfile(userProfile);
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
      await handleCorruptedSession();
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      isCheckingUser.current = false;
    }
  }, [handleCorruptedSession]);

  useEffect(() => {
    isMounted.current = true;

    // Verificar sessão inicial apenas uma vez
    checkUser();

    // Configurar listener APENAS se não existir
    if (!authListenerRef.current) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth event:', event);
        
        // Ignorar INITIAL_SESSION pois já chamamos checkUser()
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        // Evitar processar eventos durante check inicial
        if (isCheckingUser.current) {
          console.log('⏭️ Ignorando evento (checkUser em progresso)');
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          await handleSignIn(session.user);
        } else if (event === 'SIGNED_OUT') {
          handleSignOut();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Apenas atualizar user, não buscar profile novamente
          if (isMounted.current) {
            setUser(session.user);
          }
        }
      });

      authListenerRef.current = authListener;
    }

    return () => {
      isMounted.current = false;
      // Limpar listener ao desmontar
      if (authListenerRef.current) {
        authListenerRef.current?.subscription?.unsubscribe();
        authListenerRef.current = null;
      }
    };
  }, []); // Removido dependências para evitar loops

  const logout = async () => {
    try {
      await signOut();
      handleSignOut();
    } catch (error) {
      console.error('Logout error:', error);
      // Garantir limpeza local mesmo se signOut falhar
      handleSignOut();
    }
  };

  // Método para refresh forçado do profile (útil após updates)
  const refreshProfile = async () => {
    if (user?.id) {
      const userProfile = await getUserProfile(user.id);
      if (isMounted.current) {
        setProfile(userProfile);
      }
    }
  };

  const value = {
    user,
    profile,
    loading,
    logout,
    refreshProfile,
    isAuthenticated: !!user,
    role: profile?.role
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
