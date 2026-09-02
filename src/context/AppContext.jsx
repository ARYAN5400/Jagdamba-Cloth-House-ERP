import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [shopSettings, setShopSettings] = useState({
    shop_name: 'Jagdamba Cloth House',
    owner_name: 'Retail Owner',
    phone: '7876413356',
    address: 'Main Bazar, GHANOUR',
    gstin: '03BMLPK3243D1ZH'
  });
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchHealthAndSettings = async () => {
    try {
      const healthRes = await api.get('/health');
      if (healthRes.data && healthRes.data.status === 'OK') {
        setIsDbConnected(true);
        const settingsRes = await api.get('/settings');
        if (settingsRes.data) {
          setShopSettings(settingsRes.data);
        }
      } else {
        setIsDbConnected(false);
      }
    } catch (error) {
      setIsDbConnected(false);
      console.error('[AppContext] Backend health check failed:', error);
    }
  };

  useEffect(() => {
    fetchHealthAndSettings();
    const interval = setInterval(fetchHealthAndSettings, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{
      shopSettings,
      setShopSettings,
      isDbConnected,
      toasts,
      addToast,
      removeToast,
      refreshSettings: fetchHealthAndSettings
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
