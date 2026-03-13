import { execSync } from "node:child_process";
import {
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import * as path from "node:path";

interface SpecifierReplacer {
    pattern: RegExp;
    apply: (prefix: string, specifier: string, suffix: string) => string;
}

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");

const run = (command: string): void => {
    execSync(command, {
        cwd: rootDir,
        stdio: "inherit",
    });
};

const walkJsFiles = (dirPath: string): string[] => {
    const entries = readdirSync(dirPath);
    let results: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            results = results.concat(walkJsFiles(fullPath));
            continue;
        }

        if (entry.endsWith(".js")) {
            results.push(fullPath);
        }
    }

    return results;
};

const ensureJsExtension = (specifier: string): string => {
    const hashIndex = specifier.indexOf("#");
    const queryIndex = specifier.indexOf("?");
    const splitIndex =
        hashIndex === -1
            ? queryIndex
            : queryIndex === -1
                ? hashIndex
                : Math.min(hashIndex, queryIndex);

    const pathname = splitIndex === -1 ? specifier : specifier.slice(0, splitIndex);
    const suffix = splitIndex === -1 ? "" : specifier.slice(splitIndex);

    if (path.extname(pathname)) {
        return specifier;
    }

    return `${pathname}.js${suffix}`;
};

const rewriteEsmRelativeSpecifiers = (esmRootDir: string): void => {
    const jsFiles = walkJsFiles(esmRootDir);
    const replacers: SpecifierReplacer[] = [
        {
            pattern: /(from\s+["'])([^"']+)(["'])/g,
            apply: (prefix, specifier, suffix) => `${prefix}${ensureJsExtension(specifier)}${suffix}`,
        },
        {
            pattern: /(import\s*\(\s*["'])([^"']+)(["']\s*\))/g,
            apply: (prefix, specifier, suffix) => `${prefix}${ensureJsExtension(specifier)}${suffix}`,
        },
        {
            pattern: /(import\s+["'])([^"']+)(["'])/g,
            apply: (prefix, specifier, suffix) => `${prefix}${ensureJsExtension(specifier)}${suffix}`,
        },
    ];

    for (const filePath of jsFiles) {
        const original = readFileSync(filePath, "utf8");
        let rewritten = original;

        for (const { pattern, apply } of replacers) {
            rewritten = rewritten.replace(
                pattern,
                (full: string, prefix: string, specifier: string, suffix: string): string => {
                    if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
                        return full;
                    }

                    return apply(prefix, specifier, suffix);
                }
            );
        }

        if (rewritten !== original) {
            writeFileSync(filePath, rewritten, "utf8");
        }
    }
};

rmSync(distDir, { recursive: true, force: true });

run("tsc -p tsconfig.build.types.json");
run("tsc -p tsconfig.build.cjs.json");
run("tsc -p tsconfig.build.esm.json");

rewriteEsmRelativeSpecifiers(path.join(distDir, "esm"));

mkdirSync(path.join(distDir, "cjs"), { recursive: true });
mkdirSync(path.join(distDir, "esm"), { recursive: true });

writeFileSync(
    path.join(distDir, "cjs", "package.json"),
    `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`,
    "utf8"
);

writeFileSync(
    path.join(distDir, "esm", "package.json"),
    `${JSON.stringify({ type: "module" }, null, 2)}\n`,
    "utf8"
);