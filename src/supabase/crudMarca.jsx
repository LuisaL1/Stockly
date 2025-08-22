import { supabase } from "../index";
import Swal from "sweetalert2";

export async function InsertarMarca(p) {
    console.log("Enviando a insertarmarca:", p); 
const { data, error } = await supabase.rpc("insertarmarca", p);

  console.log("Respuesta Supabase:", { data, error });

  if (error) {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: error.message,
    });
    return;
  }

  if (data === "duplicado") {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "Ya existe una marca con ese nombre.",
    });
  } else if (data === "insertado") {
    Swal.fire({
      icon: "success",
      title: "¡Éxito!",
      text: "Marca registrada correctamente.",
    });
  }
}

export async function MostrarMarca (p){
    const {data} = await supabase
    .from("marca")
    .select()
    .eq("id_empresa",p.id_empresa)
    .order("id",{ascending:true});
    return data;
}

export async function EliminarMarca(p){
    const {error} = await supabase
    .from ("marca")
    .delete()
    .eq("id",p.id);
    if(error){
        alert("Error al eliminar", error.message);
    }
}
export async function EditarMarca(p){
    const {error} = await supabase
    .from("marca")
    .update(p)
    .eq("id",p.id);
    if (error){
        alert("Error al editar marca", error.message);
    }
}
export async function BuscarMarca(p) {
  const { data } = await supabase
    .from("marca")
    .select()
    .eq("id_empresa", p.id_empresa)
    .ilike("descripcion", "%" + p.descripcion + "%");

  return data;
}

