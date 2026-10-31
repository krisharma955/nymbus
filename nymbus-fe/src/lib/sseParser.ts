/**
 * High-reliability Server-Sent Events (SSE) Parser for Fetch / ReadableStream.
 * Complies with the W3C EventSource / SSE standard:
 * - Supports arbitrary network chunk boundaries
 * - Handles split multi-byte UTF-8 sequences via TextDecoder({ stream: true })
 * - Supports both CRLF (\r\n), CR (\r), and LF (\n)
 * - Correctly buffers partial event blocks and multiline data fields
 * - Gracefully processes stream termination and final buffered data
 */

export interface ParsedSseEvent {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

export type SseEventHandler = (event: ParsedSseEvent) => void;

export class SseStreamParser {
  private buffer = "";
  private currentEventName = "message";
  private currentDataLines: string[] = [];
  private currentId?: string;
  private currentRetry?: number;
  private decoder = new TextDecoder("utf-8", { fatal: false });

  constructor(private onEvent: SseEventHandler) {}

  /**
   * Push a raw Uint8Array network chunk into the parser.
   */
  public feed(chunk: Uint8Array): void {
    const text = this.decoder.decode(chunk, { stream: true });
    this.processText(text);
  }

  /**
   * Finalize the stream and dispatch any pending buffered event.
   */
  public finish(): void {
    const text = this.decoder.decode();
    if (text) {
      this.processText(text);
    }
    // If there is any trailing unprocessed line in buffer
    if (this.buffer.length > 0) {
      this.processLine(this.buffer);
      this.buffer = "";
    }
    this.dispatchEventIfReady();
  }

  private processText(text: string): void {
    this.buffer += text;

    // Normalize CRLF and CR to LF
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
      let line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }

      this.processLine(line);
    }
  }

  private processLine(line: string): void {
    // Empty line indicates event boundary in SSE specification
    if (line === "") {
      this.dispatchEventIfReady();
      return;
    }

    // Comment line starts with ':'
    if (line.startsWith(":")) {
      return;
    }

    let field = line;
    let value = "";
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      field = line.slice(0, colonIndex);
      value = line.slice(colonIndex + 1);
      if (value.startsWith(" ")) {
        value = value.slice(1);
      }
    }

    switch (field) {
      case "event":
        this.currentEventName = value;
        break;
      case "data":
        this.currentDataLines.push(value);
        break;
      case "id":
        this.currentId = value;
        break;
      case "retry": {
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed)) {
          this.currentRetry = parsed;
        }
        break;
      }
      default:
        // Unknown field, ignore per SSE spec
        break;
    }
  }

  private dispatchEventIfReady(): void {
    if (this.currentDataLines.length > 0 || this.currentEventName !== "message") {
      const payload: ParsedSseEvent = {
        event: this.currentEventName || "message",
        data: this.currentDataLines.join("\n"),
        id: this.currentId,
        retry: this.currentRetry,
      };

      try {
        this.onEvent(payload);
      } catch (err) {
        console.error("Error in SSE event handler:", err);
      }

      // Reset for next event block
      this.currentEventName = "message";
      this.currentDataLines = [];
      this.currentId = undefined;
      this.currentRetry = undefined;
    }
  }
}

/**
 * Utility helper to consume a ReadableStream with SseStreamParser
 */
export async function consumeSseStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: SseEventHandler,
  signal?: AbortSignal
): Promise<void> {
  const reader = stream.getReader();
  const parser = new SseStreamParser(onEvent);

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        parser.feed(value);
      }
    }
  } finally {
    parser.finish();
    reader.releaseLock();
  }
}
