import { InputText } from "../formularios/InputText";
import { Monedas, Sectores } from "../../../utils/dataEstatica";
import { v } from "../../../styles/variables";

// Campos del negocio (registro y "completa tu empresa"). Recibe register/errors de react-hook-form.
export function CamposNegocio({ register, errors, autoFocus = true }) {
  return (
    <>
      <InputText label="Nombre de tu empresa" icono={<v.iconoempresa />} error={errors.empresa?.message}>
        <input
          autoFocus={autoFocus}
          placeholder="Ej. Tienda La Esquina"
          autoComplete="organization"
          {...register("empresa", { validate: (t) => !!t?.trim() || "Escribe el nombre de tu empresa" })}
        />
      </InputText>
      <div className="doble">
        <InputText label="NIT" icono={<v.iconodocumento />} ayuda="Opcional, lo necesitas para facturar.">
          <input placeholder="900123456-7" {...register("nit")} />
        </InputText>
        <InputText label="Sector" icono={<v.iconocategorias />} error={errors.sector?.message}>
          <select {...register("sector", { required: "Elige un sector" })}>
            <option value="">Selecciona…</option>
            {Sectores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputText>
      </div>
      <div className="doble">
        <InputText label="Ciudad" icono={<v.iconodireccion />} error={errors.ciudad?.message}>
          <input
            placeholder="Ej. Armenia"
            autoComplete="address-level2"
            {...register("ciudad", { validate: (t) => !!t?.trim() || "Escribe tu ciudad" })}
          />
        </InputText>
        <InputText label="Moneda" icono={<v.iconoprecioventa />}>
          <select {...register("moneda")}>
            {Monedas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.descripcion}
              </option>
            ))}
          </select>
        </InputText>
      </div>
    </>
  );
}
