import { createContext, useContext, useState, useEffect } from 'react';
import { getActiveBranding, applyBrandingToDOM, DEFAULT_BRANDING } from '@/utils/branding';

const BrandingContext = createContext();

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const loadBranding = async () => {
    setLoading(true);
    try {
      const activeBranding = await getActiveBranding();
      setBranding(activeBranding);
      applyBrandingToDOM(activeBranding);
    } catch (error) {
      console.error('Erro ao carregar branding:', error);
      setBranding(DEFAULT_BRANDING);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranding();
  }, []);

  useEffect(() => {
    // Aplicar branding ao DOM quando mudar
    applyBrandingToDOM(branding);
  }, [branding]);

  const refreshBranding = async () => {
    await loadBranding();
  };

  return (
    <BrandingContext.Provider value={{ branding, setBranding, refreshBranding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
};
