# TRUSS — Lokal READ-ONLY PostgreSQL MCP Kurulumu (Antigravity v2.34.0)

> **Güvenlik Kuralı:** `Backend/.env`, gerçek veritabanı şifreleri ve bağlantı dizgileri repo içine (`git` ile izlenen hiçbir dosyaya) **ASLA** yazılmaz. Tüm kimlik bilgileri yalnızca repo dışındaki `~/.gemini/config/mcp_config.json` dosyasında saklanır.

## Katman 1 — PostgreSQL Salt-Okunur Rol (`psql`)
Lokal geliştirme veritabanında süper kullanıcı veya uygulama sahibi yerine izole salt-okunur `truss_ro` rolü oluştur:
```sql
CREATE ROLE truss_ro LOGIN PASSWORD '<GUCLU_SIFRE>';
GRANT CONNECT ON DATABASE <DB_NAME> TO truss_ro;
GRANT USAGE ON SCHEMA public TO truss_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO truss_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO truss_ro;
ALTER ROLE truss_ro SET default_transaction_read_only = on;
```
- `<GUCLU_SIFRE>` ve `<DB_NAME>` yer tutucularını kendi lokal değerlerinle değiştir; bu değerleri repoya kaydetme.

## Katman 2 — Antigravity Global MCP Ayarı (Repo Dışı)
Repo dışındaki `~/.gemini/config/mcp_config.json` dosyasında `mcpServers` altına `truss-pg-ro` stdio sunucusunu tanımla:
```json
{
  "mcpServers": {
    "truss-pg-ro": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://truss_ro:<GUCLU_SIFRE>@localhost:5432/<DB_NAME>?options=-c%20default_transaction_read_only%3Don"
      ]
    }
  }
}
```
- Bağlantı parametresi (`default_transaction_read_only=on`) rol seviyesindeki kilide ek ikinci savunma katmanı sağlar.

## Doğrulama Adımları
1. Antigravity arayüzünde `Additional Options (...) > MCP Servers` menüsünden `truss-pg-ro` sunucusunun bağlı ve aktif olduğunu doğrula.
2. Salt-okunur okuma testi: `SELECT count(*) FROM araclar;` sorgusunun normal sonuç döndürdüğünü doğrula.
3. Yazma engeli testi: `INSERT` veya `DELETE` denemesinin PostgreSQL tarafından `cannot execute ... in a read-only transaction` hatasıyla reddedildiğini doğrula.
