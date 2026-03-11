/**
 * EAS Service Unit Tests
 *
 * Tests the EASService class with mocked EAS SDK and ethers dependencies.
 * These tests verify the service logic without interacting with the blockchain.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock environment variables before importing the service
vi.mock("~/env", () => ({
  env: {
    EAS_PRIVATE_KEY:
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    EAS_USE_MAINNET: "false",
    EAS_ATTESTATIONS_ENABLED: "true",
    EAS_SCHEMA_UID:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  },
}));

// Mock ethers
vi.mock("ethers", () => {
  const mockWallet = {
    getAddress: vi
      .fn()
      .mockResolvedValue("0x1234567890123456789012345678901234567890"),
  };

  return {
    ethers: {
      JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
      Wallet: vi.fn().mockImplementation(() => mockWallet),
      ZeroAddress: "0x0000000000000000000000000000000000000000",
    },
  };
});

// Mock EAS SDK
vi.mock("@ethereum-attestation-service/eas-sdk", () => {
  const mockTransaction = {
    wait: vi.fn().mockResolvedValue("0xattestation-uid-123"),
    tx: { hash: "0xtxhash123" },
  };

  const mockSchemaTransaction = {
    wait: vi.fn().mockResolvedValue("0xschema-uid-456"),
  };

  return {
    EAS: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      attest: vi.fn().mockResolvedValue(mockTransaction),
    })),
    SchemaRegistry: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      register: vi.fn().mockResolvedValue(mockSchemaTransaction),
    })),
    SchemaEncoder: vi.fn().mockImplementation(() => ({
      encodeData: vi.fn().mockReturnValue("0xencoded-data"),
    })),
  };
});

// Import after mocking
import {
  EASService,
  createEASService,
  REPO_ACTIVITY_SCHEMA,
  type RepoActivityData,
} from "../eas";

describe("EASService", () => {
  let service: EASService;

  beforeEach(() => {
    service = new EASService(true); // Use testnet
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with testnet configuration", () => {
      const testService = new EASService(true);
      expect(testService).toBeDefined();
    });

    it("should initialize with mainnet configuration", () => {
      const mainnetService = new EASService(false);
      expect(mainnetService).toBeDefined();
    });
  });

  describe("getSignerAddress", () => {
    it("should return the signer wallet address", async () => {
      const address = await service.getSignerAddress();
      expect(address).toBe("0x1234567890123456789012345678901234567890");
    });
  });

  describe("registerSchema", () => {
    it("should register schema and return UID", async () => {
      const schemaUid = await service.registerSchema();
      expect(schemaUid).toBe("0xschema-uid-456");
      expect(service.getSchemaUid()).toBe("0xschema-uid-456");
    });
  });

  describe("setSchemaUid", () => {
    it("should set the schema UID", () => {
      const uid = "0xtest-schema-uid";
      service.setSchemaUid(uid);
      expect(service.getSchemaUid()).toBe(uid);
    });
  });

  describe("createAttestation", () => {
    const testData: RepoActivityData = {
      projectId: "project-123",
      repositoryId: "repo-456",
      totalCommits: 100,
      lastCommitDate: new Date("2025-01-15T10:00:00Z"),
      weeksActive: 12,
      isActive: true,
      snapshotDate: new Date("2025-01-20T12:00:00Z"),
      isRetroactive: false,
    };

    it("should throw error if schema UID is not set", async () => {
      await expect(service.createAttestation(testData)).rejects.toThrow(
        "Schema UID not set",
      );
    });

    it("should create attestation with valid data", async () => {
      service.setSchemaUid("0xtest-schema-uid");

      const result = await service.createAttestation(testData);

      expect(result.uid).toBe("0xattestation-uid-123");
      expect(result.txHash).toBe("0xtxhash123");
    });

    it("should handle null lastCommitDate", async () => {
      service.setSchemaUid("0xtest-schema-uid");

      const dataWithNullDate: RepoActivityData = {
        ...testData,
        lastCommitDate: null,
      };

      const result = await service.createAttestation(dataWithNullDate);

      expect(result.uid).toBeDefined();
    });

    it("should handle null weeksActive", async () => {
      service.setSchemaUid("0xtest-schema-uid");

      const dataWithNullWeeks: RepoActivityData = {
        ...testData,
        weeksActive: null,
      };

      const result = await service.createAttestation(dataWithNullWeeks);

      expect(result.uid).toBeDefined();
    });

    it("should handle retroactive attestations", async () => {
      service.setSchemaUid("0xtest-schema-uid");

      const retroactiveData: RepoActivityData = {
        ...testData,
        isRetroactive: true,
      };

      const result = await service.createAttestation(retroactiveData);

      expect(result.uid).toBeDefined();
    });
  });

  describe("getExplorerUrl", () => {
    it("should return testnet explorer URL", () => {
      const testService = new EASService(true);
      const url = testService.getExplorerUrl("0xattestation-uid");
      expect(url).toBe(
        "https://optimism-sepolia.easscan.org/attestation/view/0xattestation-uid",
      );
    });

    it("should return mainnet explorer URL", () => {
      const mainnetService = new EASService(false);
      const url = mainnetService.getExplorerUrl("0xattestation-uid");
      expect(url).toBe(
        "https://optimism.easscan.org/attestation/view/0xattestation-uid",
      );
    });
  });

  describe("getSchemaExplorerUrl", () => {
    it("should return testnet schema explorer URL", () => {
      const testService = new EASService(true);
      const url = testService.getSchemaExplorerUrl("0xschema-uid");
      expect(url).toBe(
        "https://optimism-sepolia.easscan.org/schema/view/0xschema-uid",
      );
    });

    it("should return mainnet schema explorer URL", () => {
      const mainnetService = new EASService(false);
      const url = mainnetService.getSchemaExplorerUrl("0xschema-uid");
      expect(url).toBe("https://optimism.easscan.org/schema/view/0xschema-uid");
    });
  });
});

describe("createEASService", () => {
  it("should create service with testnet by default", () => {
    const service = createEASService();
    expect(service).toBeInstanceOf(EASService);
  });
});

describe("REPO_ACTIVITY_SCHEMA", () => {
  it("should contain all required fields", () => {
    expect(REPO_ACTIVITY_SCHEMA).toContain("projectId");
    expect(REPO_ACTIVITY_SCHEMA).toContain("repositoryId");
    expect(REPO_ACTIVITY_SCHEMA).toContain("totalCommits");
    expect(REPO_ACTIVITY_SCHEMA).toContain("lastCommitTimestamp");
    expect(REPO_ACTIVITY_SCHEMA).toContain("weeksActive");
    expect(REPO_ACTIVITY_SCHEMA).toContain("isActive");
    expect(REPO_ACTIVITY_SCHEMA).toContain("snapshotTimestamp");
    expect(REPO_ACTIVITY_SCHEMA).toContain("isRetroactive");
  });
});
