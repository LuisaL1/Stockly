import { supabase } from "../index";
import Swal from "sweetalert2";

export async function InsertarProductos(p) {
    console.log("Enviando a insertarproductos:", p); 
const { data, error } = await supabase.rpc("insertarproductos", p);

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
      text: "Ya existe una productos con ese nombre.",
    });
  } else if (data === "insertado") {
    Swal.fire({
      icon: "success",
      title: "¡Éxito!",
      text: "Marca registrada correctamente.",
    });
  }
}

export async function MostrarProductos (p){
    const {data} = await supabase
    .from("productos")
    .select()
    .eq("id_empresa",p.id_empresa)
    .order("id",{ascending:true});
    return data;
}

export async function EliminarProductos(p){
    const {error} = await supabase
    .from ("productos")
    .delete()
    .eq("id",p.id);
    if(error){
        alert("Error al eliminar", error.message);
    }
}
export async function EditarProductos(p){
    const {error} = await supabase
    .from("productos")
    .update(p)
    .eq("id",p.id);
    if (error){
        alert("Error al editar productos", error.message);
    }
}
export async function BuscarProductos(p) {
  const { data } = await supabase
    .from("productos")
    .select()
    .eq("id_empresa", p.id_empresa)
    .ilike("descripcion", "%" + p.descripcion + "%");

  return data;
}
