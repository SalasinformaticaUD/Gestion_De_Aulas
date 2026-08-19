export function DashboardView() {
  return (
    <>
      <section className="page-heading">
        <div><h1>Panel de control operativo</h1><p>Vista consolidada de la operación diaria de las Aulas de Software.</p></div>
        <span className="live-status">Actualización en tiempo real</span>
      </section>
      <section className="metrics" aria-label="Indicadores operativos">
        <article className="metric metric-success"><strong>8</strong><span>de 20 aulas</span><b>Aulas disponibles</b></article>
        <article className="metric metric-info"><strong>7</strong><span>bloque actual</span><b>Clases en curso</b></article>
        <article className="metric metric-violet"><strong>3</strong><span>activas ahora</span><b>Prácticas libres</b></article>
        <article className="metric metric-warning"><strong>3</strong><span>de 10 equipos</span><b>Audiovisuales prestados</b></article>
      </section>
      <section className="dashboard-placeholder"><h2>Panel principal</h2><p>Los indicadores y sugerencias se conectarán a la API de Gestión de Aulas en la siguiente etapa.</p></section>
    </>
  );
}
