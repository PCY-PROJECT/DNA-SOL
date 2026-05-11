package com.okg.dnacloud.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Verifies Solana USDC payments by querying the Solana RPC getTransaction endpoint.
 *
 * Flow:
 *   1. Client calls OnchainOS `wallet send` → broadcasts USDC TransferChecked to merchant
 *   2. Client includes txSignature in X-PAYMENT header
 *   3. This verifier calls Solana RPC to confirm the transfer happened
 *   4. Checks: merchant received >= requiredAmount, tx not in error state
 */
@Slf4j
@Component
public class SolanaPaymentVerifier {

    @Value("${solana.rpc-url:https://api.mainnet-beta.solana.com}")
    private String rpcUrl;

    @Value("${dnacloud.merchant-address:AY5669hoJZMxWnaUGtbefiRj4btzXX5iR8Kh9Mtnc4KV}")
    private String merchantAddress;

    @Value("${solana.usdc-mint:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v}")
    private String usdcMint;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Verifies that txSignature transferred at least requiredAmountAtomic USDC to the
     * merchant address. Retries up to 3 times to handle not-yet-confirmed transactions.
     */
    public X402VerifyResult verifyUsdcTransfer(String txSignature, long requiredAmountAtomic) {
        log.info("[SolanaPaymentVerifier] verify start, tx={}, required={} atomic USDC",
                txSignature, requiredAmountAtomic);

        if (txSignature == null || txSignature.isBlank()) {
            return X402VerifyResult.builder().valid(false)
                    .errorMessage("txSignature is required").build();
        }

        // Retry up to 3 times waiting for tx confirmation (~400ms slots on devnet)
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                X402VerifyResult result = doVerify(txSignature, requiredAmountAtomic);
                if (result.isValid() || !result.getErrorMessage().contains("not found")) {
                    return result;
                }
                if (attempt < 3) {
                    log.info("[SolanaPaymentVerifier] tx not yet found, retrying ({}/3)...", attempt);
                    Thread.sleep(3000);
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                return X402VerifyResult.builder().valid(false)
                        .errorMessage("Verification interrupted").build();
            }
        }
        return X402VerifyResult.builder().valid(false)
                .errorMessage("Transaction not found after 3 attempts. Please wait for confirmation and retry.").build();
    }

    private X402VerifyResult doVerify(String txSignature, long requiredAmountAtomic) {
        try {
            String requestBody = objectMapper.writeValueAsString(Map.of(
                "jsonrpc", "2.0",
                "id", 1,
                "method", "getTransaction",
                "params", new Object[]{
                    txSignature,
                    Map.of(
                        "encoding", "jsonParsed",
                        "commitment", "confirmed",
                        "maxSupportedTransactionVersion", 0
                    )
                }
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(rpcUrl))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return X402VerifyResult.builder().valid(false)
                        .errorMessage("Solana RPC returned HTTP " + response.statusCode()).build();
            }

            JsonNode root = objectMapper.readTree(response.body());

            if (root.has("error") && !root.get("error").isNull()) {
                return X402VerifyResult.builder().valid(false)
                        .errorMessage("RPC error: " + root.get("error")).build();
            }

            JsonNode result = root.get("result");
            if (result == null || result.isNull()) {
                return X402VerifyResult.builder().valid(false)
                        .errorMessage("Transaction not found: " + txSignature).build();
            }

            // Check on-chain execution result
            JsonNode meta = result.get("meta");
            if (meta == null) {
                return X402VerifyResult.builder().valid(false)
                        .errorMessage("Transaction missing meta").build();
            }
            JsonNode txErr = meta.get("err");
            if (txErr != null && !txErr.isNull()) {
                return X402VerifyResult.builder().valid(false)
                        .errorMessage("Transaction failed on-chain: " + txErr).build();
            }

            // Compute merchant USDC received: postBalance - preBalance
            long receivedAtomic = computeMerchantReceived(
                    meta.get("postTokenBalances"),
                    meta.get("preTokenBalances")
            );

            log.info("[SolanaPaymentVerifier] merchant received={} atomic, required={} atomic",
                    receivedAtomic, requiredAmountAtomic);

            if (receivedAtomic < requiredAmountAtomic) {
                return X402VerifyResult.builder().valid(false)
                        .errorMessage(String.format(
                            "Insufficient payment: received %d, required %d atomic USDC",
                            receivedAtomic, requiredAmountAtomic))
                        .build();
            }

            String payer = extractPayer(result);
            log.info("[SolanaPaymentVerifier] verified OK, payer={}", payer);

            return X402VerifyResult.builder()
                    .valid(true)
                    .txHash(txSignature)
                    .payer(payer)
                    .amount(String.valueOf(receivedAtomic))
                    .currency("USDC")
                    .network("solana")
                    .build();

        } catch (Exception e) {
            log.error("[SolanaPaymentVerifier] error: {}", e.getMessage(), e);
            return X402VerifyResult.builder().valid(false)
                    .errorMessage("Verification error: " + e.getMessage()).build();
        }
    }

    /**
     * Computes total USDC received by the merchant in this transaction.
     * Matches by owner == merchantAddress && mint == usdcMint, sums post-pre deltas.
     */
    private long computeMerchantReceived(JsonNode postBalances, JsonNode preBalances) {
        if (postBalances == null || !postBalances.isArray()) return 0L;

        Map<Integer, Long> preMap = new HashMap<>();
        if (preBalances != null && preBalances.isArray()) {
            for (JsonNode entry : preBalances) {
                if (merchantAddress.equals(entry.path("owner").asText())
                        && usdcMint.equals(entry.path("mint").asText())) {
                    int idx = entry.path("accountIndex").asInt();
                    long amount = entry.path("uiTokenAmount").path("amount").asLong(0);
                    preMap.put(idx, amount);
                }
            }
        }

        long totalReceived = 0L;
        for (JsonNode entry : postBalances) {
            if (merchantAddress.equals(entry.path("owner").asText())
                    && usdcMint.equals(entry.path("mint").asText())) {
                int idx = entry.path("accountIndex").asInt();
                long postAmount = entry.path("uiTokenAmount").path("amount").asLong(0);
                long preAmount = preMap.getOrDefault(idx, 0L);
                long delta = postAmount - preAmount;
                if (delta > 0) totalReceived += delta;
            }
        }
        return totalReceived;
    }

    private String extractPayer(JsonNode result) {
        try {
            JsonNode accountKeys = result.path("transaction").path("message").path("accountKeys");
            if (accountKeys.isArray() && accountKeys.size() > 0) {
                JsonNode first = accountKeys.get(0);
                return first.has("pubkey") ? first.get("pubkey").asText() : first.asText();
            }
        } catch (Exception e) {
            log.warn("[SolanaPaymentVerifier] could not extract payer: {}", e.getMessage());
        }
        return "unknown";
    }
}
