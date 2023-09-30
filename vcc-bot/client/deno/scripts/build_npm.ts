import { build, emptyDir } from "https://deno.land/x/dnt@0.32.1/mod.ts"

await emptyDir("./npm")

await build({
  entryPoints: ["./src/mod.ts"],
  outDir: "./npm",
  shims: {
    // see JS docs for overview and more options
    webSocket: true
  },
  package: {
    // package.json properties
    name: "vcc_bot",
    version: Deno.args[0]?.replace(/^v/, ""),
    description: "Writing vcc bots with node",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/vcc-chat/vcc-bot.git"
    },
    bugs: {
      url: "https://github.com/vcc-chat/vcc-bot/issues"
    },
    dependencies: {
      "uuid": "^9.0.0"
    },
    devDependencies: {
      "@types/uuid": "^9.0.0"
    }
  },
  mappings: {
    "./src/uuid.deno.ts": "./src/uuid.node.ts"
  }
})

// post build steps
Deno.copyFileSync("../../LICENSE", "npm/LICENSE")
Deno.copyFileSync("README.md", "npm/README.md")