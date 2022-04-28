import { Grammar } from "./grammar";
import { Lexer, StreamLexer, ToString } from "./lexer";
import { State } from "./state";
import {
  CharsetSymbol,
  LiteralSymbol,
  RuleSymbol,
  TesterSymbol,
  TokenSymbol,
} from "./symbols";
import { ParseChart } from "./table";

type ParseResult =
  | {
      // Successful parse
      success: true;
      ambiguous: boolean;
      result: unknown;
      additionalResults: unknown[];
    }
  | {
      // More tokens could produce a successful parse
      success: false;
      failureType: "incomplete";
      predictions: string[];
    }
  | {
      // An invalid token was encountered and no more tokens can produce a successful parse
      success: false;
      failureType: "invalid";
    }
  | {
      // The lexer couldn't parse the token
      success: false;
      failureType: "lexer";
      lexerError: Error;
    };

// This class represents an Earley parser
export class Parser {
  #grammar: Grammar;
  #lexer: Lexer;

  // Create a new parser with the provided grammar and lexer
  constructor(grammar: Grammar, lexer?: Lexer) {
    this.#grammar = grammar;
    this.#lexer = lexer || new StreamLexer();
  }

  // Parse the provided input string or iterable of tokens
  parse(input: Iterable<ToString>): ParseResult {
    const parseChart = new ParseChart(this.#grammar);

    // Feed the input to the lexer
    this.#lexer.reset(input);

    let tokens;
    try {
      tokens = [...this.#lexer, null].entries();
    } catch (err) {
      if (err instanceof Error) {
        return { success: false, failureType: "lexer", lexerError: err };
      } else {
        throw new Error("Unexpected lexer error");
      }
    }

    // Iterate over the lexer's tokens and one extra time because one more
    // parse table is created than tokens
    for (const [tableIndex, token] of tokens) {
      const currentTable = parseChart.getTable(tableIndex);

      if (currentTable.getStates().length === 0) {
        return { success: false, failureType: "invalid" };
      }

      currentTable.iterateStates((state) => {
        const expected = state.nextExpected();

        if (!expected) {
          // The state is complete
          const completedRule = state.getRule();
          parseChart
            .getTable(state.getStartTable())
            .iterateStates((advancingState) => {
              if (advancingState.expectsRule(completedRule)) {
                // This past rule expects the rule that was just completed, so
                // advance it to the current table now
                parseChart.advanceState(
                  advancingState,
                  tableIndex,
                  state.getResult()
                );
              }
            });

          return;
        }

        if (
          expected instanceof TokenSymbol ||
          expected instanceof LiteralSymbol ||
          expected instanceof CharsetSymbol ||
          expected instanceof TesterSymbol
        ) {
          // Expected a terminal, so scan
          if (token && expected.matchesToken(token.value, token)) {
            // This state expects the current token, so advance it to the next table
            const result =
              this.#lexer.constructor === StreamLexer ? token.value : token;
            parseChart.advanceState(state, tableIndex + 1, result);
          }
        } else if (expected instanceof RuleSymbol) {
          // Expected a non-terminal, so predict
          // Lookup the rules that expect this state and add them to the current table
          this.#grammar
            .getRulesByName(expected.getRuleName())
            .forEach((rule) => {
              currentTable.addState(new State(rule, 0, tableIndex));
            });
        }
      });
    }

    const successStates = parseChart.getSuccessStates();
    if (successStates.length > 0) {
      // Only return the result of the first parse
      // If the parse was ambiguous, there might be multiple results
      const [result, ...additionalResults] = successStates.map((state) =>
        state.getResult()
      );
      return {
        success: true,
        ambiguous: successStates.length > 1,
        result,
        additionalResults,
      };
    }

    return {
      success: false,
      failureType: "incomplete",
      predictions: parseChart.getPredictions(),
    };
  }
}
