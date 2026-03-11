"use client";

import { Alert, Container } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { Hyperboard } from "~/app/_components/Hyperboard";
import { type HyperboardConfig } from "../HyperboardPlaygroundClient";

interface PreviewPanelProps {
  config: HyperboardConfig;
}

export function PreviewPanel({ config }: PreviewPanelProps) {
  const handleLabelClick = () => {
    console.log("Label clicked - config:", config);
  };

  if (config.data.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconRefresh size={16} />} title="No Data" color="yellow">
          Please select a sample preset or import custom data to see the
          hyperboard visualization.
        </Alert>
      </Container>
    );
  }

  return (
    <Hyperboard
      data={config.data}
      height={config.height}
      label={config.label}
      onClickLabel={handleLabelClick}
      grayscaleImages={config.grayscaleImages}
      borderColor={config.borderColor}
      borderWidth={config.borderWidth}
      imageObjectFit={config.imageObjectFit}
      logoSize={config.logoSize}
    />
  );
}
