import { redirect } from "next/navigation";

export default function MonitorsMaintenancePage() {
  redirect("/login?app=monitores");
}
