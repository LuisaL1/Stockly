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
    const {error, data} = await supabase
    .from("Usuarios")
    .select()
    .eq("idauth", idAuthSupabase)
    .maybeSingle();
    if (data){
    return data;
  }
};
export const MostrarUsuariosTodos = async (p) => {
    const {error, data} = await supabase.rpc("mostrarpersonal", p);
    if (data){
    return data;
  }
};
export async function EliminarUsuarios(p){
    const {error} = await supabase
    .from ("Usuarios")
    .delete()
    .eq("id",p.id);
    if(error){
        alert("Error al eliminar", error.message);
    }
}
export async function EditarUsuarios(p){
    const {error} = await supabase
    .from("Usuarios")
    .update(p)
    .eq("id",p.id);
    if (error){
        alert("Error al editar marca", error.message);
    }
}
export async function BuscarUsuarios(p) {
  console.log("info: "+p)
  const { data } = await supabase.rpc("buscarpersonal", p);
  console.log("Hola"+data);
  return data;
}
// tabla asignaciones
export const InsertarAsignaciones =async (p)=>{
    const { error} = await supabase.from("asignarempresa").insert(p).maybeSingle();
    if (error){
        Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Error al insertar usuario!"+error.message
        });
    }
};
//tabla permisos
export const InsertarPermisos =async (p)=>{
    const { error} = await supabase.from("permisos").insert(p).maybeSingle();
    if (error){
        Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Error al insertar usuario!"+error.message
        });
    }
};
// mostrar los permisos
export async function MostrarPermisos(p) {
  const { data } = await supabase
    .from("permisos")
    .select(`id, id_usuario, idmodulo, modulos(nombre)`)
    .eq("id_usuario", p.id_usuario)
  console.log(data)
  console.log("Parametro recibido:", p);
  return data;
}
export async function EliminarPermisos(p){
    const {error} = await supabase
    .from ("permisos")
    .delete()
    .eq("id_usuario",p.id_usuario);
    if(error){
        alert("Error al eliminar", error.message);
    }
}

export async function MostrarModulos(){
    const {data} = await supabase.from ("modulos").select();
    return data;
}