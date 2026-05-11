import type { DnaSearchResult, DnaManifest } from '@dnacloud/schema';

export interface MarketplaceClientConfig {
  baseUrl: string;
}

/** Solana payment requirement returned in HTTP 402 response body. */
export interface SolanaPaymentRequirement {
  network: string;         // e.g. "solana-devnet"
  chain: string;           // "solana"
  payTo: string;           // merchant Solana address
  asset: string;           // "USDC"
  mint: string;            // USDC mint address
  amount_atomic: string;   // atomic units (6 decimals), e.g. "1000"
  amount_display: string;  // e.g. "0.001 USDC"
  nonce: string;           // correlation ID
  expires_at: string;      // ISO timestamp
}

export class MarketplaceClient {
  constructor(private readonly config: MarketplaceClientConfig) {}

  async search(query: string): Promise<DnaSearchResult[]> {
    const url = `${this.config.baseUrl}/v1/dna/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Marketplace search failed: ${res.status} ${res.statusText}`);
    return res.json() as Promise<DnaSearchResult[]>;
  }

  async getManifest(packageId: string): Promise<DnaManifest> {
    const url = `${this.config.baseUrl}/v1/dna/${packageId}`;
    const res = await fetch(url);
    if (res.status === 404) throw new Error(`Package not found: ${packageId}`);
    if (!res.ok) throw new Error(`Failed to fetch package: ${res.status}`);
    return res.json() as Promise<DnaManifest>;
  }

  /**
   * First call without payment. Returns either the 402 payment requirement
   * (Solana USDC) or the artifact data if the package is free.
   */
  async requestArtifact(
    packageId: string,
    version: string
  ): Promise<
    | { type: 'payment_required'; requirement: SolanaPaymentRequirement }
    | { type: 'success'; data: ArtifactData }
  > {
    const url = `${this.config.baseUrl}/v1/dna/${packageId}/versions/${version}/artifact`;
    const res = await fetch(url);

    if (res.status === 402) {
      const body = await res.json() as { error: string; payment: SolanaPaymentRequirement };
      if (!body.payment) throw new Error('Server returned 402 but missing payment requirement');
      return { type: 'payment_required', requirement: body.payment };
    }

    if (!res.ok) {
      const body = await res.json() as { error?: string };
      throw new Error(`Artifact request failed: ${body.error ?? res.statusText}`);
    }
    return { type: 'success', data: await res.json() as ArtifactData };
  }

  /**
   * Retry with X-PAYMENT credential after the Solana tx is submitted.
   * credential is base64({ provider, txHash, nonce, network, payer }).
   */
  async getArtifactWithPayment(
    packageId: string,
    version: string,
    paymentCredential: string
  ): Promise<ArtifactData> {
    const url = `${this.config.baseUrl}/v1/dna/${packageId}/versions/${version}/artifact`;
    const res = await fetch(url, {
      headers: { 'X-PAYMENT': paymentCredential },
    });

    if (res.status === 402) {
      const body = await res.json() as { error?: string; message?: string };
      throw new Error(`Payment rejected: ${body.message ?? body.error ?? 'unknown'}`);
    }
    if (!res.ok) {
      const body = await res.json() as { error?: string };
      throw new Error(`Artifact download failed: ${body.error ?? res.statusText}`);
    }

    return res.json() as Promise<ArtifactData>;
  }
}

export interface ArtifactData {
  packageId: string;
  version: string;
  downloadUrl: string;
  signature: string;
  sha256: string;
  paymentReceipt: {
    txHash: string;
    payer: string;
    amount: string;
    currency: string;
    network: string;
    verifiedAt: string;
    settlementRef: string;
  };
}

/** Build base64 X-PAYMENT credential from a confirmed Solana txHash. */
export function buildSolanaPaymentCredential(params: {
  txHash: string;
  nonce: string;
  network: string;
  payer?: string;
}): string {
  const payload = {
    provider: 'solana-onchain',
    txHash: params.txHash,
    nonce: params.nonce,
    network: params.network,
    payer: params.payer ?? 'unknown',
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
