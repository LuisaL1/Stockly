import { useState } from "react";
import styled from "styled-components";
import { useForm } from "react-hook-form";
import { InputText } from "../formularios/InputText";
import { Boton } from "../../atomos/Boton";
import { CamposNegocio } from "./CamposNegocio";
import { Alerta, Encabezado, FormAuth } from "./EstilosAuth";
import { CompletarRegistro } from "../../../supabase/crudRegistro";
import { v } from "../../../styles/variables";

// Para cuentas que existen pero aún no tienen empresa (p. ej. creadas con el registro anterior).
export function CompletarEmpresa({ email, nombres, onListo, onSalir }) {
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { nombres: nombres ?? "", moneda: "$", sector: "" } });

  async function guardar(d) {
    setError(null);
    try {
      await CompletarRegistro({
        nombres: d.nombres.trim(),
        documento: d.documento.trim(),
        empresa: d.empresa.trim(),
        nit: d.nit?.trim() || null,
        sector: d.sector,
        ciudad: d.ciudad.trim(),
        moneda: d.moneda,
      });
      await onListo();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Container>
      <div className="tarjeta">
        <Encabezado>
          <span className="icono">
            <v.iconoempresa />
          </span>
          <h1>Completa los datos de tu empresa</h1>
          <p>
            Tu cuenta <strong>{email}</strong> aún no tiene una empresa. Créala para empezar a usar Stockly.
          </p>
        </Encabezado>
        {error && <Alerta role="alert">{error}</Alerta>}
        <FormAuth onSubmit={handleSubmit(guardar)} noValidate>
          <div className="doble">
            <InputText label="Tu nombre" icono={<v.icononombre />} error={errors.nombres?.message}>
              <input {...register("nombres", { validate: (t) => !!t?.trim() || "Escribe tu nombre" })} />
            </InputText>
            <InputText label="Cédula" icono={<v.iconodocumento />} error={errors.documento?.message}>
              <input
                inputMode="numeric"
                {...register("documento", {
                  validate: (t) => /^[0-9A-Za-z.-]{5,15}$/.test(t?.trim() ?? "") || "Escribe tu número de documento",
                })}
              />
            </InputText>
          </div>
          <CamposNegocio register={register} errors={errors} autoFocus={false} />
          <Boton type="submit" tamano="lg" bloque cargando={isSubmitting} icono={<v.iconolisto />}>
            Crear mi empresa
          </Boton>
          <Boton variante="fantasma" bloque funcion={onSalir}>
            Cerrar sesión
          </Boton>
        </FormAuth>
      </div>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  background: ${({ theme }) => theme.bg};
  .tarjeta {
    width: 100%;
    max-width: 520px;
    padding: 32px 28px;
    border-radius: ${({ theme }) => theme.radiusXl};
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    box-shadow: ${({ theme }) => theme.shadowLg};
  }
`;
