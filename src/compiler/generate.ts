type Rule = {
  id: number;
  name: string;
  symbols: Array<string>;
  postprocess: string | { builtin: string } | undefined;
};

type Parser = {
  rules: Rule[];
  body: string[];
  customTokens: string[];
  config: { preprocessor?: string; lexer?: string };
  macros: Record<string, unknown>;
  start: string;
  version: string;
};

const builtinPostprocessors = new Map([
  ["joiner", "(d) => d.join('')"],
  ["arrconcat", "(d) => [d[0]].concat(d[1])"],
  ["arrpush", "(d) => d[0].concat([d[1]])"],
  ["nuller", "() => null"],
  ["id", "(d) => d[0]"],
]);

function serializeRule(rule: Rule): string {
  if (typeof rule.postprocess === "object" && "builtin" in rule.postprocess) {
    rule.postprocess = builtinPostprocessors.get(rule.postprocess.builtin);
  } else if (
    typeof rule.postprocess === "string" &&
    rule.postprocess.trim() === "id"
  ) {
    rule.postprocess = builtinPostprocessors.get("id");
  }

  const symbols = rule.symbols.join(", ");
  const postprocess = rule.postprocess
    ? rule.postprocess.toString()
    : "undefined";
  return `{ name: "${rule.name}", symbols: [${symbols}], postprocess: ${postprocess} }`;
}

export default function generate(parser: Parser, importName: string): string {
  const rules = parser.rules.map((rule) => serializeRule(rule));
  return `// Generated automatically for earley-bird, version ${parser.version}
// http://github.com/canac/earley-bird
import { Grammar, Parser, RuleSymbol, CharsetSymbol, LiteralSymbol, TesterSymbol, TokenSymbol } from '${importName}';
${parser.body.join("\n")}
const grammar = new Grammar([${rules}], "${parser.start}");

const parser = new Parser(grammar, ${parser.config.lexer ?? "undefined"});

export default parser;
`;
}
