-- Dropping insecure RLS policies for store_settings
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.store_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.store_settings;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.store_settings;

-- Adding secure RLS policies for store_settings
CREATE POLICY "admin_manage_store_settings"
ON public.store_settings
FOR ALL
USING (public.es_admin())
WITH CHECK (public.es_admin());

-- Dropping insecure RLS policies for faqs
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.faqs;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.faqs;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.faqs;

-- Adding secure RLS policies for faqs
CREATE POLICY "admin_manage_faqs"
ON public.faqs
FOR ALL
USING (public.es_admin())
WITH CHECK (public.es_admin());

-- Dropping insecure RLS policies for cash_movements
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.cash_movements;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.cash_movements;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.cash_movements;
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON public.cash_movements;

-- Adding secure RLS policies for cash_movements
CREATE POLICY "admin_manage_cash_movements"
ON public.cash_movements
FOR ALL
USING (public.es_admin())
WITH CHECK (public.es_admin());
