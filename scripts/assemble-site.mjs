#!/usr/bin/env node
/* Copies only the files that should be public into ./_site (the folder the
   Pages deployment uploads). Source templates, scripts, docs, email templates,
   workflows and the .git folder never reach the live site. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "_site");
const INCLUDE = [
  "index.html", "packages.html", "projects.html", "fa", "assets", "css", "js", "data", "lang",
  "manifest.json", "robots.txt", "sitemap.xml", ".nojekyll", "CNAME",
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const name of INCLUDE) {
  const src = path.join(ROOT, name);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(OUT, name), { recursive: true });
}
// custom 404 (GitHub Pages serves /404.html for any unknown URL)
if (fs.existsSync(path.join(ROOT, "404.html"))) fs.copyFileSync(path.join(ROOT, "404.html"), path.join(OUT, "404.html"));
console.log("Assembled", OUT);
