// The Chatbot page's brain. Implements a small "tool use" loop: Claude can
// call one of two tools we define below (log_title_opinion, recommend_title),
// we actually execute them against the database, hand the results back to
// Claude, and it writes a natural-language reply referencing what happened.
// This is what makes "I just watched Andor and loved it" or "recommend me
// something sad" actually update the app, not just produce a chat reply.
//
// See https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
// for the general pattern this follows.

import { prisma } from "@/lib/prisma";
import { getClaudeClient, getModel, extractText } from "@/lib/anthropic";
import { findOrLookupTitle } from "@/lib/titles";
import { getProfile, profileToPromptSummary, maybeAnalyzePreferences } from "@/lib/profile";
import { RATING_STATUSES } from "@/lib/questions";

const TOOLS = [
  {
    name: "log_title_opinion",
    description:
      "Record the user's opinion about a specific movie or TV show they've watched, want to watch, or are " +
      "not interested in. Use this whenever the user shares an opinion about a title in the conversation.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "The movie or TV show name" },
        year: { type: "number", description: "Release year, if known" },
        status: { type: "string", enum: RATING_STATUSES },
        stars: {
          type: "number",
          description: "1-5 star rating - only include if status is 'watched' and the user gave/implied a rating",
        },
        why: { type: "string", description: "A short summary of why the user liked/disliked it, ideally in their own words" },
      },
      required: ["title", "status"],
    },
  },
  {
    name: "recommend_title",
    description:
      "Recommend one specific, real movie or TV show to the user right now (e.g. because they asked for a " +
      "mood- or situation-based pick). This adds it straight to their Recommendations page.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        year: { type: "number" },
        reasonText: {
          type: "string",
          description: "A short, specific reason this fits what the user asked for and/or their taste profile",
        },
      },
      required: ["title", "reasonText"],
    },
  },
];

async function executeTool(userId, toolName, input) {
  if (toolName === "log_title_opinion") {
    const status = RATING_STATUSES.includes(input.status) ? input.status : "watched";
    const title = await findOrLookupTitle(input.title, { year: input.year });
    if (!title) return { error: `Could not find a title matching "${input.title}".` };

    await prisma.rating.upsert({
      where: { userId_titleId: { userId, titleId: title.id } },
      update: { status, stars: input.stars ?? undefined, why: input.why ?? undefined, source: "chatbot" },
      create: {
        userId,
        titleId: title.id,
        status,
        stars: input.stars ?? null,
        why: input.why ?? null,
        source: "chatbot",
      },
    });
    return { success: true, title: title.name, year: title.year };
  }

  if (toolName === "recommend_title") {
    const title = await findOrLookupTitle(input.title, { year: input.year });
    if (!title) return { error: `Could not find a title matching "${input.title}".` };

    await prisma.recommendation.upsert({
      where: { userId_titleId: { userId, titleId: title.id } },
      update: { reasonText: input.reasonText, source: "chatbot", status: "pending" },
      create: { userId, titleId: title.id, reasonText: input.reasonText, source: "chatbot", status: "pending" },
    });
    return { success: true, title: title.name, year: title.year };
  }

  return { error: `Unknown tool: ${toolName}` };
}

const MAX_TOOL_ITERATIONS = 4; // safety limit so a confused model can't loop forever

/**
 * Handles one user chat message end-to-end: saves it, runs the Claude
 * tool-use loop (executing any tools Claude calls), saves and returns the
 * final assistant reply, and refreshes the preference profile if anything changed.
 */
export async function handleChatMessage(userId, userMessageText) {
  const client = getClaudeClient();

  const [user, profile, history] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getProfile(userId),
    prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 16 }),
  ]);

  await prisma.chatMessage.create({ data: { userId, role: "user", content: userMessageText } });

  const system = `You are CineMatch's assistant - a friendly movie/TV recommendation chatbot.
Here is what you currently know about this user:
${profileToPromptSummary(profile, user)}

You can:
- Log the user's opinion about a title they mention, using the log_title_opinion tool.
- Recommend one specific title right now (e.g. for a mood or situation they describe), using the recommend_title tool.
Actually call these tools when the conversation calls for it - don't just describe what you would do.
Keep replies conversational and fairly short. When you use a tool, mention what you did in plain language
(e.g. "Logged Andor as watched & loved - added to your profile.").
If the user mentions watching something but doesn't give any indication of a rating (loved it, hated it, a star
count, etc.), log it anyway but briefly ask how they'd rate it 1-5 stars - the more specific the rating, the
better their recommendations get, and this chat is one of the easiest places to capture that in the moment.
If they only give a bare reaction ("loved it", "it was fine") with no real detail on WHY, log what you have but
gently ask one specific follow-up (what worked, what didn't, how it compared to something they've mentioned
before) - vague opinions barely move the needle, but a specific reason is what actually lets the AI find real
patterns instead of just going by genre.`;

  const messages = [
    ...history.reverse().map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessageText },
  ];

  let finalText = "";
  let usedAnyTool = false;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 600,
      system,
      messages,
      tools: TOOLS,
    });

    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");

    if (toolUseBlocks.length === 0) {
      finalText = extractText(response);
      break;
    }

    usedAnyTool = true;

    // Claude's turn (including its tool-call blocks) must be echoed back
    // before we can send tool results, per the Messages API's tool-use flow.
    messages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const block of toolUseBlocks) {
      const result = await executeTool(userId, block.name, block.input);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
    }
    messages.push({ role: "user", content: toolResults });

    if (i === MAX_TOOL_ITERATIONS - 1) {
      // We hit the safety limit while Claude still wanted to use tools -
      // grab whatever text it had written so far rather than returning nothing.
      finalText = extractText(response) || "Done!";
    }
  }

  if (!finalText) {
    finalText = "Sorry, I wasn't able to come up with a reply there - could you try rephrasing?";
  }

  await prisma.chatMessage.create({ data: { userId, role: "assistant", content: finalText } });

  if (usedAnyTool) {
    // A tool call likely changed a rating or added a recommendation, both of
    // which are meaningful new signal - refresh the profile. Don't block the
    // chat reply on this second Claude call - the user is waiting to read
    // finalText, which is already decided.
    maybeAnalyzePreferences(userId).catch((err) => {
      console.error("Failed to re-analyze preferences after chat:", err.message);
    });
  }

  return finalText;
}
