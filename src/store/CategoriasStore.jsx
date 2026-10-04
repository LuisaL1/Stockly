import { create } from "zustand";
import { crearStoreCrud } from "./crearStoreCrud";
import {
  BuscarCategorias,
  EditarCategorias,
  EliminarCategoria,
  InsertarCategorias,
  MostrarCategorias,
} from "../supabase/crudCategorias";

export const useCategoriasStore = create(
  crearStoreCrud({
    mostrar: (id) => MostrarCategorias({ id_empresa: id }),
    buscar: (id, texto) => BuscarCategorias({ id_empresa: id, descripcion: texto }),
    insertar: InsertarCategorias,
    editar: EditarCategorias,
    eliminar: EliminarCategoria,
  })
);
