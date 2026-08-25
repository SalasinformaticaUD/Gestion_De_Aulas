import { RegistrosMonitor } from "@/features/monitores/componentes/RegistrosMonitor";
export default async function PaginaRegistrosMonitor({ params }:{ params:Promise<{id:string}> }) { const { id } = await params; return <RegistrosMonitor monitorId={id} />; }
