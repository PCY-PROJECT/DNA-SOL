package com.okg.dnacloud.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.okg.dnacloud.model.ArtifactResponse;
import com.okg.dnacloud.model.DnaPackageInfo;
import com.okg.dnacloud.model.PaymentReceipt;
import com.okg.dnacloud.payment.SolanaPaymentVerifier;
import com.okg.dnacloud.payment.X402VerifyResult;
import com.okg.dnacloud.service.creator.CreatorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArtifactService {

    private final MarketplaceService marketplaceService;
    private final SolanaPaymentVerifier solanaVerifier;
    private final CreatorService creatorService;

    @Value("${dnacloud.artifact-store}")
    private String artifactStore;

    @Value("${dnacloud.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${dnacloud.local-test-mode:false}")
    private boolean localTestMode;

    @Value("${dnacloud.merchant-address:AY5669hoJZMxWnaUGtbefiRj4btzXX5iR8Kh9Mtnc4KV}")
    private String merchantAddress;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ArtifactResponse acquireWithPayment(String packageId, String version, String paymentCredential) {
        log.info("[ArtifactService] start, packageId={}, version={}, localTestMode={}",
                packageId, version, localTestMode);

        DnaPackageInfo pkg = marketplaceService.getById(packageId);
        if (pkg == null) {
            throw new IllegalArgumentException("Package not found: " + packageId);
        }

        if (localTestMode) {
            log.info("[ArtifactService] local-test-mode: skipping payment verification");
            return buildTestResponse(packageId, version, pkg);
        }

        if (paymentCredential == null || paymentCredential.isBlank()) {
            log.info("[ArtifactService] no payment credential, returning 402");
            throw new PaymentRequiredException(packageId, version, pkg);
        }

        // Parse X-PAYMENT header: base64 JSON {provider, txHash, nonce, network, payer}
        SolanaPaymentCredential credential = parseCredential(paymentCredential);
        if (credential == null) {
            throw new IllegalArgumentException("Invalid X-PAYMENT credential format");
        }

        long requiredAtomic = parseAmountToAtomic(pkg.getPrice().getAmount());

        X402VerifyResult verifyResult = solanaVerifier.verifyUsdcTransfer(
                credential.txHash(), requiredAtomic);

        if (!verifyResult.isValid()) {
            log.error("[ArtifactService] payment verification failed: {}", verifyResult.getErrorMessage());
            throw new IllegalStateException("Payment verification failed: " + verifyResult.getErrorMessage());
        }

        String artifactPath = resolveArtifactPath(packageId, version);
        String sha256 = computeSha256(artifactPath);
        String signature = loadSignature(packageId, version);
        String settlementRef = "solana-verified-" + verifyResult.getTxHash();

        PaymentReceipt receipt = PaymentReceipt.builder()
                .txHash(verifyResult.getTxHash())
                .payer(verifyResult.getPayer())
                .amount(verifyResult.getAmount())
                .currency("USDC")
                .network(pkg.getPrice().getNetwork())
                .verifiedAt(Instant.now().toString())
                .settlementRef(settlementRef)
                .build();

        ArtifactResponse response = ArtifactResponse.builder()
                .packageId(packageId)
                .version(version)
                .downloadUrl(baseUrl + "/v1/dna/" + packageId + "/versions/" + version + "/download")
                .signature(signature)
                .sha256(sha256)
                .paymentReceipt(receipt)
                .build();

        try {
            creatorService.recordPayment(
                verifyResult.getPayer(), packageId, version,
                "{\"settlementRef\":\"" + settlementRef + "\",\"txHash\":\"" + verifyResult.getTxHash() + "\"}",
                verifyResult.getTxHash(),
                Long.parseLong(verifyResult.getAmount())
            );
        } catch (Exception e) {
            log.error("[ArtifactService] revenue ledger record failed (non-fatal): {}", e.getMessage());
        }

        log.info("[ArtifactService] done, packageId={}, txHash={}", packageId, verifyResult.getTxHash());
        return response;
    }

    private ArtifactResponse buildTestResponse(String packageId, String version, DnaPackageInfo pkg) {
        String testTxHash = "local-test-" + System.currentTimeMillis();
        PaymentReceipt testReceipt = PaymentReceipt.builder()
                .txHash(testTxHash)
                .payer("local-test-buyer")
                .amount(parseAmountToAtomic(pkg.getPrice().getAmount()) + "")
                .currency("USDC")
                .network(pkg.getPrice().getNetwork())
                .verifiedAt(Instant.now().toString())
                .settlementRef("local-test-settlement-" + testTxHash)
                .build();
        try {
            creatorService.recordPayment(
                "local-test-buyer", packageId, version,
                "{\"settlementRef\":\"local-test-settlement-" + testTxHash + "\"}", testTxHash,
                parseAmountToAtomic(pkg.getPrice().getAmount())
            );
        } catch (Exception e) {
            log.warn("[ArtifactService] local-test revenue record failed (non-fatal): {}", e.getMessage());
        }
        return ArtifactResponse.builder()
                .packageId(packageId)
                .version(version)
                .downloadUrl(baseUrl + "/v1/dna/" + packageId + "/versions/" + version + "/download")
                .signature(loadSignature(packageId, version))
                .sha256(computeSha256(resolveArtifactPath(packageId, version)))
                .paymentReceipt(testReceipt)
                .build();
    }

    @SuppressWarnings("unchecked")
    private SolanaPaymentCredential parseCredential(String base64Credential) {
        try {
            String json = new String(Base64.getDecoder().decode(base64Credential), java.nio.charset.StandardCharsets.UTF_8);
            Map<String, Object> map = objectMapper.readValue(json, Map.class);
            String txHash = (String) map.get("txHash");
            String nonce = (String) map.getOrDefault("nonce", "");
            String network = (String) map.getOrDefault("network", "solana");
            String payer = (String) map.getOrDefault("payer", "unknown");
            if (txHash == null || txHash.isBlank()) return null;
            return new SolanaPaymentCredential(txHash, nonce, network, payer);
        } catch (Exception e) {
            log.error("[ArtifactService] credential parse error: {}", e.getMessage());
            return null;
        }
    }

    private record SolanaPaymentCredential(String txHash, String nonce, String network, String payer) {}

    private String resolveArtifactPath(String packageId, String version) {
        return artifactStore + "/" + packageId + "/" + version + "/package.zip";
    }

    private String computeSha256(String path) {
        try {
            java.io.File file = new java.io.File(path);
            if (!file.exists()) {
                log.warn("[ArtifactService] artifact file not found: {}", path);
                return "sha256-unavailable";
            }
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (java.io.FileInputStream fis = new java.io.FileInputStream(file)) {
                byte[] buf = new byte[8192];
                int n;
                while ((n = fis.read(buf)) != -1) digest.update(buf, 0, n);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (Exception e) {
            log.error("[ArtifactService] sha256 failed: {}", e.getMessage());
            return "sha256-unavailable";
        }
    }

    private String loadSignature(String packageId, String version) {
        return "dnacloud-sig-" + packageId + "-" + version;
    }

    /** Converts display amount string (e.g. "0.001") to atomic USDC units (6 decimals). */
    private long parseAmountToAtomic(String amount) {
        if (amount == null) return 0L;
        try {
            // Use BigDecimal to avoid float precision issues
            java.math.BigDecimal bd = new java.math.BigDecimal(amount)
                    .multiply(java.math.BigDecimal.TEN.pow(6));
            return bd.longValueExact();
        } catch (Exception e) {
            log.warn("[ArtifactService] could not parse amount '{}', defaulting to 0", amount);
            return 0L;
        }
    }
}
