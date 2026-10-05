-- =====================================================================
-- Stockly v4.2: invitaciones al equipo por correo.
--
-- La Edge Function "invitar-usuario" crea a la persona con estado "invitado".
-- Cuando acepta la invitación y crea su contraseña, la app llama a
-- stockly_activar_invitacion() y pasa a "activo".
-- =====================================================================

create or replace function public.stockly_activar_invitacion()
returns void
language sql security definer set search_path = public
as $$
  update "Usuarios" set estado = 'activo'
   where idauth::text = auth.uid()::text and estado = 'invitado';
$$;
grant execute on function public.stockly_activar_invitacion() to authenticated;
