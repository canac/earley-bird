import { Grammar } from "./grammar";
import { Lexer, StreamLexer } from "./lexer";
import { State } from "./state";
import {
  CharsetSymbol,
  LiteralSymbol,
  RuleSymbol,
  TesterSymbol,
  TokenSymbol,
} from "./symbols";
import { ParseChart } from "./table";

// This class represents an Earley parser
export class Parser {
  #grammar: Grammar;
  #lexer: Lexer;

  // Create a new parser with the provided grammar and lexer
  constructor(grammar: Grammar, lexer?: Lexer) {
    this.#grammar = grammar;
    this.#lexer = lexer || new StreamLexer();
  }

  // Parse the provided input string
  parse(
    input: string
  ):
    | { success: true; result: unknown }
    | { success: false; predictions: string[] } {
    const parseChart = new ParseChart(this.#grammar);

    // Feed the input to the lexer
    this.#lexer.reset(input);

    // Iterate over the lexer's tokens and one extra time because one more
    // parse table is created than tokens
    for (const [tableIndex, token] of [...this.#lexer, null].entries()) {
      const currentTable = parseChart.getTable(tableIndex);
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
      return {
        success: true,
        result: successStates[0].getResult(),
      };
    }

    return {
      success: false,
      predictions: parseChart.getPredictions(),
    };
  }
}
