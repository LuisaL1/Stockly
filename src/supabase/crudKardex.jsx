import { supabase } from "../index";
import Swal from "sweetalert2";

export async function InsertarKardex(p) {
console.log("guardando datos", p);
const { data, error } = await supabase.from("kardex").insert(p)

  console.log("Respuesta Supabase:", { data, error });

  if (error) {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: error.message,
      footer: `<a href="">Agregue una nueva descripción</a>`
    });
    return;
  }

  if (data === "duplicado") {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "Ya existe una kardex con ese nombre.",
    });
  } else if (data === "insertado") {
    Swal.fire({
      icon: "success",
      title: "¡Éxito!",
      text: "Kardex registrada correctamente.",
    });
  }
}

export async function MostrarKardex(p) {
  const { data, error } = await supabase.rpc("mostrarkardexempresa", p);

  if (error) {
    console.error("Error en MostrarKardex:", error.message);
    return [];
  }

  return data;
}

export async function EliminarKardex(p){
    const {error} = await supabase
    .from ("kardex")
    .delete()
    .eq("id",p.id);
    if(error){
        alert("Error al eliminar", error.message);
    }
}
export async function EditarKardex(p){
    const {error} = await supabase
    .from("kardex")
    .update(p)
    .eq("id",p.id);
    if (error){
        alert("Error al editar kardex", error.message);
    }
}
export async function BuscarKardex(p) {
  const { data } = await supabase.rpc("buscarkardexempresa", p)
  return data;
}

