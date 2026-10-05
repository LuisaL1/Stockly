import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { MostrarConfigFacturacion } from "../supabase/crudFacturacion";
import { imagenComoDataUrl } from "../utils/imagen";

// Logo de la empresa listo para usar en la app y en los PDF: { url, dataUrl, ancho, alto } o null.
export function useLogoEmpresa() {
  const { dataempresa } = useEmpresaStore();
  const id = dataempresa?.id;
  const cfg = useQuery({
    queryKey: ["config facturacion", id],
    queryFn: () => MostrarConfigFacturacion(id),
    enabled: !!id,
  });
  const url = cfg.data?.logo_url ?? null;
  const imagen = useQuery({
    queryKey: ["logo empresa", url],
    queryFn: () => imagenComoDataUrl(url),
    enabled: !!url,
    staleTime: Infinity,
  });
  if (!url) return { logo: null, cargando: cfg.isLoading };
  return {
    logo: imagen.data ? { url, dataUrl: imagen.data.url, ancho: imagen.data.ancho, alto: imagen.data.alto } : { url },
    cargando: imagen.isLoading,
  };
}

// Medidas para el PDF: alto fijo y ancho proporcional (con tope).
export function medidasLogo(logo, alto = 44, anchoMax = 140) {
  if (!logo?.ancho || !logo?.alto) return { width: alto, height: alto };
  const ancho = Math.min(anchoMax, (alto * logo.ancho) / logo.alto);
  return { width: ancho, height: (ancho * logo.alto) / logo.ancho };
}
