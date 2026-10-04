import { create } from "zustand";
import { crearStoreCrud } from "./crearStoreCrud";
import { BuscarKardex, EditarKardex, EliminarKardex, InsertarKardex, MostrarKardex } from "../supabase/crudKardex";

export const useKardexStore = create(
  crearStoreCrud({
    mostrar: (id) => MostrarKardex({ _id_empresa: id }),
    buscar: (id, texto) => BuscarKardex({ _id_empresa: id, buscador: texto }),
    insertar: InsertarKardex,
    editar: EditarKardex,
    eliminar: EliminarKardex,
  })
);
