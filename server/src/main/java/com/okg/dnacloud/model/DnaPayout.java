package com.okg.dnacloud.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DnaPayout {
    private String address;   // creator payout address
    private String currency;  // e.g. USDC
    private String network;   // e.g. solana-devnet
    private String asset;     // token mint address on the network
}
