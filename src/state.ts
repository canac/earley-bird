import { EarleySymbol } from "./symbols";

export type PostProcessor = (childResults: unknown[]) => unknown;

export type Rule = {
  name: string;
  symbols: EarleySymbol[];
  postprocess?: PostProcessor | null | undefined;
};

// This class represents an Earley state, one line in a parse table
export class State {
  // The rule that this state represents
  #rule: Rule;

  // The index of the table that this state started in
  #start: number;

  // The location of the dot along the rule
  // Must be between 0 and rule.symbols.length
  #dot: number;

  // The state that this state was created from. The ancestor state's dot will
  // be one place to the left, or null if this state's dot is already 0.
  // Root states and predicted states have no ancestor
  #ancestorState: State | null = null;

  // The semantic result value of this state after running post processors
  // It will be an empty array until the state is completed so that the result
  // will be an empty array for nullable rules
  #result: unknown = [];

  // Create a new state
  constructor(rule: Rule, dot: number, start: number) {
    this.#rule = rule;
    this.#dot = dot;
    this.#start = start;
  }

  // Return the rule associated with this state
  getRule(): Rule {
    return this.#rule;
  }

  // Return the index of the table that this state started in
  getStartTable(): number {
    return this.#start;
  }

  // Return the semantic result of this rule
  getResult(): unknown | undefined {
    return this.#result;
  }

  // Return the next symbol that this state expects, or null if it is already complete
  nextExpected(): EarleySymbol | null {
    return this.#rule.symbols[this.#dot] ?? null;
  }

  // Determine whether this state expects the specified rule
  expectsRule(rule: Rule): boolean {
    const expected = this.nextExpected();
    return expected !== null && expected.matchesRule(rule.name);
  }

  // Determine whether the dot is at the end of this state
  isComplete(): boolean {
    return this.#dot >= this.#rule.symbols.length;
  }

  // Determine whether this state represents a successful parse
  isSuccessful(): boolean {
    return this.#start === 0 && this.isComplete();
  }

  // Compare this state and another state and return true if they are identical
  equals(state: State): boolean {
    return (
      this.#rule === state.#rule &&
      this.#dot === state.#dot &&
      this.#start === state.#start
    );
  }

  // Create a new state representing this state with the dot advanced one position to the right
  next(result: unknown): State {
    const nextState = new State(this.#rule, this.#dot + 1, this.#start);
    nextState.#ancestorState = this;
    nextState.#result = result;

    if (nextState.isComplete()) {
      // The state is completed, so walk the ancestor chain tree to get the
      // results for each symbol in the rule in reverse order
      const symbolResults = [];
      let node: State = nextState;
      while (node.#ancestorState !== null) {
        // Prepend the results to the array since we want the oldest ancestors
        // to come first in the array and they are iterated last
        symbolResults.unshift(node.#result);
        node = node.#ancestorState;
      }

      // Run the post processor to combine the state's symbols' results into
      // the result for this state
      const postprocess =
        nextState.#rule.postprocess ?? State.#noopPostprocessor;
      nextState.#result = postprocess(symbolResults);
    }

    return nextState;
  }

  // Return the debug representation of this state
  debug(): string {
    const preDot = this.#rule.symbols
      .slice(0, this.#dot)
      .map((symbol) => symbol.debug());
    const postDot = this.#rule.symbols
      .slice(this.#dot)
      .map((symbol) => symbol.debug());
    return `${this.#rule.name} -> ${[...preDot, "•", ...postDot].join(" ")} (${
      this.#start
    })`;
  }

  static #noopPostprocessor: PostProcessor = (results) => results;
}
