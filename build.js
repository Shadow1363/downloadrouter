const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = __dirname;
const projectName = path.basename(projectRoot);
const buildDir = path.join(projectRoot, "build");
const outputZipPath = path.join(buildDir, `${projectName}.zip`);

fs.mkdirSync(buildDir, { recursive: true });

if (fs.existsSync(outputZipPath)) {
  fs.unlinkSync(outputZipPath);
}

const findArgs = [
  ".",
  "-type",
  "f",
  "-not",
  "-path",
  "./.git/*",
  "-not",
  "-path",
  "./.git/**",
  "-not",
  "-name",
  ".DS_Store",
  "-not",
  "-path",
  "./build/*",
  "-not",
  "-path",
  "./cover/*",
  "-not",
  "-path",
  "./build.js",
  "-not",
  "-path",
  "./.gitignore",
  "-not",
  "-path",
  `./build/${path.basename(outputZipPath)}`,
  "-print",
];

const findResult = spawnSync("find", findArgs, {
  cwd: projectRoot,
  encoding: "utf8",
});

if (findResult.error) {
  throw findResult.error;
}

if (findResult.status !== 0) {
  process.exit(findResult.status ?? 1);
}

const fileList = findResult.stdout
  .split(/\r?\n/)
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => (p.startsWith("./") ? p.slice(2) : p))
  .join("\n");

const zipResult = spawnSync("zip", ["-q", outputZipPath, "-@"], {
  cwd: projectRoot,
  input: fileList.length ? `${fileList}\n` : "",
  stdio: ["pipe", "inherit", "inherit"],
});

if (zipResult.error) {
  throw zipResult.error;
}

if (zipResult.status !== 0) {
  process.exit(zipResult.status ?? 1);
}

process.stdout.write(`Created ${path.relative(projectRoot, outputZipPath)}\n`);
