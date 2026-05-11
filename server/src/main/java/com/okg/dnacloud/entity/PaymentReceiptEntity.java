package com.okg.dnacloud.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "payment_receipts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReceiptEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "buyer_address")
    private String buyerAddress;

    @Column(name = "package_id", nullable = false)
    private String packageId;

    @Column(name = "package_version", nullable = false)
    private String packageVersion;

    @Column(name = "creator_wallet", nullable = false)
    private String creatorWallet;

    @Column(name = "gross_amount", nullable = false)
    private Long grossAmount;

    @Column(name = "currency", nullable = false)
    private String currency;

    @Column(name = "network", nullable = false)
    private String network;

    @Column(name = "platform_receiver_address")
    private String platformReceiverAddress;

    @Column(name = "payment_provider")
    private String paymentProvider; // e.g. "solana-onchain"

    @Column(name = "receipt_json", columnDefinition = "TEXT")
    private String receiptJson;

    // Legacy field kept for backward compatibility (nullable)
    @Column(name = "okx_receipt_json", columnDefinition = "TEXT")
    private String okxReceiptJson;

    @Column(name = "tx_hash")
    private String txHash;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public enum PaymentStatus {
        created, verified, settled, failed, refunded_reserved
    }
}
