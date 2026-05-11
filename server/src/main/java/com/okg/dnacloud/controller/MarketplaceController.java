package com.okg.dnacloud.controller;

import com.okg.dnacloud.model.ArtifactResponse;
import com.okg.dnacloud.model.DnaPackageInfo;
import com.okg.dnacloud.service.ArtifactService;
import com.okg.dnacloud.service.MarketplaceService;
import com.okg.dnacloud.service.PaymentRequiredException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/v1/dna")
@RequiredArgsConstructor
public class MarketplaceController {

    private final MarketplaceService marketplaceService;
    private final ArtifactService artifactService;

    @Value("${dnacloud.artifact-store:./artifacts}")
    private String artifactStore;

    @Value("${dnacloud.merchant-address:AY5669hoJZMxWnaUGtbefiRj4btzXX5iR8Kh9Mtnc4KV}")
    private String merchantAddress;

    @Value("${solana.usdc-mint:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v}")
    private String usdcMint;

    @Value("${solana.network:solana}")
    private String solanaNetwork;

    private static final java.util.regex.Pattern SAFE_ID = java.util.regex.Pattern.compile("^[a-z0-9][a-z0-9\\-]{0,63}$");
    private static final java.util.regex.Pattern SAFE_VER = java.util.regex.Pattern.compile("^\\d+\\.\\d+\\.\\d+([\\-+][a-zA-Z0-9.]+)?$");

    @GetMapping("/search")
    public ResponseEntity<List<DnaPackageInfo>> search(@RequestParam(defaultValue = "") String q) {
        log.info("[MarketplaceController.search] q={}", q);
        return ResponseEntity.ok(marketplaceService.search(q));
    }

    @GetMapping("/{packageId}")
    public ResponseEntity<DnaPackageInfo> getPackage(@PathVariable String packageId) {
        if (!SAFE_ID.matcher(packageId).matches()) return ResponseEntity.badRequest().build();
        DnaPackageInfo pkg = marketplaceService.getById(packageId);
        if (pkg == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(pkg);
    }

    @GetMapping("/{packageId}/versions/{version}/artifact")
    public ResponseEntity<?> getArtifact(
            @PathVariable String packageId,
            @PathVariable String version,
            @RequestHeader(value = "X-PAYMENT", required = false) String xPayment) {

        if (!SAFE_ID.matcher(packageId).matches() || !SAFE_VER.matcher(version).matches()) {
            return ResponseEntity.badRequest().body(Map.of("error", "invalid_package_id_or_version"));
        }

        log.info("[MarketplaceController.getArtifact] packageId={}, version={}, hasPayment={}",
                packageId, version, xPayment != null);

        try {
            ArtifactResponse artifact = artifactService.acquireWithPayment(packageId, version, xPayment);
            return ResponseEntity.ok(artifact);

        } catch (PaymentRequiredException e) {
            DnaPackageInfo pkg = e.getPackageInfo();
            long amountAtomic = parseAmountToAtomic(pkg.getPrice().getAmount());
            String nonce = UUID.randomUUID().toString();

            Map<String, Object> payment = new LinkedHashMap<>();
            payment.put("network", solanaNetwork);
            payment.put("chain", "solana");
            payment.put("payTo", merchantAddress);
            payment.put("asset", "USDC");
            payment.put("mint", usdcMint);
            payment.put("amount_atomic", String.valueOf(amountAtomic));
            payment.put("amount_display", formatDisplayAmount(amountAtomic));
            payment.put("nonce", nonce);
            payment.put("expires_at", Instant.now().plusSeconds(300).toString());

            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                    .body(Map.of(
                        "error", "payment_required",
                        "payment", payment
                    ));

        } catch (IllegalArgumentException e) {
            log.error("[MarketplaceController.getArtifact] bad request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));

        } catch (IllegalStateException e) {
            log.error("[MarketplaceController.getArtifact] payment failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                    .body(Map.of("error", "payment_verification_failed", "message", e.getMessage()));
        }
    }

    @GetMapping("/{packageId}/versions/{version}/download")
    public ResponseEntity<FileSystemResource> downloadArtifact(
            @PathVariable String packageId,
            @PathVariable String version) {

        if (!SAFE_ID.matcher(packageId).matches() || !SAFE_VER.matcher(version).matches()) {
            return ResponseEntity.badRequest().build();
        }

        Path base = Paths.get(artifactStore).toAbsolutePath().normalize();
        Path target = base.resolve(packageId).resolve(version).resolve("package.zip").normalize();
        if (!target.startsWith(base)) {
            log.error("[MarketplaceController.downloadArtifact] path traversal attempt");
            return ResponseEntity.badRequest().build();
        }

        File zipFile = target.toFile();
        if (!zipFile.exists()) {
            log.warn("[MarketplaceController.downloadArtifact] file not found: {}", target);
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + packageId + "-" + version + ".zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new FileSystemResource(zipFile));
    }

    /** Converts display amount (e.g. "0.001") to USDC atomic units (6 decimals). */
    private long parseAmountToAtomic(String amount) {
        try {
            return new BigDecimal(amount).multiply(BigDecimal.TEN.pow(6)).longValueExact();
        } catch (Exception e) {
            log.warn("[MarketplaceController] could not parse amount '{}', using 0", amount);
            return 0L;
        }
    }

    /** Formats atomic USDC to human-readable display string, e.g. 1000 → "0.001 USDC". */
    private String formatDisplayAmount(long atomic) {
        BigDecimal display = new BigDecimal(atomic).movePointLeft(6);
        return display.stripTrailingZeros().toPlainString() + " USDC";
    }
}
