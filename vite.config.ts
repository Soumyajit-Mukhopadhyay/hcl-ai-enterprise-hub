import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // In some preview environments, Vite's normal env injection can be flaky.
  // We *only* inline vars when we can actually resolve them, so we never
  // override existing working env values with empty strings.
  const loaded = loadEnv(mode, process.cwd(), "");

  const resolveVar = (key: string) => {
    return (loaded as Record<string, string | undefined>)[key] ??
      (process.env as Record<string, string | undefined>)[key] ??
      undefined;
  };

  const define: Record<string, string> = {};

  const supabaseUrl = resolveVar("VITE_SUPABASE_URL");
  const supabaseKey = resolveVar("VITE_SUPABASE_PUBLISHABLE_KEY");
  const supabaseProjectId = resolveVar("VITE_SUPABASE_PROJECT_ID");

  if (supabaseUrl) define["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(supabaseUrl);
  if (supabaseKey) define["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(supabaseKey);
  if (supabaseProjectId) define["import.meta.env.VITE_SUPABASE_PROJECT_ID"] = JSON.stringify(supabaseProjectId);

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define,
  };
});

