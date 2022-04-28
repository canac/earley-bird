import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { compile } from "../src/compiler/compile";
import { Parser } from "../src/index";

async function generateParser(grammarFilename: string): Promise<Parser> {
  const inputFilename = resolve(
    fileURLToPath(import.meta.url),
    `../grammars/${grammarFilename}`
  );
  const input = await readFile(inputFilename, "utf8");
  const output = compile(input, {
    import: "./src/index",
  });
  // Replace the .ne extension with .js
  const outputFilename = inputFilename.slice(0, -2) + "js";
  await writeFile(outputFilename, output);
  const { default: parser } = (await import(outputFilename)) as {
    default: Parser;
  };
  return parser;
}

describe("Parser examples", () => {
  test("nullable whitespace bug", async () => {
    const parser = await generateParser("whitespace.ne");
    expect(parser.parse("(x)")).toEqual({
      success: true,
      ambiguous: false,
      result: [[["(", null, [[[["x"]]]], null, ")"]]],
      additionalResults: [],
    });
  });

  test("parentheses", async () => {
    const parser = await generateParser("parentheses.ne");

    const passCases = [
      "()",
      "[(){}<>]",
      "[(((<>)()({})())(()())(())[])]",
      "<<[([])]>([(<>[]{}{}<>())[{}[][]{}{}[]<>[]{}<>{}<>[]<>{}()][[][][]()()()]({})<[]>{(){}()<>}(<>[])]())({})>",
    ];
    passCases.forEach((passCase) => {
      expect(parser.parse(passCase)).toMatchObject({
        success: true,
        ambiguous: false,
      });
    });

    const invalidCases = [" ", "[}", "[(){}><]", "(((())))(()))"];
    invalidCases.forEach((invalidCase) => {
      expect(parser.parse(invalidCase)).toEqual({
        success: false,
        failureType: "invalid",
      });
    });

    const incompleteCases = ["", "((((())))(())()"];
    incompleteCases.forEach((incompleteCase) => {
      expect(parser.parse(incompleteCase)).toMatchObject({
        success: false,
        failureType: "incomplete",
      });
    });
  });

  test("tokens", async () => {
    const parser = await generateParser("token.ne");
    expect(parser.parse([123, 456, " ", 789])).toMatchObject({
      success: true,
      ambiguous: false,
      result: [123, [[456, " ", 789]]],
    });
  });

  test("tokens 2", async () => {
    const parser = await generateParser("token-2.ne");
    expect(parser.parse(["print", "blah", 12, ";", ";"])).toMatchObject({
      success: false,
      failureType: "invalid",
    });
  });

  test("json", async () => {
    const parser = await generateParser("json.ne");

    const testCases = [
      '{ "a" : true, "b" : "䕧⡱a\\\\\\"b\\u4567\\u2871䕧⡱\\t\\r\\f\\b\\n", "c" : null, "d" : [null, true, false, null] }\n',
      '{ "a" : true, "b" : "䕧⡱a\\\\\\"b\\u4567\\u2871䕧⡱\\t\\r\\f\\b\\n\\u0010\\u001f\\u005b\\u005c\\u005d", "c" : null, "d" : [null, true, false, -0.2345E+10] }\n',
    ];
    testCases.forEach((testCase) => {
      expect(parser.parse(testCase)).toMatchObject({
        success: true,
        ambiguous: false,
        result: JSON.parse(testCase),
      });
    });

    expect(parser.parse("foo")).toMatchObject({
      success: false,
      failureType: "lexer",
    });
  });

  test("tosh", async () => {
    const parser = await generateParser("tosh.ne");
    expect(
      parser.parse(
        "set foo to 2 * e^ of ( foo * -0.05 + 0.5) * (1 - e ^ of (foo * -0.05 + 0.5))"
      )
    ).toMatchObject({
      success: true,
      ambiguous: false,
      result: [
        "setVar:to:",
        "foo",
        [
          "*",
          [
            "*",
            2,
            [
              "computeFunction:of:",
              "e ^",
              ["+", ["*", ["readVariable", "foo"], -0.05], 0.5],
            ],
          ],
          [
            "-",
            1,
            [
              "computeFunction:of:",
              "e ^",
              ["+", ["*", ["readVariable", "foo"], -0.05], 0.5],
            ],
          ],
        ],
      ],
    });
  });
});
