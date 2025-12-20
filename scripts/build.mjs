import { build } from "esbuild";

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "esm",
  target: "es2019",
  outfile: "assets/main.js",
  sourcemap: true,
});
