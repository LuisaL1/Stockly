import{supabase} from "../index"
import Swal from 'sweetalert2';
import { ObtenerIdAuthSupabase } from "./globalSupabase";
export const MostrarEmpresa = async (p) => {
  const { data, error } = await supabase
    .from("asignarempresa")
    .select("Empresa(id,nombre,simbolomoneda)")
    .eq("id_usuario", p.idusuario)
    .maybeSingle();

  if (error) {
    console.error("Error al obtener la empresa:", error);
    return null;
  }


  return data?.Empresa ?? null;
};


export const ContarUsuariosXempresa = async(p) => {
  const { data, error } = await supabase.rpc(
    "contar_usuarios_por_empresa",
    { _id_empresa: p._id_empresa }
  );
  if (data) return data;
};
