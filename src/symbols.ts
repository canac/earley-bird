import { LexerToken } from "./lexer";

// This interface represents a symbol in a rule
export interface EarleySymbol {
  // Test whether a lexer token satisfies this symbol
  matchesToken(tokenValue: string, token: LexerToken): boolean;

  // Test whether a rule satisfies this symbol
  matchesRule(ruleName: string): boolean;

  // Return the debug representation of this rule
  debug(): string;
}

// This class represents a symbol that is satisfied by a rule of a particular name
export class RuleSymbol implements EarleySymbol {
  #ruleName: string;

  constructor(ruleName: string) {
    this.#ruleName = ruleName;
  }

  matchesToken(tokenValue: string, token: LexerToken): boolean {
    return false;
  }

  matchesRule(ruleName: string): boolean {
    return ruleName === this.#ruleName;
  }

  getRuleName(): string {
    return this.#ruleName;
  }

  debug(): string {
    return this.#ruleName;
  }
}

// This class represents a symbol that is satisfied by a lexer token of a
// particular type
export class TokenSymbol implements EarleySymbol {
  #lexerTokenName: string;

  constructor(lexerTokenName: string) {
    this.#lexerTokenName = lexerTokenName;
  }

  matchesToken(tokenValue: string, token: LexerToken): boolean {
    return token.type === this.#lexerTokenName;
  }

  matchesRule(ruleName: string): boolean {
    return false;
  }

  debug(): string {
    return "%" + this.#lexerTokenName;
  }
}

// This class represents a symbol that is satisfied by a string literal of a
// particular value
export class LiteralSymbol implements EarleySymbol {
  #literal: string;

  constructor(literal: string) {
    this.#literal = literal;
  }

  matchesToken(tokenValue: string, token: LexerToken): boolean {
    return token.value === this.#literal;
  }

  matchesRule(ruleName: string): boolean {
    return false;
  }

  debug(): string {
    return this.#literal;
  }
}

// This class represents a symbol that is satisfied by a regular expression charset
export class CharsetSymbol implements EarleySymbol {
  #pattern: RegExp;

  constructor(pattern: RegExp) {
    this.#pattern = pattern;
  }

  matchesToken(tokenValue: string, token: LexerToken): boolean {
    return this.#pattern.test(token.text);
  }

  matchesRule(ruleName: string): boolean {
    return false;
  }

  debug(): string {
    return this.#pattern.toString();
  }
}

export type Tester = (tokenValue: string, token: LexerToken) => boolean;

// This class represents a symbol that is satisfied by a test function
export class TesterSymbol implements EarleySymbol {
  #tester: Tester;

  constructor(tester: Tester) {
    this.#tester = tester;
  }

  matchesToken(tokenValue: string, token: LexerToken): boolean {
    return this.#tester(tokenValue, token);
  }

  matchesRule(ruleName: string): boolean {
    return false;
  }

  debug(): string {
    return this.#tester.toString();
  }
}
