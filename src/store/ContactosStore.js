import { create } from "zustand";
import { crearStoreCrud } from "./crearStoreCrud";
import { crudClientes, crudProveedores } from "../supabase/crudContactos";

export const useClientesStore = create(crearStoreCrud(crudClientes));
export const useProveedoresStore = create(crearStoreCrud(crudProveedores));
