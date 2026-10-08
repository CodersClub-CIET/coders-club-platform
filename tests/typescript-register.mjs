// Test-only TypeScript support; never imported by application entry points.
// Node >=22.15 (or >=23.5) provides synchronous module hooks.
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceRoots = ["lib", "app/lib", "app/types"].map((dir) =>
  path.join(root, dir) + path.sep
);
const isSource = (filename) => sourceRoots.some((dir) => filename.startsWith(dir));

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code !== "ERR_MODULE_NOT_FOUND" ||
        !context.parentURL?.startsWith("file:") ||
        !/^\.\.?\//.test(specifier) ||
        path.extname(specifier)
      ) {
        throw error;
      }
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      if (isSource(base)) {
        for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (existsSync(base + suffix)) {
            return nextResolve(pathToFileURL(base + suffix).href, context);
          }
        }
      }
      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:")) {
      const filename = fileURLToPath(url);
      if (isSource(filename) && /\.tsx?$/.test(filename)) {
        const result = ts.transpileModule(readFileSync(filename, "utf8"), {
          fileName: filename,
          reportDiagnostics: true,
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
            inlineSourceMap: true,
            inlineSources: true,
          },
        });
        const errors = (result.diagnostics ?? []).filter(
          (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
        );
        if (errors.length) {
          throw new Error(ts.formatDiagnostics(errors, {
            getCurrentDirectory: () => root,
            getCanonicalFileName: (name) => name,
            getNewLine: () => "\n",
          }));
        }
        return { format: "module", source: result.outputText, shortCircuit: true };
      }
    }
    return nextLoad(url, context);
  },
});
