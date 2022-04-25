export interface LexerToken {
  type?: string | undefined;
  value: string;
  text: string;
}

export interface Lexer {
  reset: (chunk: string) => void;
  next: () => LexerToken | undefined;
  [Symbol.iterator](): IterableIterator<LexerToken>;
}

// This class is a stream lexer that simply emits one character at a time
export class StreamLexer implements Lexer {
  buffer: string = "";
  bufferIndex: number = 0;

  // Set the contents of the lexer buffer
  reset(chunk: string) {
    this.buffer = chunk;
    this.bufferIndex = 0;
  }

  // Advance the lexer one character and return it, or undefined if the buffer
  // is empty
  next(): LexerToken | undefined {
    if (this.bufferIndex >= this.buffer.length) {
      return undefined;
    }

    const value = this.buffer[this.bufferIndex++];
    return {
      value,
      text: value,
    };
  }

  // Iterate over all remaining characters in the lexer buffer
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
