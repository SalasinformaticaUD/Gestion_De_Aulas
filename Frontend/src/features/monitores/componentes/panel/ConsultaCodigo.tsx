import estilos from "../SistemaVisualMonitores.module.css";

type ConsultaCodigoProps = {
  busqueda: string;
  total: number;
  visibles: number;
  onBusquedaChange: (busqueda: string) => void;
};

export function ConsultaCodigo({ busqueda, total, visibles, onBusquedaChange }: ConsultaCodigoProps) {
  return (
    <section className={`${estilos.tarjeta} ${estilos.dashboardConsulta}`}>
      <header>
        <div>
          <h2>Buscar monitores</h2>
          <p>Filtra automáticamente la lista de monitores por nombre o código estudiantil.</p>
        </div>
      </header>
      <div className={estilos.busquedaCodigo}>
        <label className={estilos.campoAncho}>
          <span>Nombre o código</span>
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => onBusquedaChange(evento.target.value)}
            placeholder="Escribe un nombre o código de estudiante"
            autoComplete="off"
          />
        </label>
        {busqueda && <button type="button" className={estilos.botonSecundario} onClick={() => onBusquedaChange("")}>Limpiar</button>}
        <span className={estilos.contadorBusqueda}>{visibles} de {total} monitor(es)</span>
      </div>
    </section>
  );
}
