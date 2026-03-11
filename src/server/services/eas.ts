/**
 * EAS (Ethereum Attestation Service) Service
 *
 * Creates on-chain attestations for repository activity metrics.
 * Uses server-side signing with a platform wallet.
 *
 * References:
 * - EAS SDK: https://github.com/ethereum-attestation-service/eas-sdk
 * - EAS Docs: https://docs.attest.org/docs/developer-tools/eas-sdk
 * - Optimism EAS: https://docs.optimism.io/chain/identity/contracts-eas
 */

import {
  EAS,
  SchemaEncoder,
  SchemaRegistry,
} from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import { env } from "~/env";

// Contract addresses for Optimism
// See: https://docs.optimism.io/chain/identity/contracts-eas
const OPTIMISM_MAINNET = {
  EAS: "0x4200000000000000000000000000000000000021",
  SCHEMA_REGISTRY: "0x4200000000000000000000000000000000000020",
  RPC_URL: "https://mainnet.optimism.io",
  CHAIN_ID: 10,
};

// Optimism Sepolia testnet
const OPTIMISM_SEPOLIA = {
  EAS: "0x4200000000000000000000000000000000000021",
  SCHEMA_REGISTRY: "0x4200000000000000000000000000000000000020",
  RPC_URL: "https://sepolia.optimism.io",
  CHAIN_ID: 11155420,
};

// Schema for repository activity attestations
// This defines the structure of data stored on-chain
export const REPO_ACTIVITY_SCHEMA =
  "string projectId, string repositoryId, uint32 totalCommits, uint64 lastCommitTimestamp, uint16 weeksActive, bool isActive, uint64 snapshotTimestamp, bool isRetroactive";

export interface RepoActivityData {
  projectId: string;
  repositoryId: string;
  totalCommits: number;
  lastCommitDate: Date | null;
  weeksActive: number | null;
  isActive: boolean;
  snapshotDate: Date;
  isRetroactive?: boolean;
}

export interface AttestationResult {
  uid: string;
  txHash: string;
}

export class EASService {
  private eas: EAS;
  private schemaRegistry: SchemaRegistry;
  private signer: ethers.Wallet;
  private schemaEncoder: SchemaEncoder;
  private network: typeof OPTIMISM_MAINNET;
  private schemaUid: string | null = null;

  constructor(useTestnet = false) {
    this.network = useTestnet ? OPTIMISM_SEPOLIA : OPTIMISM_MAINNET;

    // Validate environment
    if (!env.EAS_PRIVATE_KEY) {
      throw new Error("EAS_PRIVATE_KEY environment variable is required");
    }

    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(this.network.RPC_URL);
    this.signer = new ethers.Wallet(env.EAS_PRIVATE_KEY, provider);

    // Initialize EAS and SchemaRegistry
    this.eas = new EAS(this.network.EAS);
    this.eas.connect(this.signer);

    this.schemaRegistry = new SchemaRegistry(this.network.SCHEMA_REGISTRY);
    this.schemaRegistry.connect(this.signer);

    // Initialize schema encoder
    this.schemaEncoder = new SchemaEncoder(REPO_ACTIVITY_SCHEMA);
  }

  /**
   * Get the wallet address used for signing attestations
   */
  async getSignerAddress(): Promise<string> {
    return this.signer.getAddress();
  }

  /**
   * Register the repo activity schema on EAS
   * Only needs to be called once per chain
   */
  async registerSchema(): Promise<string> {
    console.log("Registering schema on EAS...");
    console.log(`Schema: ${REPO_ACTIVITY_SCHEMA}`);

    const transaction = await this.schemaRegistry.register({
      schema: REPO_ACTIVITY_SCHEMA,
      resolverAddress: ethers.ZeroAddress, // No resolver
      revocable: false, // Attestations cannot be revoked
    });

    const receipt = await transaction.wait();
    this.schemaUid = receipt;

    console.log(`Schema registered with UID: ${this.schemaUid}`);
    return this.schemaUid;
  }

  /**
   * Set the schema UID to use for attestations
   * Call this if the schema is already registered
   */
  setSchemaUid(uid: string): void {
    this.schemaUid = uid;
  }

  /**
   * Get the current schema UID
   */
  getSchemaUid(): string | null {
    return this.schemaUid;
  }

  /**
   * Create an on-chain attestation for repository activity
   */
  async createAttestation(data: RepoActivityData): Promise<AttestationResult> {
    if (!this.schemaUid) {
      throw new Error(
        "Schema UID not set. Call registerSchema() or setSchemaUid() first.",
      );
    }

    // Encode the attestation data
    const encodedData = this.schemaEncoder.encodeData([
      { name: "projectId", value: data.projectId, type: "string" },
      { name: "repositoryId", value: data.repositoryId, type: "string" },
      { name: "totalCommits", value: data.totalCommits, type: "uint32" },
      {
        name: "lastCommitTimestamp",
        value: data.lastCommitDate
          ? BigInt(Math.floor(data.lastCommitDate.getTime() / 1000))
          : 0n,
        type: "uint64",
      },
      {
        name: "weeksActive",
        value: Math.floor(data.weeksActive ?? 0),
        type: "uint16",
      },
      { name: "isActive", value: data.isActive, type: "bool" },
      {
        name: "snapshotTimestamp",
        value: BigInt(Math.floor(data.snapshotDate.getTime() / 1000)),
        type: "uint64",
      },
      {
        name: "isRetroactive",
        value: data.isRetroactive ?? false,
        type: "bool",
      },
    ]);

    console.log(`Creating attestation for repo ${data.repositoryId}...`);
    console.log(`  Total commits: ${data.totalCommits}`);
    console.log(`  Is active: ${data.isActive}`);
    console.log(`  Snapshot date: ${data.snapshotDate.toISOString()}`);

    // Create the attestation
    const transaction = await this.eas.attest({
      schema: this.schemaUid,
      data: {
        recipient: ethers.ZeroAddress, // No specific recipient
        expirationTime: 0n, // No expiration
        revocable: false,
        data: encodedData,
      },
    });

    // Wait for transaction confirmation
    const uid = await transaction.wait();

    console.log(`Attestation created with UID: ${uid}`);

    // Extract tx hash safely - SDK structure varies between versions
    let txHash = "unknown";
    try {
      const txData = transaction as unknown as {
        tx?: { hash?: string };
        receipt?: { hash?: string };
      };
      txHash = txData.tx?.hash ?? txData.receipt?.hash ?? "unknown";
    } catch {
      // Ignore - txHash is just for logging
    }
    console.log(`Transaction hash: ${txHash}`);

    return {
      uid,
      txHash,
    };
  }

  /**
   * Get the explorer URL for an attestation
   */
  getExplorerUrl(uid: string): string {
    const baseUrl =
      this.network === OPTIMISM_MAINNET
        ? "https://optimism.easscan.org"
        : "https://optimism-sepolia.easscan.org";
    return `${baseUrl}/attestation/view/${uid}`;
  }

  /**
   * Get the explorer URL for a schema
   */
  getSchemaExplorerUrl(schemaUid: string): string {
    const baseUrl =
      this.network === OPTIMISM_MAINNET
        ? "https://optimism.easscan.org"
        : "https://optimism-sepolia.easscan.org";
    return `${baseUrl}/schema/view/${schemaUid}`;
  }
}

/**
 * Create an EASService instance
 * Uses testnet by default unless EAS_USE_MAINNET is set
 */
export function createEASService(): EASService {
  const useTestnet = env.EAS_USE_MAINNET !== "true";
  return new EASService(useTestnet);
}
