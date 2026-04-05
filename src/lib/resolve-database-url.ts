import path from "path";

/**
 * 로컬 SQLite는 `cwd/prisma/dev.db`. 원격(libsql://, https://)은 DATABASE_URL 그대로.
 */
export function resolveDatabaseUrl(): string {
  const env = process.env.DATABASE_URL?.trim();
  if (env && !env.startsWith("file:")) {
    return env;
  }
  return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
}
