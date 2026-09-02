// Thin wrapper around the Anthropic SDK. Every other lib/*.js file that
// needs Claude (profile.js, recommendations.js, chat.js) goes through here,
// so there's exactly one place that knows how to talk to the API, parse its
// JSON responses, and give a clear error if the API key is missing.
// (lib/titles.js used to be a caller too - title lookups now go through
// TMDB/OMDb directly instead, see that file for why.)

import Anthropic from "@anthropic-ai/sdk";

let cachedClient = null;

export function getClaudeClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your Anthropic API key " +
        "(get one at https://console.anthropic.com/settings/keys)."
    );
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cachedClient;
}

export function getModel() {
  return process.env.CLAUDE_MODEL || "claude-haiku-4-5";
}

// Preference-profile synthesis (lib/profile.js) has to cross-reference and
// resolve titles across ratings and free-text answers - more of an
// instruction-following task than titles/recommendations/chat, where a
// cheaper model like Haiku doesn't reliably get it right (verified: it kept
// repeating a user's mistranslated title even with an explicit worked
// example in the prompt). Defaults to a stronger model for just this one
// call; still swappable via env like CLAUDE_MODEL is.
export function getProfileModel() {
  return process.env.CLAUDE_PROFILE_MODEL || "claude-sonnet-5";
}

// Pulls all plain-text content blocks out of a Claude response and joins
// them. Claude's response can also contain tool-use/tool-result blocks
// (e.g. when web search was used), which we skip here since we only want
// the final written answer.
export function extractText(message) {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

// Claude usually returns clean JSON when asked to, but sometimes wraps it in
// a ```json ... ``` markdown code fence anyway, or narrates before/after it
// ("Based on my search, here are the candidates:\n[...]") despite being told
// not to. This strips a fence if present, then - if that's still not valid
// JSON - falls back to extracting the outermost [...]/{...} substring, and
// only then throws a clear error (including the raw text), which is much
// easier to debug than a generic "Unexpected token" error.
export function parseJSONLoose(text) {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const firstBracket = cleaned.search(/[[{]/);
    if (firstBracket !== -1) {
      const closeChar = cleaned[firstBracket] === "[" ? "]" : "}";
      const lastBracket = cleaned.lastIndexOf(closeChar);
      if (lastBracket > firstBracket) {
        try {
          return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
        } catch {
          // fall through to the error below
        }
      }
    }
    throw new Error(
      `Claude's response wasn't valid JSON. Raw response:\n${text}\n\nParse error: ${err.message}`
    );
  }
}

// Ask Claude a question and parse the reply as JSON. No web search - use
// this for reasoning over data we already have (e.g. building a preference
// profile from a user's ratings).
//
// thinking is explicitly disabled: this is direct structured-JSON extraction,
// not a task that benefits from extended reasoning, and on models where
// adaptive thinking is on by default (e.g. Sonnet 5) it silently eats the
// entire max_tokens budget - stop_reason: "max_tokens" with 100% of the
// tokens spent on thinking and none left for the actual response.
// `cacheSystemPrompt` opts into Anthropic prompt caching for this call's
// system prompt (default off - most callers here run on Haiku 4.5, whose
// 4096-token minimum cacheable prefix is bigger than these system prompts,
// so caching them would be a silent no-op; only pass this where the system
// prompt is both fully static and long enough to actually clear the
// model's minimum - see lib/profile.js for the one place that's true today).
export async function askClaudeForJSON({ system, prompt, maxTokens = 2000, model, cacheSystemPrompt = false }) {
  const client = getClaudeClient();
  const message = await client.messages.create({
    model: model || getModel(),
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    system: cacheSystemPrompt ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] : system,
    messages: [{ role: "user", content: prompt }],
  });
  return parseJSONLoose(extractText(message));
}
