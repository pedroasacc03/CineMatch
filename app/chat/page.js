// The Chatbot Page (Section 3.4 of the planning doc). See lib/chat.js for
// the tool-use loop that lets the assistant actually log ratings and add
// recommendations, not just talk about doing so.

import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { trackPageView } from "@/lib/events";
import NavBar from "@/components/NavBar";
import ChatPageClient from "@/components/ChatPageClient";

export default async function ChatPage() {
  const user = await requireUser();
  await trackPageView(user.id, "chat").catch((err) => console.error("Failed to track page view:", err.message));
  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="chat-page-shell">
      <NavBar activePath="/chat" />
      <div className="chat-page-inner">
        <h1 style={{ margin: "0 0 4px" }}>Chatbot</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Talk to the AI to update your preferences, get a mood-based pick, or refine your recommendations.
        </p>
        <ChatPageClient initialMessages={messages} />
      </div>
    </div>
  );
}
