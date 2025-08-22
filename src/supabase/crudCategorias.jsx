import { supabase } from "../index";
import Swal from "sweetalert2";

export async function InsertarCategorias(p) {
    console.log("📤 Enviando a insertarmarca:", p); 

    const { data, error } = await supabase.rpc("insertarcategorias", p);

    console.log("📥 Respuesta Supabase:", error); 

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
      text: "Ya existe una categoría con ese nombre.",
    });
  } else if (data === "insertado") {
    Swal.fire({
      icon: "success",
      title: "¡Éxito!",
      text: "Categoría registrada correctamente.",
    });
  }
}


export async function MostrarCategorias (p){
    const {data} = await supabase
    .from("categorias")
    .select()
    .eq("id_empresa",p.id_empresa)
    .order("id",{ascending:true});
    return data;
}

export async function EliminarCategoria(p){
    const {error} = await supabase
    .from ("categorias")
    .delete()
    .eq("id",p.id);
    if(error){
        alert("Error al eliminar", error.message);
    }
}
export async function EditarCategorias(p){
    const {error} = await supabase
    .from("categorias")
    .update(p)
    .eq("id",p.id);
    if (error){
        alert("Error al editar marca", error.message);
    }
}
export async function BuscarCategorias(p) {
  const { data } = await supabase
    .from("categorias")
    .select()
    .eq("id_empresa", p.id_empresa)
    .ilike("descripcion", "%" + p.descripcion + "%");

  return data;
}