import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "assets", "roomies-app-icon.png");
const publicDir = join(root, "public");
const appDir = join(root, "app");
const tmpDir = join(root, ".tmp-icons");

if (!existsSync(source)) {
  console.error(`Missing source icon: ${source}`);
  process.exit(1);
}

mkdirSync(publicDir, { recursive: true });
mkdirSync(appDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const square = join(tmpDir, "square.png");
copyFileSync(source, square);

const width = Number(
  execSync(`sips -g pixelWidth "${square}"`, { encoding: "utf8" })
    .match(/pixelWidth: (\d+)/)?.[1],
);
const height = Number(
  execSync(`sips -g pixelHeight "${square}"`, { encoding: "utf8" })
    .match(/pixelHeight: (\d+)/)?.[1],
);
const side = Math.min(width, height);
execSync(`sips -c ${side} ${side} "${square}"`, { stdio: "inherit" });

const master = join(tmpDir, "master.png");
copyFileSync(square, master);
execSync(`sips -z 1024 1024 "${master}"`, { stdio: "inherit" });

const outputs = [
  { size: 32, path: join(appDir, "icon.png") },
  { size: 180, path: join(appDir, "apple-icon.png") },
  { size: 192, path: join(publicDir, "icon-192.png") },
  { size: 512, path: join(publicDir, "icon-512.png") },
];

for (const { size, path } of outputs) {
  const out = join(tmpDir, `icon-${size}.png`);
  copyFileSync(master, out);
  execSync(`sips -z ${size} ${size} "${out}"`, { stdio: "inherit" });
  copyFileSync(out, path);
  console.log(`Wrote ${path.replace(root + "/", "")}`);
}

rmSync(tmpDir, { recursive: true, force: true });
