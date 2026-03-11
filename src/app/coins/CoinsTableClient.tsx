"use client";

import { useState } from "react";
import {
  Table,
  Stack,
  Text,
  Badge,
  Avatar,
  Group,
  Paper,
  Loader,
} from "@mantine/core";
import { api } from "~/trpc/react";
import CategoryFilter from "./CategoryFilter";

interface Category {
  id: string;
  name: string;
  _count: {
    geckoCoins: number;
    sponsors: number;
  };
}

interface GeckoCoin {
  id: string;
  geckoId: string;
  symbol: string;
  name: string;
  image: string | null;
  currentPrice: number | null;
  marketCap: number | null;
  marketCapRank: number | null;
  priceChangePercentage24h: number | null;
  lastUpdated: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sponsorId: string | null;
  sponsor: {
    id: string;
    name: string;
    websiteUrl: string | null;
    logoUrl: string | null;
  } | null;
  categories: Array<{
    id: string;
    categoryId: string;
    geckoId: string;
    createdAt: Date;
    category: {
      id: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }>;
}

interface CoinsTableClientProps {
  categories: Category[];
}

export default function CoinsTableClient({
  categories,
}: CoinsTableClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const {
    data: geckoCoins,
    isLoading,
    isFetching,
  } = api.coinGecko.getGeckoCoins.useQuery({
    categoryName: selectedCategory ?? undefined,
    limit: 100,
  });

  // Transform coins into table data format for Mantine Table
  const tableData = geckoCoins
    ? {
        head: [
          "Coin",
          "Symbol",
          "Price",
          "Market Cap",
          "Rank",
          "Categories",
          "Organization",
          "Last Updated",
        ],
        body: geckoCoins.map((coin: GeckoCoin) => [
          // Coin column with image and name
          <Group gap="sm" key={`coin-${coin.id}`}>
            <Avatar src={coin.image} size="sm" radius="xl">
              {coin.symbol.toUpperCase()}
            </Avatar>
            <Stack gap={0}>
              <Text fw={500} size="sm">
                {coin.name}
              </Text>
              <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                {coin.geckoId}
              </Text>
            </Stack>
          </Group>,
          // Symbol column
          <Text
            fw={500}
            style={{ fontFamily: "monospace" }}
            key={`symbol-${coin.id}`}
          >
            {coin.symbol.toUpperCase()}
          </Text>,
          // Price column
          coin.currentPrice ? (
            <Text
              fw={500}
              color={
                coin.priceChangePercentage24h &&
                coin.priceChangePercentage24h > 0
                  ? "green"
                  : "red"
              }
              key={`price-${coin.id}`}
            >
              $
              {coin.currentPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}
            </Text>
          ) : (
            <Text c="dimmed" key={`no-price-${coin.id}`}>
              -
            </Text>
          ),
          // Market Cap column
          coin.marketCap ? (
            <Text key={`mcap-${coin.id}`}>
              ${(coin.marketCap / 1_000_000_000).toFixed(2)}B
            </Text>
          ) : (
            <Text c="dimmed" key={`no-mcap-${coin.id}`}>
              -
            </Text>
          ),
          // Rank column
          coin.marketCapRank ? (
            <Badge
              variant="light"
              color="blue"
              size="sm"
              key={`rank-${coin.id}`}
            >
              #{coin.marketCapRank}
            </Badge>
          ) : (
            <Text c="dimmed" key={`no-rank-${coin.id}`}>
              -
            </Text>
          ),
          // Categories column
          <Group gap="xs" key={`categories-${coin.id}`}>
            {coin.categories.length > 0 ? (
              coin.categories.map(
                (catCoin: { category: { id: string; name: string } }) => (
                  <Badge
                    key={`cat-${catCoin.category.id}`}
                    variant="light"
                    color="purple"
                    size="xs"
                  >
                    {catCoin.category.name}
                  </Badge>
                ),
              )
            ) : (
              <Text c="dimmed" size="xs">
                No categories
              </Text>
            )}
          </Group>,
          // Sponsor column
          coin.sponsor ? (
            <Group gap="xs" key={`sponsor-${coin.sponsor.id}`}>
              <Avatar src={coin.sponsor.logoUrl} size="xs" radius="xl">
                {coin.sponsor.name[0]?.toUpperCase()}
              </Avatar>
              <Text size="xs" fw={500}>
                {coin.sponsor.name}
              </Text>
            </Group>
          ) : (
            <Text c="dimmed" size="xs">
              No sponsor
            </Text>
          ),
          // Last Updated column
          coin.lastUpdated ? (
            <Text size="xs" c="dimmed" key={`updated-${coin.id}`}>
              {coin.lastUpdated.toLocaleDateString()}
            </Text>
          ) : (
            <Text c="dimmed" size="xs" key={`no-update-${coin.id}`}>
              -
            </Text>
          ),
        ]),
      }
    : null;

  return (
    <Paper shadow="xs" p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
          <Text fw={500} size="lg">
            Imported Coins ({geckoCoins?.length ?? 0})
          </Text>
        </Group>
        {isLoading || isFetching ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : tableData && tableData.body.length > 0 ? (
          <Table
            data={tableData}
            striped
            highlightOnHover
            withTableBorder
            withColumnBorders
            style={{ fontSize: "14px" }}
          />
        ) : (
          <Text ta="center" c="dimmed" py="xl">
            No coins found for this category.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
