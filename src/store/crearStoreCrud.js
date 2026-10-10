// Fábrica para los stores de catálogos (marca, categorías, productos).
// Guarda la lista actual, el texto del buscador y la empresa activa, y recarga
// la lista automáticamente después de insertar, editar o eliminar.
export function crearStoreCrud({ mostrar, buscar, insertar, editar, eliminar }) {
  return (set, get) => {
    const conRecarga = (fn) => async (...args) => {
      const ok = await fn(...args);
      if (ok) await get().recargar();
      return ok;
    };

    return {
      data: [],
      buscador: "",
      idEmpresa: null,
      setBuscador: (texto) => set({ buscador: texto }),
      // Carga la lista completa o filtrada según el texto del buscador.
      Cargar: async (idEmpresa, texto = "") => {
        const data = texto ? await buscar(idEmpresa, texto) : await mostrar(idEmpresa);
        set({ data, idEmpresa });
        return data;
      },
      recargar: async () => {
        const { idEmpresa, buscador, Cargar } = get();
        if (idEmpresa != null) await Cargar(idEmpresa, buscador);
      },
      Insertar: conRecarga(insertar),
      Editar: conRecarga(editar),
      Eliminar: conRecarga(eliminar),
    };
  };
}
