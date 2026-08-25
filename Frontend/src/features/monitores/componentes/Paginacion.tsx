type Propiedades = { pagina:number; totalPaginas:number; anterior:()=>void; siguiente:()=>void; total:number };

export function Paginacion({ pagina, totalPaginas, anterior, siguiente, total }: Propiedades) {
  return <footer className="paginacion-monitores"><span>Página {pagina} de {totalPaginas} · {total} registro(s)</span><div><button type="button" onClick={anterior} disabled={pagina <= 1}>Anterior</button><button type="button" onClick={siguiente} disabled={pagina >= totalPaginas}>Siguiente</button></div></footer>;
}
