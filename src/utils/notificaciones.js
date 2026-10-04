import Swal from "sweetalert2";

const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export function notificarExito(mensaje) {
  return toast.fire({ icon: "success", title: mensaje });
}

export function notificarError(mensaje, detalle) {
  return Swal.fire({
    icon: "error",
    title: mensaje,
    text: detalle,
    confirmButtonColor: "#8800B3",
    confirmButtonText: "Entendido",
  });
}

export function notificarAviso(mensaje, detalle) {
  return Swal.fire({
    icon: "info",
    title: mensaje,
    text: detalle,
    confirmButtonColor: "#8800B3",
    confirmButtonText: "Entendido",
  });
}

export async function confirmarEliminacion(texto = "Esta acción no se puede deshacer.") {
  const { isConfirmed } = await Swal.fire({
    icon: "warning",
    title: "¿Eliminar registro?",
    text: texto,
    showCancelButton: true,
    confirmButtonColor: "#DC2626",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
    focusCancel: true,
  });
  return isConfirmed;
}
