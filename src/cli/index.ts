#!/usr/bin/env node
import { Command } from "commander";
import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { Writable } from "node:stream";
import { compile } from "../compiler/compile";
import { getEarleyBirdVersion } from "../version";

const program = new Command();
program
  .name("earley-bird")
  .description("Compile Nearley grammar file to earley-bird parser")
  .version(getEarleyBirdVersion(), "-v, --version");

program
  .command("compile")
  .argument("<input grammar file>")
  .option(
    "-d, --outdir [directory]",
    "Directory to write compiled grammar to (defaults to input grammar directory)"
  )
  .option(
    "-o, --outfile [filename]",
    "Filename of the compiled grammar (defaults to input grammar filename with js extension)"
  )
  .option(
    "-i, --import [path/package]",
    "Path to import earley-bird package from"
  )
  .option("-q, --quiet", "Suppress linter")
  .option("--nojs", "Do not compile postprocessors")
  .action((inputFile: string, options) => {
    const input = readFileSync(inputFile, "utf8");
    const output = compile(input, {
      ...(options.import ? { import: options.import } : {}),
      import: options.import ?? "@canac/earley-bird",
      lint: !options.quiet,
      ignorePreprocessors: options.nojs,
      format: true,
    });

    // Calculate where to write the compiled grammar to
    const outputStream: Writable = (() => {
      if (options.outfile === "-") {
        return process.stdout;
      }

      const outputDir = options.outdir ?? dirname(inputFile);
      const outputFile = join(
        outputDir,
        options.outfile ?? basename(inputFile, ".ne") + ".js"
      );

      mkdirSync(outputDir, { recursive: true });
      process.stderr.write(
        `Writing compiled grammar to ${resolve(outputFile)}\n`
      );
      return createWriteStream(outputFile);
    })();

    outputStream.write(output);
  });

program
  .command("test")
  .argument("<compiled grammar file>")
  .argument("<test string>")
  .action(async (grammarFile: string, testString: string) => {
    const { default: parser } = await import(resolve(grammarFile));
    console.log(parser.parse(testString));
  });

program.parse();
