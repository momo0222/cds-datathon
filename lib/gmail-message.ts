export type GmailHeader = {
  name?: string;
  value?: string;
};

export type GmailMessagePart = {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: {
    data?: string;
  };
  parts?: GmailMessagePart[];
};

export type GmailMessage = {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
};

export function getHeader(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function collectBodyParts(part: GmailMessagePart | undefined, output: { text: string[]; html: string[] }) {
  if (!part) return;

  const data = part.body?.data;
  if (data && part.mimeType === "text/plain") {
    output.text.push(decodeBase64Url(data));
  }
  if (data && part.mimeType === "text/html") {
    output.html.push(decodeBase64Url(data));
  }

  for (const child of part.parts ?? []) {
    collectBodyParts(child, output);
  }
}

export function extractMessageContent(message: GmailMessage) {
  const headers = message.payload?.headers ?? [];
  const parts = { text: [] as string[], html: [] as string[] };
  collectBodyParts(message.payload, parts);

  const text = parts.text.join("\n\n").trim();
  const htmlText = parts.html.map(stripHtml).join("\n\n").trim();
  const body = text || htmlText || message.snippet || "";

  return {
    id: message.id,
    thread_id: message.threadId ?? null,
    from: getHeader(headers, "From"),
    subject: getHeader(headers, "Subject"),
    date: getHeader(headers, "Date"),
    received_at: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null,
    snippet: message.snippet ?? "",
    body,
  };
}
