"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "~/trpc/react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  interactionId?: string;
  feedbackRating?: number;
}

interface UseAIChatOptions {
  pathname: string;
  eventId?: string;
}

const MESSAGES_KEY = "ai-chat-messages";
const CONVERSATION_KEY = "ai-chat-conversation-id";

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getStoredConversationId(): string {
  try {
    const stored = sessionStorage.getItem(CONVERSATION_KEY);
    if (stored) return stored;
  } catch {
    // Ignore
  }
  const id = generateConversationId();
  try {
    sessionStorage.setItem(CONVERSATION_KEY, id);
  } catch {
    // Ignore
  }
  return id;
}

export function useAIChat({ pathname, eventId }: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasRestoredRef = useRef(false);
  const conversationIdRef = useRef<string>("");

  const logInteraction = api.aiInteraction.logInteraction.useMutation();

  // Restore messages and conversationId from sessionStorage on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    conversationIdRef.current = getStoredConversationId();
    try {
      const saved = sessionStorage.getItem(MESSAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist messages to sessionStorage on change
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    try {
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const startTime = Date.now();

      try {
        console.log("[AI Chat] Fetching /api/ai/chat...");
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            pathname,
            eventId,
          }),
          signal: controller.signal,
        });

        console.log(
          "[AI Chat] Response:",
          response.status,
          response.headers.get("content-type"),
        );

        if (!response.ok) {
          const errorBody = await response
            .text()
            .catch(() => "Could not read error body");
          throw new Error(
            `Chat request failed: ${String(response.status)} - ${errorBody}`,
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullResponse = "";
        let readCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          readCount++;
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;

          if (readCount <= 2) {
            console.log(
              `[AI Chat] Chunk #${String(readCount)}:`,
              JSON.stringify(chunk).slice(0, 200),
            );
          }

          const currentText = fullResponse;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id ? { ...m, content: currentText } : m,
            ),
          );
        }

        console.log("[AI Chat] Done:", {
          reads: readCount,
          length: fullResponse.length,
        });

        // Log the interaction to the database
        const responseTimeMs = Date.now() - startTime;
        logInteraction
          .mutateAsync({
            userMessage: content,
            aiResponse: fullResponse,
            agentId: "platformAgent",
            agentName: "AI Assistant",
            model: "mastra-agents",
            conversationId: conversationIdRef.current,
            pathname,
            eventId,
            responseTimeMs,
          })
          .then((result) => {
            // Attach interactionId to the assistant message for feedback
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, interactionId: result.id }
                  : m,
              ),
            );
          })
          .catch((err: unknown) => {
            console.error("[AI Chat] Failed to log interaction:", err);
          });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          // User cancelled
        } else {
          console.error("[AI Chat] Error:", error);
          const responseTimeMs = Date.now() - startTime;
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? {
                    ...m,
                    content: "Sorry, something went wrong. Please try again.",
                  }
                : m,
            ),
          );

          // Log the error interaction
          logInteraction
            .mutateAsync({
              userMessage: content,
              aiResponse: "Sorry, something went wrong. Please try again.",
              agentId: "platformAgent",
              agentName: "AI Assistant",
              model: "mastra-agents",
              conversationId: conversationIdRef.current,
              pathname,
              eventId,
              responseTimeMs,
              hadError: true,
              errorMessage: errorMsg,
            })
            .catch((logErr: unknown) => {
              console.error(
                "[AI Chat] Failed to log error interaction:",
                logErr,
              );
            });
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [messages, pathname, eventId, logInteraction],
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    // Generate a new conversationId for the next conversation
    conversationIdRef.current = generateConversationId();
    try {
      sessionStorage.removeItem(MESSAGES_KEY);
      sessionStorage.setItem(CONVERSATION_KEY, conversationIdRef.current);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const updateMessageFeedback = useCallback(
    (messageId: string, rating: number) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, feedbackRating: rating } : m,
        ),
      );
    },
    [],
  );

  return {
    messages,
    isStreaming,
    sendMessage,
    stop,
    clearMessages,
    updateMessageFeedback,
  };
}
