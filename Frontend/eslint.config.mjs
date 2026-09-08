import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // React 19/Next 16 habilitan estas reglas de React Compiler. La base
      // actual usa cargas asíncronas disparadas desde efectos; se conservan
      // hasta migrarlas de forma gradual sin alterar el comportamiento.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
  globalIgnores([".next/**", ".next-build/**", "node_modules/**"]),
]);
