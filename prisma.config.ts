import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: "postgresql://arkadians:arkadians@localhost:5432/arkadians_crm?schema=public",
  },
})
