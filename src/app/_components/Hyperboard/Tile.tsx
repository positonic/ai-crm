"use client";

/**
 * Hyperboard Tile Component
 * Individual tile in the treemap visualization with hover effects and tooltips
 */

import { Box, Flex, Image, Text, Tooltip } from "@mantine/core";
import { useHover } from "@uidotdev/usehooks";
import { type HyperboardData } from "./types";
import { formatTooltipLabel, getTileLayout } from "./utils";
import { isAddress } from "~/utils/address";
import { formatAddress } from "./utils";

interface TileProps {
  entry: HyperboardData;
  width: number;
  height: number;
  top: number;
  left: number;
  padding: number;
  grayScale?: boolean;
  borderColor?: string;
  borderWidth?: number;
  imageObjectFit?: "cover" | "contain";
  logoSize?: string;
}

const borderRadius = "0px";

/**
 * Background layer with hover effect
 */
const Background = ({ hovering }: { hovering: boolean }) => {
  return (
    <Box
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        backgroundColor: hovering ? "#3b82f6" : "transparent",
        borderRadius,
        opacity: hovering ? 0.5 : 0,
        zIndex: 0,
        transition: "background-color 0.2s ease, opacity 0.2s ease",
      }}
    />
  );
};

/**
 * Wrapper component for tile positioning and hover state
 */
const Wrapper = ({
  width,
  height,
  top,
  left,
  children,
  borderColor = "white",
  borderWidth = 1.2,
}: {
  width: number;
  height: number;
  top: number;
  left: number;
  borderColor?: string;
  borderWidth?: number;
  children: React.ReactNode;
}) => {
  const [ref, isHover] = useHover();

  return (
    <Flex
      ref={ref}
      style={{
        overflow: "hidden",
        position: "absolute",
        width,
        height,
        top,
        left,
        borderRadius,
        border: `${borderWidth}px solid ${borderColor}`,
      }}
    >
      <Flex style={{ width: "100%", zIndex: 1 }}>{children}</Flex>
      <Background hovering={isHover} />
    </Flex>
  );
};

/**
 * Main Tile component rendering entry data with image or text
 */
export const Tile = ({
  entry,
  padding: _padding,
  grayScale = true,
  imageObjectFit = "contain",
  logoSize = "60%",
  ...wrapperProps
}: TileProps) => {
  const opacity = entry.isBlueprint ? 0.5 : 1;

  const fallback =
    entry.id && isAddress(entry.id)
      ? formatAddress(entry.id)
      : (entry.id ?? "Unknown");
  const name = entry.displayName ?? entry.name ?? fallback;
  const toolTipLabel = formatTooltipLabel(entry.id ?? "unknown", name);
  const layout = getTileLayout(wrapperProps.width, wrapperProps.height);

  // Determine image styles based on objectFit mode
  const imageStyles =
    imageObjectFit === "cover"
      ? {
          width: "100%",
          height: "100%",
          objectFit: "cover" as const,
        }
      : {
          maxWidth: logoSize,
          maxHeight: logoSize,
        };

  return (
    <Wrapper {...wrapperProps}>
      <Flex
        style={{
          color: "red",
          fill: "red",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {entry?.avatar ? (
          <Tooltip label={toolTipLabel}>
            <Image
              src={entry.avatar}
              alt={name}
              style={{
                opacity,
                ...imageStyles,
                filter: grayScale ? `grayscale(${opacity})` : undefined,
              }}
            />
          </Tooltip>
        ) : (
          <Flex
            style={{
              height: "100%",
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Tooltip label={toolTipLabel}>
              <Text
                c="black"
                style={{
                  opacity: 0.99,
                  fontSize: layout.font,
                }}
              >
                {name}
              </Text>
            </Tooltip>
          </Flex>
        )}
      </Flex>
    </Wrapper>
  );
};
