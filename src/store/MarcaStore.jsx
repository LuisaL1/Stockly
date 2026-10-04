import { create } from "zustand";
import { crearStoreCrud } from "./crearStoreCrud";
import { BuscarMarca, EditarMarca, EliminarMarca, InsertarMarca, MostrarMarca } from "../supabase/crudMarca";

export const useMarcaStore = create(
  crearStoreCrud({
    mostrar: (id) => MostrarMarca({ id_empresa: id }),
    buscar: (id, texto) => BuscarMarca({ id_empresa: id, descripcion: texto }),
    insertar: InsertarMarca,
    editar: EditarMarca,
    eliminar: EliminarMarca,
  })
);
