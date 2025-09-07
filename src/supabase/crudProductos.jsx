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
    const {data} = await supabase.rpc("mostrarproductos", p)
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
  const { data, error } = await supabase.rpc("buscarproductos", {
    _id_empresa: p.id_empresa || p._id_empresa,   // soporta ambas formas
    buscador: p.descripcion || p.buscador || ""   // soporta ambas formas
  });
  return data;
}

// reportes
export async function ReportStockProductosTodos(p){
const {data, error} = await supabase
.from("productos")
.select()
.eq("id_empresa", p.id_empresa);
    if (error){
        return;
    }
return data;
}
export async function ReportStockXProducto(p){
const {data, error} = await supabase
.from("productos")
.select()
.eq("id_empresa", p.id_empresa)
.eq("id", p.id);
    if (error){
        return;
    }
return data;
}
export async function ReportStockBajoMinimo(p){
const {data, error} = await supabase.rpc("reportproductosbajominimo", p)
    if (error){
        return;
    }
return data;
}
export async function ReportKardexEntradaSalida(p){
const {data, error} = await supabase.rpc("mostrarkardexempresa", p)
    if (error){
        return;
    }
return data;
}
export async function ReportInventarioValorado(p){
const {data, error} = await supabase.rpc("inventariovalorado", p)
    if (error){
        return;
    }
return data;
}

  

