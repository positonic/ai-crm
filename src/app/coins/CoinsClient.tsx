"use client";

import { useState } from "react";
import {
  Button,
  Paper,
  Stack,
  Group,
  Text,
  TextInput,
  Alert,
  Loader,
  Badge,
  NumberInput,
  Accordion,
} from "@mantine/core";
import { IconDownload, IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface Category {
  id: string;
  name: string;
  _count: {
    geckoCoins: number;
    sponsors: number;
  };
}

interface CoinsClientProps {
  categories: Category[];
}

export default function CoinsClient({ categories }: CoinsClientProps) {
  const [category, setCategory] = useState<string>("layer-1");
  const [perPage, setPerPage] = useState<number>(50);
  const [isLoading, setIsLoading] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<{
    success: boolean;
    category: string;
    coinsInserted: number;
    message?: string;
  } | null>(null);

  const utils = api.useUtils();

  const fetchCoinsMutation =
    api.coinGecko.fetchAndStoreCategoryCoins.useMutation({
      onSuccess: (data) => {
        setLastImportResult({
          success: true,
          category: data.category,
          coinsInserted: data.coinsInserted,
        });
        // Invalidate queries to refresh the data
        void utils.coinGecko.getGeckoCoins.invalidate();
        void utils.coinGecko.getCategories.invalidate();
        setIsLoading(false);
      },
      onError: (error) => {
        setLastImportResult({
          success: false,
          category: category,
          coinsInserted: 0,
          message: error.message,
        });
        setIsLoading(false);
      },
    });

  const handleImportCoins = async () => {
    if (!category.trim()) {
      setLastImportResult({
        success: false,
        category: category,
        coinsInserted: 0,
        message: "Please enter a category name",
      });
      return;
    }

    setIsLoading(true);
    setLastImportResult(null);

    fetchCoinsMutation.mutate({
      category: category.trim(),
      perPage: perPage,
    });
  };

  // Popular crypto categories for quick selection
  const popularCategories = [
    "layer-1",
    "defi",
    "smart-contracts",
    "ethereum-ecosystem",
    "binance-smart-chain",
    "solana-ecosystem",
    "polkadot-ecosystem",
    "cosmos-ecosystem",
    "avalanche-ecosystem",
    "nft",
    "gaming",
    "memes",
    "stablecoins",
    "exchange-based-tokens",
  ];

  return (
    <Accordion defaultValue="import">
      <Accordion.Item value="import">
        <Accordion.Control>
          <Group justify="space-between" align="center">
            <Text fw={500} size="lg">
              Import Coins from the CoinGecko
            </Text>
            <Badge variant="light" color="blue">
              CoinGecko API
            </Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Paper shadow="xs" p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group align="end" gap="md">
                <TextInput
                  label="Category"
                  placeholder="Enter category name (e.g., layer-1, defi, nft)"
                  value={category}
                  onChange={(event) => setCategory(event.currentTarget.value)}
                  style={{ flex: 1 }}
                />

                <NumberInput
                  label="Coins per page"
                  placeholder="50"
                  value={perPage}
                  onChange={(value) => setPerPage(Number(value) || 50)}
                  min={1}
                  max={250}
                  style={{ width: 140 }}
                />

                <Button
                  leftSection={
                    isLoading ? (
                      <Loader size={16} />
                    ) : (
                      <IconDownload size={16} />
                    )
                  }
                  onClick={handleImportCoins}
                  loading={isLoading}
                  disabled={!category.trim()}
                >
                  Import Coins
                </Button>
              </Group>

              <Group gap="xs">
                <Text size="sm" fw={500}>
                  Popular categories:
                </Text>
                {popularCategories.slice(0, 8).map((cat) => (
                  <Badge
                    key={cat}
                    variant="light"
                    color="blue"
                    style={{ cursor: "pointer" }}
                    onClick={() => setCategory(cat)}
                    size="sm"
                  >
                    {cat}
                  </Badge>
                ))}
              </Group>

              <Text size="sm" c="dimmed">
                Import cryptocurrency data from CoinGecko for a specific
                category. Popular categories include layer-1, defi,
                smart-contracts, nft, gaming, and more.
              </Text>

              {lastImportResult && (
                <Alert
                  icon={
                    lastImportResult.success ? (
                      <IconCheck size={16} />
                    ) : (
                      <IconAlertCircle size={16} />
                    )
                  }
                  title={
                    lastImportResult.success
                      ? "Import Successful"
                      : "Import Failed"
                  }
                  color={lastImportResult.success ? "green" : "red"}
                >
                  {lastImportResult.success ? (
                    <Stack gap="xs">
                      <Text>
                        Successfully imported{" "}
                        <strong>{lastImportResult.coinsInserted}</strong> coins
                        from the <strong>{lastImportResult.category}</strong>{" "}
                        category.
                      </Text>
                    </Stack>
                  ) : (
                    <Text>
                      Failed to import coins from{" "}
                      <strong>{lastImportResult.category}</strong> category.
                      {lastImportResult.message && (
                        <>
                          <br />
                          <Text size="sm" c="dimmed" mt="xs">
                            Error: {lastImportResult.message}
                          </Text>
                        </>
                      )}
                    </Text>
                  )}
                </Alert>
              )}

              {categories.length > 0 && (
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Existing Categories:
                  </Text>
                  <Group gap="xs">
                    {categories.map((cat) => (
                      <Badge
                        key={cat.id}
                        variant="light"
                        color="purple"
                        style={{ cursor: "pointer" }}
                        onClick={() => setCategory(cat.name)}
                      >
                        {cat.name} ({cat._count.geckoCoins} coins)
                      </Badge>
                    ))}
                  </Group>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
