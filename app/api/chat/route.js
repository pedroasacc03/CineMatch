// GET  /api/chat - fetch chat history for the Chatbot page
// POST /api/chat - send a message, run the tool-use loop, get a reply
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { handleChatMessage } from "@/lib/chat";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { trackEvent } from "@/lib/events";

export async function GET(request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ messages });
}

export async function POST(request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const limit = await checkRateLimit(user.id, "chat");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `You're sending messages too quickly - try again in ${formatRetryAfter(limit.retryAfterSeconds)}.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  const message = body?.message?.trim();
  if (!message) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });

  try {
    const reply = await handleChatMessage(user.id, message);
    trackEvent(user.id, "chat_message_sent").catch((err) => {
      console.error("Failed to track chat_message_sent:", err.message);
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
