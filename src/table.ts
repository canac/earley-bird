import { Grammar } from "./grammar";
import { State } from "./state";

// This class represents an Earley parse table consisting of multiple states
export class Table {
  #states: State[] = [];

  // Iterate over all the states in this table, calling the callback for each one
  // It differs from this.states.forEach in that states added during iteration are still iterated
  iterateStates(iteratee: (state: State) => void): void {
    for (let i = 0; i < this.#states.length; i++) {
      iteratee(this.#states[i]);
    }
  }

  // Return this table's states
  getStates(): State[] {
    return this.#states;
  }

  // Add a new state to the table, avoiding duplicates
  addState(newState: State) {
    // Check for duplicates before adding
    if (!this.#states.some((state) => newState.equals(state))) {
      this.#states.push(newState);
    }
  }

  // Return the debug representation of this table
  debug(): string {
    return this.#states.map((state) => state.debug() + "\n").join("");
  }
}

// This class represents an Early parse chart consisting of multiple tables
export class ParseChart {
  #tables: Table[] = [];
  #grammar: Grammar;

  // Create a new parse chart from the provided grammar
  constructor(grammar: Grammar) {
    this.#grammar = grammar;

    const firstTable = new Table();
    this.#grammar.getRootRules().forEach((rule) => {
      firstTable.addState(new State(rule, 0, 0));
    });
    this.#tables.push(firstTable);
  }

  // Return the table at the given index, creating it if necessary
  getTable(index: number) {
    // Create the tables if necessary
    while (index >= this.#tables.length) {
      this.#tables.push(new Table());
    }

    return this.#tables[index];
  }

  // Return the last table in the parse chart
  getFinalTable(): Table {
    return this.#tables[this.#tables.length - 1];
  }

  // Create a new state that advances the dot in this state and add the new
  // state it to the specified table
  advanceState(advancedState: State, targetTable: number, result: unknown) {
    // Advance the dot and add the state to the next table
    this.getTable(targetTable).addState(advancedState.next(result));
  }

  // Return an array of the successful states in the final parse table
  // If the array is empty, then there were no successful parses
  // If the array contains exactly one entry, then there was one unambiguous parse
  // If the array contains more than one entry, then there were multiple ambiguous parses
  getSuccessStates(): State[] {
    return this.getFinalTable()
      .getStates()
      .filter(
        (state) =>
          this.#grammar.isRootRule(state.getRule()) && state.isSuccessful()
      );
  }

  // Return an array of the predictions of the symbols that could come next
  getPredictions(): string[] {
    const predictions = this.getFinalTable()
      .getStates()
      .flatMap((state) => {
        const symbol = state.nextExpected();
        return symbol ? [symbol.debug()] : [];
      });
    // Deduplicate the predictions
    return Array.from(new Set(predictions));
  }

  // Return the debug representation of this parse table
  debug(): string {
    return this.#tables
      .map((table, index) => `Table ${index}:\n${table.debug()}\n\n`)
      .join("");
  }
}
