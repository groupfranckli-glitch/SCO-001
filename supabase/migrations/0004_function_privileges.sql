-- Les politiques RLS appellent is_admin()/is_courier() pour tous les rôles, y compris anon (elles renvoient false).
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_courier() to anon, authenticated;

-- Fonctions internes : aucun appel direct depuis l'API (les triggers n'exigent pas ce privilège).
-- Conditionnel : touch_updated_at n'existe que sur une base issue de l'ancienne boutique.
do $$
declare f text;
begin
  foreach f in array array['public.current_role_name()', 'public.protect_profile_role()', 'public.touch_updated_at()'] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;
