import { colors } from "../deps.ts";

// Logs a warning message saying that you
// may have accidentally started a server with no routes
export function errorRootDirEmpty(rootDir: string): void {
  console.log("");
  error(
    `directory ${colors.bold(rootDir)} is empty - 0 routes are being served`,
  );
  console.log("");
}

export function errorDirNotFound(rootDir: string): void {
  error(`directory ${colors.bold(rootDir)} could not be found`);
}

export function errorRootDirRelative(rootDir: string): void {
  error(
    `directory ${colors.bold(rootDir)
    } is a relative path - please provide an absolute path using ${colors.bold("import.meta.resolve")
    }`,
  );
}


export function error(msg: string): void {
  console.log(colors.red(colors.bold(colors.italic("Error:"))) + " " + msg);
}
