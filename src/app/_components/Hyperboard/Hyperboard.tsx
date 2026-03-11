"use client";

/**
 * Hyperboard Component
 * Main treemap visualization component using D3 for layout calculations
 */

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text } from "@mantine/core";
import _ from "lodash";
import { useMeasure } from "react-use";
import { Tile } from "./Tile";
import { type HyperboardProps, type Leaf, type HyperboardData } from "./types";

export const Hyperboard = (props: HyperboardProps) => {
  const [containerRef, dimensions] = useMeasure<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [leaves, setLeaves] = useState<Leaf[]>([]);

  const padding = 0;

  const formattedData: HyperboardData = {
    name: "root",
    image: "",
    value: 0,
    children: _.sortBy(props.data, (x) => -x.value).map((d) => ({
      ...d,
    })),
  };

  const { height, width } = dimensions;

  // Update D3 layout when dimensions or data change
  const stringifiedData = JSON.stringify(formattedData);
  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    d3.select(svgRef.current)
      .attr("width", props.height)
      .attr("height", props.height)
      .attr("viewBox", `0 0 ${props.height} ${props.height}`);

    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, width, height, stringifiedData]);

  const draw = () => {
    // Use actual measured dimensions or fall back to props.height
    // Note: useMeasure returns 0 initially, not undefined, so we need explicit check
    const effectiveHeight =
      dimensions?.height && dimensions.height > 0
        ? dimensions.height
        : props.height;
    const effectiveWidth =
      dimensions?.width && dimensions.width > 0
        ? dimensions.width
        : props.height;

    if (!effectiveHeight || effectiveHeight === 0) {
      return;
    }

    const root = d3.hierarchy(formattedData).sum(function (d) {
      return Number(d.value);
    });

    // Initialize treemap with squarify algorithm
    // Use effectiveWidth for proper aspect ratio
    d3
      .treemap()
      .tile(d3.treemapSquarify.ratio(1 / 3))
      .size([effectiveWidth, effectiveHeight])
      .paddingInner(padding)(root as d3.HierarchyNode<unknown>);

    const newLeaves = root.leaves() as unknown as Leaf[];
    setLeaves(newLeaves);
  };

  return (
    <Flex
      style={{
        width: "100%",
        height: props.height,
        padding: "0px",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Flex
        style={{
          paddingTop: 4,
          paddingBottom: 4,
          paddingLeft: 4,
          cursor: "pointer",
          textTransform: "uppercase",
          color: "white",
          backgroundColor: "black",
        }}
        onClick={() => props.onClickLabel()}
      >
        <Text>{props.label}</Text>
        <Text ml={24}>{props.data.length}</Text>
      </Flex>
      <Box
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          flex: 1,
          backgroundColor: "transparent",
        }}
      >
        {leaves.map((leaf, index) => {
          const leafWidth = leaf.x1 - leaf.x0;
          return (
            <Tile
              key={index}
              padding={2}
              entry={leaf.data}
              width={leafWidth}
              height={leaf.y1 - leaf.y0}
              top={leaf.y0}
              left={leaf.x0}
              grayScale={props.grayscaleImages}
              borderColor={props.borderColor}
              borderWidth={props.borderWidth}
              imageObjectFit={props.imageObjectFit}
              logoSize={props.logoSize}
            />
          );
        })}
        <svg
          ref={svgRef}
          style={{
            display: "none",
          }}
        />
      </Box>
    </Flex>
  );
};
