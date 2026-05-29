import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchStoreSettings } from "../utils/settings.remote";
import { DEFAULT_WHATSAPP } from "../data/constants";

export type StoreSettings = {
  whatsapp_number: string;
  shipping_cost: number;
  free_shipping_threshold: number;
  announcement_banner: string;
  stock_threshold: number;
};

const defaultSettings: StoreSettings = {
  whatsapp_number: DEFAULT_WHATSAPP,
  shipping_cost: 0,
  free_shipping_threshold: 50000,
  announcement_banner: "",
  stock_threshold: 10,
};

const StoreSettingsContext = createContext<StoreSettings>(defaultSettings);

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);

  useEffect(() => {
    let active = true;
    fetchStoreSettings()
      .then((data) => {
        if (active) {
          setSettings({
            whatsapp_number: data.whatsapp_number || defaultSettings.whatsapp_number,
            shipping_cost: Number(data.shipping_cost ?? defaultSettings.shipping_cost),
            free_shipping_threshold: Number(data.free_shipping_threshold ?? defaultSettings.free_shipping_threshold),
            announcement_banner: data.announcement_banner || defaultSettings.announcement_banner,
            stock_threshold: Number(data.stock_threshold ?? defaultSettings.stock_threshold),
          });
        }
      })
      .catch((err) => {
        console.error("Error al cargar store settings:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <StoreSettingsContext.Provider value={settings}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  return useContext(StoreSettingsContext);
}
