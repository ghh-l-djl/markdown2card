import { createHash, randomUUID } from "crypto";
import http, { type IncomingMessage } from "http";
import type { Socket } from "net";

export interface BridgeStatus {
  connected: boolean;
  authenticated: boolean;
  capabilities: Record<string, unknown>;
  profileLabel: string;
  extensionVersion: string;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export class BrowserPublishBridge {
  private server: http.Server | null = null;
  private socket: Socket | null = null;
  private buffer = Buffer.alloc(0);
  private pending = new Map<string, PendingRequest>();
  private status: BridgeStatus = { connected: false, authenticated: false, capabilities: {}, profileLabel: "", extensionVersion: "" };

  constructor(private port: number, private token: string) {}

  async start(): Promise<BridgeStatus> {
    if (this.server) return this.status;
    this.server = http.createServer((req, res) => {
      if (req.url === "/status") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(this.status));
        return;
      }
      res.writeHead(404);
      res.end("Not found");
    });
    this.server.on("upgrade", (req, socket) => this.handleUpgrade(req, socket as Socket));
    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen({ host: "127.0.0.1", port: this.port }, () => {
        this.server?.off("error", reject);
        resolve();
      });
    });
    return this.status;
  }

  async stop(): Promise<void> {
    for (const [, request] of this.pending) {
      clearTimeout(request.timer);
      request.reject(new Error("Bridge stopped"));
    }
    this.pending.clear();
    this.socket?.destroy();
    this.socket = null;
    this.status = { connected: false, authenticated: false, capabilities: {}, profileLabel: "", extensionVersion: "" };
    if (this.server) await new Promise<void>((resolve) => this.server?.close(() => resolve()));
    this.server = null;
  }

  getStatus(): BridgeStatus {
    return { ...this.status, capabilities: { ...this.status.capabilities } };
  }

  async request(method: string, params: unknown, timeoutMs = 10000): Promise<unknown> {
    await this.start();
    if (!this.socket || !this.status.authenticated) throw new Error("尚未连接到浏览器插件");
    const id = randomUUID();
    const payload: Record<string, unknown> = { id, method, params };
    if (this.token) payload.token = this.token;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`浏览器插件响应超时：${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.send(payload);
    });
  }

  async health(): Promise<Record<string, unknown>> {
    return this.request("health", {}, 5000) as Promise<Record<string, unknown>>;
  }

  async listSupportedPlatforms(): Promise<unknown[]> {
    return this.request("listSupportedPlatforms", {}, 60000) as Promise<unknown[]>;
  }

  async getAuthSnapshot(platforms: string[]): Promise<unknown> {
    return this.request("getAuthSnapshot", { platforms, maxAgeMs: 86400000 }, 10000);
  }

  async enqueueSyncArticle(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request("enqueueSyncArticle", params, 10000) as Promise<Record<string, unknown>>;
  }

  async getSyncTask(syncId: string): Promise<Record<string, unknown>> {
    return this.request("getSyncTask", { syncId }, 5000) as Promise<Record<string, unknown>>;
  }

  async openSyncTask(syncId: string): Promise<unknown> {
    return this.request("openSyncTask", { syncId }, 5000);
  }

  private handleUpgrade(req: IncomingMessage, socket: Socket): void {
    const key = req.headers["sec-websocket-key"];
    if (!key || Array.isArray(key)) {
      socket.destroy();
      return;
    }
    socket.write([
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${createHash("sha1").update(key + WS_GUID).digest("base64")}`,
      "",
      ""
    ].join("\r\n"));
    this.socket?.destroy();
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.status = { ...this.status, connected: true, authenticated: false };
    socket.on("data", (chunk) => this.handleData(chunk));
    socket.on("close", () => this.handleClose());
    socket.on("error", () => this.handleClose());
  }

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const parsed = parseFrames(this.buffer);
    this.buffer = parsed.remaining;
    for (const message of parsed.messages) this.handleMessage(message);
  }

  private handleMessage(raw: string): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (message.type === "extension_hello") {
      if (this.token && message.token !== this.token) {
        this.send({ type: "extension_hello_ack", ok: false, error: "token_mismatch" });
        this.socket?.end();
        return;
      }
      this.status = {
        connected: true,
        authenticated: true,
        capabilities: isRecord(message.capabilities) ? message.capabilities : {},
        profileLabel: typeof message.profileLabel === "string" ? message.profileLabel : "",
        extensionVersion: typeof message.version === "string" ? message.version : ""
      };
      this.send({ type: "extension_hello_ack", ok: true, connectionId: randomUUID(), mode: "multi-client", serverVersion: "markdown2card" });
      return;
    }
    if (message.type === "heartbeat") {
      this.send({ type: "heartbeat_ack", ts: message.ts });
      return;
    }
    const id = typeof message.id === "string" ? message.id : "";
    const request = this.pending.get(id);
    if (!request) return;
    clearTimeout(request.timer);
    this.pending.delete(id);
    if (message.error) {
      const error = isRecord(message.error) ? message.error.message || message.error.error : message.error;
      request.reject(new Error(String(error || "浏览器插件请求失败")));
      return;
    }
    request.resolve(message.result);
  }

  private handleClose(): void {
    this.socket = null;
    this.status = { ...this.status, connected: false, authenticated: false };
    for (const [, request] of this.pending) {
      clearTimeout(request.timer);
      request.reject(new Error("浏览器插件已断开"));
    }
    this.pending.clear();
  }

  private send(value: unknown): void {
    if (!this.socket) return;
    this.socket.write(encodeFrame(JSON.stringify(value)));
  }
}

function parseFrames(buffer: Buffer): { messages: string[]; remaining: Buffer } {
  const messages: string[] = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) === 0x80;
    let length = second & 0x7f;
    let cursor = offset + 2;
    if (length === 126) {
      if (cursor + 2 > buffer.length) break;
      length = buffer.readUInt16BE(cursor);
      cursor += 2;
    } else if (length === 127) {
      if (cursor + 8 > buffer.length) break;
      length = Number(buffer.readBigUInt64BE(cursor));
      cursor += 8;
    }
    const mask = masked ? buffer.subarray(cursor, cursor + 4) : null;
    if (masked) cursor += 4;
    if (cursor + length > buffer.length) break;
    const payload = Buffer.from(buffer.subarray(cursor, cursor + length));
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    if (opcode === 1) messages.push(payload.toString("utf8"));
    offset = cursor + length;
  }
  return { messages, remaining: buffer.subarray(offset) };
}

function encodeFrame(text: string): Buffer {
  const payload = Buffer.from(text);
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  if (payload.length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, payload]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payload.length), 2);
  return Buffer.concat([header, payload]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
