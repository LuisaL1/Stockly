import{supabase} from "../index"
import Swal from 'sweetalert2';
import { ObtenerIdAuthSupabase } from "./globalSupabase";
export const InsertarUsuarios =async (p)=>{
    const {data, error} = await supabase.from("Usuarios").insert(p).select().maybeSingle();
    if (error){
        Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Error al insertar usuario!"+error.message
        });
    }
    if (data) return data;
}
export const MostrarUsuarios = async () => {
  const idAuthSupabase = await ObtenerIdAuthSupabase();

  if (!idAuthSupabase) {
    console.warn("No hay sesión activa, redirigiendo al login...");
    return null; 
  }

  const { error, data } = await supabase
    .from("Usuarios")
    .select()
    .eq("idauth", idAuthSupabase)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data || null;
};
