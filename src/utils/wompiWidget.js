// Carga el widget de Wompi una sola vez y lo abre en modo "tokenizar": la persona escribe su
// tarjeta (o Nequi) dentro de la ventana de Wompi y recibimos solo un token. No se cobra nada.
let carga = null;

function cargarWidget() {
  if (window.WidgetCheckout) return Promise.resolve();
  carga ??= new Promise((resolver, rechazar) => {
    const script = document.createElement("script");
    script.src = "https://checkout.wompi.co/widget.js";
    script.async = true;
    script.onload = () => resolver();
    script.onerror = () => {
      carga = null;
      rechazar(new Error("No se pudo cargar Wompi. Revisa tu conexión e intenta de nuevo."));
    };
    document.head.appendChild(script);
  });
  return carga;
}

// Abre la ventana de Wompi. alTerminar({ token, type }) se llama solo si la persona termina;
// si cierra la ventana no pasa nada (por eso no se espera una promesa).
export async function abrirTokenizacion(llavePublica, alTerminar) {
  await cargarWidget();
  const widget = new window.WidgetCheckout({ publicKey: llavePublica, widgetOperation: "tokenize" });
  widget.open((resultado) => {
    if (resultado?.payment_source?.token) alTerminar(resultado.payment_source);
  });
}
