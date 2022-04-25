import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { compile } from "../src/compiler/compile";

async function generateParser(grammarFilename) {
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
  const { default: parser } = await import(outputFilename);
  return parser;
}

describe("Parser examples", () => {
  test("nullable whitespace bug", async () => {
    const parser = await generateParser("whitespace.ne");
    expect(parser.parse("(x)")).toEqual({
      success: true,
      result: [[["(", null, [[[["x"]]]], null, ")"]]],
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
      expect(parser.parse(passCase).success).toBe(true);
    });

    const failCases = [
      " ",
      "[}",
      "[(){}><]",
      "(((())))(()))",
      "",
      "((((())))(())()",
    ];
    failCases.forEach((failCase) => {
      expect(parser.parse(failCase).success).toBe(false);
    });
  });

  test("tokens", async () => {
    const parser = await generateParser("token.ne");
    expect(parser.parse([123, 456, " ", 789])).toEqual({
      success: true,
      result: [123, [[456, " ", 789]]],
    });
  });

  test("tokens 2", async () => {
    const parser = await generateParser("token-2.ne");
    expect(parser.parse(["print", "blah", 12, ";", ";"]).success).toBe(false);
  });

  test("json", async () => {
    const parser = await generateParser("json.ne");

    const testCases = [
      '{ "a" : true, "b" : "䕧⡱a\\\\\\"b\\u4567\\u2871䕧⡱\\t\\r\\f\\b\\n", "c" : null, "d" : [null, true, false, null] }\n',
      '{ "a" : true, "b" : "䕧⡱a\\\\\\"b\\u4567\\u2871䕧⡱\\t\\r\\f\\b\\n\\u0010\\u001f\\u005b\\u005c\\u005d", "c" : null, "d" : [null, true, false, -0.2345E+10] }\n',
    ];
    testCases.forEach((testCase) => {
      expect(parser.parse(testCase)).toEqual({
        success: true,
        result: JSON.parse(testCase),
      });
    });
  });

  test("tosh", async () => {
    const parser = await generateParser("tosh.ne");
    expect(
      parser.parse(
        "set foo to 2 * e^ of ( foo * -0.05 + 0.5) * (1 - e ^ of (foo * -0.05 + 0.5))"
      )
    ).toEqual({
      success: true,
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
