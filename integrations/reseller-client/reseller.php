<?php
/**
 * Unskinned reseller client — drop into any PHP product to share income with
 * Unskinned resellers.
 *
 *   $app = new GmtReseller(getenv('APP_PRODUCT_KEY'));
 *   $v = $app->validate($code);                 // ['valid'=>true,'discountPercent'=>10,...]
 *   if ($v['valid']) applyDiscount($v['discountPercent']);
 *   $app->reportSale(['code'=>$code,'amountCents'=>12000,'currency'=>'EUR','externalId'=>$orderId]);
 *
 * Issue the product key in the Unskinned central console → Resellers → Connected products.
 */
class GmtReseller {
  private string $key;
  private string $base;

  public function __construct(string $key, string $base = 'https://example.com') {
    $this->key = $key;
    $this->base = rtrim($base, '/');
  }

  private function req(string $method, string $path, ?array $body = null): array {
    $ch = curl_init($this->base . $path);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 8,
      CURLOPT_CUSTOMREQUEST => $method,
      CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $this->key, 'Content-Type: application/json'],
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $out = curl_exec($ch);
    curl_close($ch);
    $j = json_decode((string)$out, true);
    return is_array($j) ? $j : [];
  }

  /** Validate a reseller code. Returns ['valid'=>false] for unknown codes. */
  public function validate(string $code): array {
    $j = $this->req('GET', '/api/v1/reseller/validate?code=' . urlencode($code));
    return !empty($j['valid']) ? $j : ['valid' => false];
  }

  /** Report an attributed sale (idempotent on externalId). Best-effort; never throws. */
  public function reportSale(array $input): array {
    $j = $this->req('POST', '/api/v1/reseller/sales', array_merge(['currency' => 'EUR'], $input));
    return ['ok' => !empty($j['ok']), 'commissionCents' => $j['commissionCents'] ?? null];
  }
}
