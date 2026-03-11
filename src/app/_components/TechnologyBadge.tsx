"use client";

import { Badge, type MantineColor } from "@mantine/core";

interface TechnologyBadgeProps {
  technology: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "filled" | "light" | "outline" | "dot";
}

// Map technologies to colors for visual categorization
const getTechnologyColor = (tech: string): MantineColor => {
  const techLower = tech.toLowerCase();

  // Blockchain platforms - blue variants
  if (
    ["ethereum", "polygon", "arbitrum", "optimism", "base"].includes(techLower)
  ) {
    return "blue";
  }

  // Layer 2s and scaling - cyan
  if (["zksync", "starknet", "scroll", "polygon"].includes(techLower)) {
    return "cyan";
  }

  // Privacy tech - indigo
  if (
    ["aztec", "miden", "tornado", "zero-knowledge", "zk"].includes(techLower)
  ) {
    return "indigo";
  }

  // Languages - green variants
  if (
    ["solidity", "typescript", "javascript", "rust", "go", "python"].includes(
      techLower,
    )
  ) {
    return "green";
  }

  // Frontend frameworks - teal
  if (["react", "next.js", "vue", "angular", "next"].includes(techLower)) {
    return "teal";
  }

  // DeFi protocols - orange
  if (
    ["uniswap", "aave", "compound", "curve", "balancer", "defi"].includes(
      techLower,
    )
  ) {
    return "orange";
  }

  // Infrastructure - grape
  if (
    ["ipfs", "the graph", "chainlink", "gelato", "alchemy", "infura"].includes(
      techLower,
    )
  ) {
    return "grape";
  }

  // Other blockchain platforms - pink
  if (
    ["solana", "cosmos", "polkadot", "near", "avalanche"].includes(techLower)
  ) {
    return "pink";
  }

  // AI/ML - red
  if (
    ["ai", "artificial intelligence", "machine learning", "ml"].includes(
      techLower,
    )
  ) {
    return "red";
  }

  // Default color for unknown technologies
  return "gray";
};

export function TechnologyBadge({
  technology,
  size = "sm",
  variant = "light",
}: TechnologyBadgeProps) {
  const color = getTechnologyColor(technology);

  return (
    <Badge
      color={color}
      size={size}
      variant={variant}
      radius="sm"
      style={{
        textTransform: "none",
        fontWeight: 500,
      }}
    >
      {technology}
    </Badge>
  );
}
