"use client";

import type { FormEvent } from "react";
import estilos from "../SistemaVisualMonitores.module.css";

type ConsultaCodigoProps = {
  codigo: string;
  error: string;
  onCodigoChange: (codigo: string) => void;
  onSubmit: (evento: FormEvent<HTMLFormElement>) => void;
};

export function ConsultaCodigo({ codigo, error, onCodigoChange, onSubmit }: ConsultaCodigoProps) {
  return (
    <section className={`${estilos.tarjeta} ${estilos.dashboardConsulta}`}>
      <header>
        <div>
          <h2>Consulta por código</h2>
          <p>Consulta las horas y registros por día de un monitor visible para tu dependencia.</p>
        </div>
      </header>
      <form className={estilos.busquedaCodigo} onSubmit={onSubmit}>
        <label className={estilos.campoAncho}>
          <span>Código de estudiante</span>
          <input value={codigo} onChange={(evento) => onCodigoChange(evento.target.value)} placeholder="Código de estudiante" required />
        </label>
        <button className="button-primary">Consultar</button>
      </form>
      {error && <p className={`${estilos.aviso} ${estilos.avisoError}`}>{error}</p>}
    </section>
  );
}
