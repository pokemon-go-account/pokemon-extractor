import { getSession } from "@/lib/auth";
import { EventEmitter } from "events";

declare global {
  // eslint-disable-next-line no-var
  var _vaultHitEmitter: EventEmitter | undefined;
}

if (!global._vaultHitEmitter) {
  global._vaultHitEmitter = new EventEmitter();
  global._vaultHitEmitter.setMaxListeners(200);
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listener: ((hit: any) => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: ping\ndata: "connected"\n\n`));

      // Keepalive heartbeat every 15s to prevent proxy timeouts
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: "heartbeat"\n\n`));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      }, 15000);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listener = (hit: any) => {
        try {
          controller.enqueue(encoder.encode(`event: hit\ndata: ${JSON.stringify(hit)}\n\n`));
        } catch { }
      };

      if (global._vaultHitEmitter && listener) {
        global._vaultHitEmitter.on("hit", listener);
      }
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (listener && global._vaultHitEmitter) {
        global._vaultHitEmitter.off("hit", listener);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
