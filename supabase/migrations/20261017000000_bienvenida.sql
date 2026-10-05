-- =====================================================================
-- Stockly v4.3: correo de bienvenida al crear la empresa.
--
-- La Edge Function "bienvenida" envía el correo una sola vez por empresa
-- (al dueño) y marca la fecha aquí. La app la llama después de crear la empresa.
-- =====================================================================

alter table public."Empresa" add column if not exists bienvenida_enviada_en timestamptz;
