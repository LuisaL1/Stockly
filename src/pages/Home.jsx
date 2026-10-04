import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HomeTemplate } from "../Components/templatesReact/HomeTemplate";
import { useEmpresaStore } from "../store/EmpresaStore";
import { ReportStockBajoMinimo } from "../supabase/crudProductos";
import { MostrarDashboard } from "../supabase/crudDashboard";
import { MostrarSucursales } from "../supabase/crudSucursales";

export function Home() {
  const { dataempresa } = useEmpresaStore();
  const [dias, setDias] = useState(30);
  const [idSucursal, setIdSucursal] = useState("");
  const id = dataempresa?.id;
  const enabled = id != null;

  const dashboard = useQuery({
    queryKey: ["dashboard", id, dias, idSucursal],
    queryFn: () => MostrarDashboard(id, dias, idSucursal || null),
    enabled,
    placeholderData: (previo) => previo,
  });
  const sucursales = useQuery({ queryKey: ["sucursales", id], queryFn: () => MostrarSucursales(id), enabled });
  const bajoMinimo = useQuery({
    queryKey: ["inicio", "bajo minimo", id],
    queryFn: () => ReportStockBajoMinimo({ id_empresa: id }),
    enabled,
  });

  return (
    <HomeTemplate
      empresa={dataempresa}
      dashboard={dashboard}
      bajoMinimo={bajoMinimo}
      dias={dias}
      setDias={setDias}
      sucursales={sucursales.data ?? []}
      idSucursal={idSucursal}
      setIdSucursal={setIdSucursal}
    />
  );
}
