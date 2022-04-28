// Lexer streams must implement toString
export interface ToString {
  toString(): string;
}

export interface LexerToken {
  type?: string | undefined;
  value: unknown;
  text: string;
}

export interface Lexer {
  reset: (chunk: Iterable<ToString>) => void;
  next: () => LexerToken | undefined;
  [Symbol.iterator](): IterableIterator<LexerToken>;
}

// This class is a stream lexer that simply emits one token at a time
export class StreamLexer implements Lexer {
  #buffer: ToString[] = [];
  #bufferIndex: number = 0;

  // Set the contents of the lexer buffer
  reset(chunk: Iterable<ToString>): void {
    this.#buffer = Array.from(chunk);
    this.#bufferIndex = 0;
  }

  // Advance the lexer one token and return it, or undefined if the buffer
  // is empty
  next(): LexerToken | undefined {
    if (this.#bufferIndex >= this.#buffer.length) {
      return undefined;
    }

    const value = this.#buffer[this.#bufferIndex++];
    return {
      value,
      text: value.toString(),
    };
  }

  // Iterate over all remaining tokens in the lexer buffer
  *[Symbol.iterator](): IterableIterator<LexerToken> {
    while (true) {
      const token = this.next();
      if (typeof token === "undefined") {
        return;
      }

      yield token;
    }
  }
}
