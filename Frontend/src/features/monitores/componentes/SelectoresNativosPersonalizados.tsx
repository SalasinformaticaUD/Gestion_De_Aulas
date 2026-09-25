"use client";

import { useEffect } from "react";
import estilos from "./SistemaVisualMonitores.module.css";

/** Sustituye los selectores nativos de Gestión de Monitores por el menú institucional. */
export function SelectoresNativosPersonalizados() {
  useEffect(() => {
    const cierres = new Set<() => void>();
    const cerrarTodos = () => cierres.forEach((cerrar) => cerrar());
    const mejorar = (select: HTMLSelectElement) => {
      if (select.dataset.selectorInstitucional === "true") return;
      select.dataset.selectorInstitucional = "true";
      select.classList.add(estilos.selectNativoOculto);

      const contenedor = document.createElement("div");
      contenedor.className = estilos.selectorInstitucional;
      const activador = document.createElement("button");
      activador.type = "button";
      activador.className = estilos.activadorSelectorInstitucional;
      activador.setAttribute("aria-haspopup", "listbox");
      activador.setAttribute("aria-expanded", "false");
      activador.setAttribute("aria-label", select.getAttribute("aria-label") || select.closest("label")?.querySelector("span")?.textContent || "Seleccionar opción");
      const menu = document.createElement("div");
      menu.className = estilos.opcionesSelectorInstitucional;
      menu.setAttribute("role", "listbox");
      menu.hidden = true;
      contenedor.append(activador, menu);
      select.insertAdjacentElement("afterend", contenedor);

      const sincronizar = () => {
        activador.disabled = select.disabled;
        const seleccionada = select.selectedOptions[0];
        activador.textContent = seleccionada?.textContent?.trim() || "Seleccionar opción";
        const flecha = document.createElement("span");
        flecha.textContent = menu.hidden ? "▾" : "▴";
        flecha.setAttribute("aria-hidden", "true");
        activador.append(flecha);
        menu.replaceChildren(...Array.from(select.options).map((opcion) => {
          const boton = document.createElement("button");
          boton.type = "button";
          boton.textContent = opcion.textContent;
          boton.disabled = opcion.disabled;
          boton.setAttribute("role", "option");
          boton.setAttribute("aria-selected", String(opcion.selected));
          if (opcion.selected) boton.className = estilos.opcionSelectorInstitucionalActiva;
          boton.addEventListener("click", () => {
            select.value = opcion.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            cerrar();
          });
          return boton;
        }));
      };
      const cerrar = () => { if (!menu.hidden) { menu.hidden = true; activador.setAttribute("aria-expanded", "false"); sincronizar(); } };
      activador.addEventListener("click", () => { const abrir = menu.hidden; cerrarTodos(); if (abrir) { menu.hidden = false; activador.setAttribute("aria-expanded", "true"); sincronizar(); } });
      select.addEventListener("change", sincronizar);
      const observador = new MutationObserver(sincronizar);
      observador.observe(select, { attributes: true, childList: true, subtree: true });
      cierres.add(cerrar);
      sincronizar();
      return () => { cierres.delete(cerrar); observador.disconnect(); contenedor.remove(); select.classList.remove(estilos.selectNativoOculto); delete select.dataset.selectorInstitucional; };
    };
    const limpiar = new Map<HTMLSelectElement, () => void>();
    const explorar = () => document.querySelectorAll<HTMLSelectElement>("main select").forEach((select) => { if (!limpiar.has(select)) { const dispose = mejorar(select); if (dispose) limpiar.set(select, dispose); } });
    explorar();
    const observador = new MutationObserver(explorar);
    observador.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    const fuera = (event: MouseEvent) => { if (!(event.target instanceof Element) || !event.target.closest(`.${estilos.selectorInstitucional}`)) cerrarTodos(); };
    const tecla = (event: KeyboardEvent) => { if (event.key === "Escape") cerrarTodos(); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => { observador.disconnect(); document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", tecla); limpiar.forEach((dispose) => dispose()); };
  }, []);
  return null;
}