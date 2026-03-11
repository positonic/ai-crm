import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// TypeScript types based on CoinGecko API response
const RoiSchema = z
  .object({
    times: z.number(),
    currency: z.string(),
    percentage: z.number(),
  })
  .nullable();

const CoinGeckoApiResponseSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  image: z.string(),
  current_price: z.number().nullable(),
  market_cap: z.number().nullable(),
  market_cap_rank: z.number().nullable(),
  fully_diluted_valuation: z.number().nullable(),
  total_volume: z.number().nullable(),
  high_24h: z.number().nullable(),
  low_24h: z.number().nullable(),
  price_change_24h: z.number().nullable(),
  price_change_percentage_24h: z.number().nullable(),
  market_cap_change_24h: z.number().nullable(),
  market_cap_change_percentage_24h: z.number().nullable(),
  circulating_supply: z.number().nullable(),
  total_supply: z.number().nullable(),
  max_supply: z.number().nullable(),
  ath: z.number().nullable(),
  ath_change_percentage: z.number().nullable(),
  ath_date: z.string().nullable(),
  atl: z.number().nullable(),
  atl_change_percentage: z.number().nullable(),
  atl_date: z.string().nullable(),
  roi: RoiSchema,
  last_updated: z.string(),
});

export const coinGeckoRouter = createTRPCRouter({
  fetchAndStoreCategoryCoins: publicProcedure
    .input(
      z.object({
        category: z.string(),
        vsCurrency: z.string().default("usd"),
        order: z.string().default("market_cap_desc"),
        perPage: z.number().min(1).max(250).default(250),
        page: z.number().min(1).default(1),
        sparkline: z.boolean().default(false),
        locale: z.string().default("en"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const apiKey = process.env.COIN_GEKCO_CAP_API_KEY;
      if (!apiKey) {
        throw new Error("CoinGecko API key is not configured");
      }

      const baseUrl = "https://api.coingecko.com/api/v3/coins/markets";

      const url = new URL(baseUrl);
      url.searchParams.append("vs_currency", input.vsCurrency);
      url.searchParams.append("category", input.category);
      url.searchParams.append("order", input.order);
      url.searchParams.append("per_page", input.perPage.toString());
      url.searchParams.append("page", input.page.toString());
      url.searchParams.append("sparkline", input.sparkline.toString());
      url.searchParams.append("locale", input.locale);

      try {
        const response = await fetch(url.toString(), {
          headers: {
            accept: "application/json",
            "x-cg-demo-api-key": apiKey,
          } as HeadersInit,
        });

        if (!response.ok) {
          throw new Error(
            `CoinGecko API error: ${response.status} ${response.statusText}`,
          );
        }

        const data = (await response.json()) as unknown;
        const coins = z.array(CoinGeckoApiResponseSchema).parse(data);

        // Create or get the category
        const category = await ctx.db.category.upsert({
          where: { name: input.category },
          update: {},
          create: { name: input.category },
        });

        // No longer link all sponsors to this category as part of coin import

        const insertedCoins = [];

        for (const coin of coins) {
          // Upsert the sponsor for this coin (by name, unique)
          const sponsor = await ctx.db.sponsor.upsert({
            where: { name: coin.name },
            update: {
              logoUrl: coin.image,
              websiteUrl: undefined, // You can set this if you have a URL field from CoinGecko
            },
            create: {
              name: coin.name,
              logoUrl: coin.image,
              websiteUrl: undefined, // You can set this if you have a URL field from CoinGecko
            },
          });

          // Upsert the coin data, linking to the sponsor
          const geckoCoin = await ctx.db.geckoCoin.upsert({
            where: { geckoId: coin.id },
            update: {
              symbol: coin.symbol,
              name: coin.name,
              image: coin.image,
              currentPrice: coin.current_price,
              marketCap: coin.market_cap,
              marketCapRank: coin.market_cap_rank,
              fullyDilutedValuation: coin.fully_diluted_valuation,
              totalVolume: coin.total_volume,
              high24h: coin.high_24h,
              low24h: coin.low_24h,
              priceChange24h: coin.price_change_24h,
              priceChangePercentage24h: coin.price_change_percentage_24h,
              marketCapChange24h: coin.market_cap_change_24h,
              marketCapChangePercentage24h:
                coin.market_cap_change_percentage_24h,
              circulatingSupply: coin.circulating_supply,
              totalSupply: coin.total_supply,
              maxSupply: coin.max_supply,
              ath: coin.ath,
              athChangePercentage: coin.ath_change_percentage,
              athDate: coin.ath_date ? new Date(coin.ath_date) : null,
              atl: coin.atl,
              atlChangePercentage: coin.atl_change_percentage,
              atlDate: coin.atl_date ? new Date(coin.atl_date) : null,
              roiTimes: coin.roi?.times ?? null,
              roiCurrency: coin.roi?.currency ?? null,
              roiPercentage: coin.roi?.percentage ?? null,
              lastUpdated: new Date(coin.last_updated),
              sponsorId: sponsor.id,
            },
            create: {
              geckoId: coin.id,
              symbol: coin.symbol,
              name: coin.name,
              image: coin.image,
              currentPrice: coin.current_price,
              marketCap: coin.market_cap,
              marketCapRank: coin.market_cap_rank,
              fullyDilutedValuation: coin.fully_diluted_valuation,
              totalVolume: coin.total_volume,
              high24h: coin.high_24h,
              low24h: coin.low_24h,
              priceChange24h: coin.price_change_24h,
              priceChangePercentage24h: coin.price_change_percentage_24h,
              marketCapChange24h: coin.market_cap_change_24h,
              marketCapChangePercentage24h:
                coin.market_cap_change_percentage_24h,
              circulatingSupply: coin.circulating_supply,
              totalSupply: coin.total_supply,
              maxSupply: coin.max_supply,
              ath: coin.ath,
              athChangePercentage: coin.ath_change_percentage,
              athDate: coin.ath_date ? new Date(coin.ath_date) : null,
              atl: coin.atl,
              atlChangePercentage: coin.atl_change_percentage,
              atlDate: coin.atl_date ? new Date(coin.atl_date) : null,
              roiTimes: coin.roi?.times ?? null,
              roiCurrency: coin.roi?.currency ?? null,
              roiPercentage: coin.roi?.percentage ?? null,
              lastUpdated: new Date(coin.last_updated),
              sponsorId: sponsor.id,
            },
          });

          // Link the coin to the category
          await ctx.db.categoryGeckoCoin.upsert({
            where: {
              categoryId_geckoId: {
                categoryId: category.id,
                geckoId: geckoCoin.id,
              },
            },
            update: {},
            create: {
              categoryId: category.id,
              geckoId: geckoCoin.id,
            },
          });

          insertedCoins.push(geckoCoin);
        }

        return {
          success: true,
          category: category.name,
          coinsInserted: insertedCoins.length,
          coins: insertedCoins,
        };
      } catch (error) {
        console.error("Error fetching CoinGecko data:", error);
        throw new Error(
          `Failed to fetch and store CoinGecko data: ${String(error)}`,
        );
      }
    }),

  getGeckoCoins: publicProcedure
    .input(
      z.object({
        categoryName: z.string().optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = input.categoryName
        ? {
            categories: {
              some: {
                category: {
                  name: input.categoryName,
                },
              },
            },
          }
        : {};

      const coins = await ctx.db.geckoCoin.findMany({
        where,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          sponsor: true,
        },
        orderBy: {
          marketCapRank: "asc",
        },
        take: input.limit,
        skip: input.offset,
      });

      return coins;
    }),

  linkSponsorToCategory: publicProcedure
    .input(
      z.object({
        sponsorId: z.string(),
        categoryId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sponsorCategory = await ctx.db.sponsorCategory.upsert({
        where: {
          sponsorId_categoryId: {
            sponsorId: input.sponsorId,
            categoryId: input.categoryId,
          },
        },
        update: {},
        create: {
          sponsorId: input.sponsorId,
          categoryId: input.categoryId,
        },
        include: {
          sponsor: true,
          category: true,
        },
      });

      return sponsorCategory;
    }),

  getCategories: publicProcedure.query(async ({ ctx }) => {
    const categories = await ctx.db.category.findMany({
      include: {
        _count: {
          select: {
            geckoCoins: true,
            sponsors: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return categories;
  }),
});
