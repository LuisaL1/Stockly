import { create } from "zustand";
import { crearStoreCrud } from "./crearStoreCrud";
import {
  BuscarProductos,
  EditarProductos,
  EliminarProductos,
  InsertarProductos,
  MostrarProductos,
} from "../supabase/crudProductos";

export const useProductosStore = create(
  crearStoreCrud({
    mostrar: (id) => MostrarProductos({ _id_empresa: id }),
    buscar: (id, texto) => BuscarProductos({ _id_empresa: id, buscador: texto }),
    insertar: InsertarProductos,
    editar: EditarProductos,
    eliminar: EliminarProductos,
  })
);
