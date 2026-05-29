-- 1. Cash Movements
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'neutral')),
    payment_method TEXT NOT NULL,
    category TEXT,
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Cash Movements
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users only" ON public.cash_movements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users only" ON public.cash_movements FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.cash_movements FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.cash_movements FOR DELETE USING (auth.role() = 'authenticated');

-- 2. FAQs
CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for FAQs
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.faqs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.faqs FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.faqs FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Store Settings
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Store Settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.store_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.store_settings FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.store_settings FOR DELETE USING (auth.role() = 'authenticated');

-- Triggers para updated_at (asume que la funcion public.handle_updated_at ya existe, o la creamos si no)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE FUNCTION public.handle_updated_at()
        RETURNS TRIGGER AS $func$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END
$$;

CREATE TRIGGER on_faqs_updated
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_store_settings_updated
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
