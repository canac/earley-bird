import nearley from "nearley";
import nearleyCompile from "nearley/lib/compile.js";
import lint from "nearley/lib/lint.js";
import nearleyBootstrapped from "nearley/lib/nearley-language-bootstrapped.js";
import prettier from "prettier";
import { getEarleyBirdVersion } from "../version";
import generate from "./generate";

export interface CompileOptions {
  // The package name or path to import earley-bird from
  import: string;

  // Lint the compiled grammar
  lint: boolean;

  // Remove preprocessors from the compiled grammar
  ignorePreprocessors: boolean;

  // Format compile output using prettier
  format: boolean;
}

// Compile a nearley grammar into a JavaScript module that exports a parser
// defined by the nearley grammar
export function compile(
  rawGrammar: string,
  originalOptions: Partial<CompileOptions> = {}
): string {
  const options: CompileOptions = {
    import: "@canac/earley-bird",
    lint: true,
    ignorePreprocessors: false,
    format: true,
    ...originalOptions,
  };

  const parserGrammar = nearley.Grammar.fromCompiled(nearleyBootstrapped);
  const parser = new nearley.Parser(parserGrammar);
  parser.feed(rawGrammar);

  const compiled = nearleyCompile(parser.results[0], {
    version: getEarleyBirdVersion(),
    nojs: options.ignorePreprocessors,
  });

  if (options.lint) {
    lint(compiled, { out: process.stderr });
  }

  // Massage the compiled rules from the nearley format into the earley-bird format
  compiled.rules.forEach((rule: { symbols: any[] }) => {
    rule.symbols = rule.symbols.map((rawSymbol) => {
      let symbol;
      if (rawSymbol.token && rawSymbol.token.indexOf(".has(") === -1) {
        // symbol.token is the string name of a JavaScript variable declared
        // in one of the grammar JS bodies
        // Execute all of the bodies, and get the value of that token variable
        symbol = (0, eval)(compiled.body.join("\n") + rawSymbol.token);
      } else {
        symbol = rawSymbol;
      }

      if (typeof symbol === "string") {
        return `new RuleSymbol("${symbol}")`;
      } else if (symbol.token && symbol.token.indexOf(".has(") !== -1) {
        // symbol.token is the JavaScript expression string:
        //     "(<lexer>.has("<token>") ? {type: "<token>"} : <token>)"
        // Extract the token from the expression
        const matches = /type: \"(.+?)\"/.exec(symbol.token);
        if (matches) {
          const tokenName = matches[1];
          return `new TokenSymbol("${tokenName}")`;
        } else {
          throw new Error("Token doesn't match lexer.has() pattern");
        }
      } else if (symbol.literal) {
        return `new LiteralSymbol("${symbol.literal}")`;
      } else if (symbol instanceof RegExp) {
        return `new CharsetSymbol(${symbol.toString()})`;
      } else if (typeof symbol.test === "function") {
        return `new TesterSymbol(${symbol.test.toString()})`;
      } else {
        throw new Error("Unknown symbol");
      }
    });
  });

  let generated = generate(compiled, options.import);
  if (options.format) {
    generated = prettier.format(generated, { parser: "babel" });
  }

  return generated;
}
