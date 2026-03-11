"use client";

import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  Text,
  Code,
  Title,
  List,
  Blockquote,
  Divider,
  Anchor,
  Paper,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";
import "highlight.js/styles/github.css";

interface MarkdownRendererProps {
  content: string;
}

// Define plugins outside component for stable references
const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];

// Define wrapper style outside component
const wrapperStyle = { lineHeight: 1.6, fontSize: "16px" } as const;

// Define all markdown component renderers outside to avoid recreation
const markdownComponents = {
  // Headers
  h1: ({ children }: { children?: React.ReactNode }) => (
    <Title order={1} mb="lg" mt="xl">
      {children}
    </Title>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <Title order={2} mb="md" mt="xl">
      {children}
    </Title>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <Title order={3} mb="md" mt="lg">
      {children}
    </Title>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <Title order={4} mb="sm" mt="md">
      {children}
    </Title>
  ),
  h5: ({ children }: { children?: React.ReactNode }) => (
    <Title order={5} mb="sm" mt="md">
      {children}
    </Title>
  ),
  h6: ({ children }: { children?: React.ReactNode }) => (
    <Title order={6} mb="sm" mt="md">
      {children}
    </Title>
  ),

  // Paragraphs
  p: ({ children }: { children?: React.ReactNode }) => (
    <Text mb="md" size="md" style={{ lineHeight: 1.7 }}>
      {children}
    </Text>
  ),

  // Links
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    // Check if this is a mention link
    if (href?.startsWith("mention:")) {
      const userId = href.replace("mention:", "");
      return (
        <Link
          href={`/profile/${userId}`}
          style={{
            fontWeight: 500,
            color: "var(--mantine-color-blue-6)",
            textDecoration: "none",
          }}
        >
          {children}
        </Link>
      );
    }

    // Internal link (starts with /) - use Next.js Link for client-side navigation
    const isInternal = href?.startsWith("/");
    if (isInternal) {
      return (
        <Link
          href={href ?? "/"}
          style={{
            fontWeight: 500,
            color: "var(--mantine-color-blue-6)",
            textDecoration: "none",
          }}
        >
          {children}
        </Link>
      );
    }

    // External link
    return (
      <Anchor
        href={href ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        {children}
        <IconExternalLink size={14} />
      </Anchor>
    );
  },

  // Code blocks
  pre: ({ children }: { children?: React.ReactNode }) => (
    <Code
      block
      mb="md"
      p="md"
      style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontSize: "14px",
        lineHeight: 1.4,
        background: "var(--mantine-color-gray-0)",
        border: "1px solid var(--mantine-color-gray-3)",
      }}
    >
      {children}
    </Code>
  ),

  // Inline code
  code: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    // If it has a className, it's a code block (handled by pre)
    if (className) {
      return <>{children}</>;
    }
    // Otherwise it's inline code
    return <Code>{children}</Code>;
  },

  // Lists
  ul: ({ children }: { children?: React.ReactNode }) => (
    <List mb="md" spacing="sm">
      {children}
    </List>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <List mb="md" spacing="sm" type="ordered">
      {children}
    </List>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <List.Item style={{ marginBottom: "4px" }}>{children}</List.Item>
  ),

  // Blockquotes
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <Blockquote mb="md" mt="md">
      {children}
    </Blockquote>
  ),

  // Horizontal rules
  hr: () => <Divider my="xl" />,

  // Strong/Bold
  strong: ({ children }: { children?: React.ReactNode }) => (
    <Text component="strong" fw={700} style={{ display: "inline" }}>
      {children}
    </Text>
  ),

  // Emphasis/Italic
  em: ({ children }: { children?: React.ReactNode }) => (
    <Text component="em" fs="italic" style={{ display: "inline" }}>
      {children}
    </Text>
  ),

  // Tables
  table: ({ children }: { children?: React.ReactNode }) => (
    <Paper withBorder mb="md" style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        {children}
      </table>
    </Paper>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th
      style={{
        padding: "12px",
        background: "var(--mantine-color-gray-0)",
        borderBottom: "1px solid var(--mantine-color-gray-3)",
        textAlign: "left",
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td
      style={{
        padding: "12px",
        borderBottom: "1px solid var(--mantine-color-gray-2)",
      }}
    >
      {children}
    </td>
  ),
};

function MarkdownRendererComponent({ content }: MarkdownRendererProps) {
  // Memoize preprocessing to avoid running regex on every render
  const preprocessedContent = useMemo(() => {
    return (
      content
        // Convert <aside> tags to properly formatted info blocks
        .replace(
          /<aside>([\s\S]*?)<\/aside>/g,
          (_match: string, asideContent: string) => {
            // Clean up the content and format as an info block
            const cleanContent = asideContent.trim();
            if (!cleanContent) return "";

            // Split content by lines and create a formatted block
            const lines = cleanContent
              .split("\n")
              .filter((line: string) => line.trim());
            const formattedLines = lines
              .map((line: string) => `> ${line.trim()}`)
              .join("\n");

            return `\n\n> **ℹ️ Info**\n${formattedLines}\n\n`;
          },
        )
    );
  }, [content]);

  return (
    <div style={wrapperStyle}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {preprocessedContent}
      </ReactMarkdown>
    </div>
  );
}

// Memoize the entire component - only re-render when content actually changes
export const MarkdownRenderer = memo(MarkdownRendererComponent);
