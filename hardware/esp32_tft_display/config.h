// hardware/esp32_tft_display/config.h
// ══════════════════════════════════════════════════════════════
//  JARVIS OS — ESP32 TFT HUD Configuration
//  Fill in your values before flashing
// ══════════════════════════════════════════════════════════════

#ifndef CONFIG_H
#define CONFIG_H

// ── WiFi ───────────────────────────────────────────────────────
#define WIFI_SSID         "YourWiFiSSID"
#define WIFI_PASSWORD     "YourWiFiPassword"
#define WIFI_TIMEOUT_MS   10000     // 10 seconds

// ── JARVIS Backend ─────────────────────────────────────────────
// Replace with your actual backend URL (Render / Railway / local)
#define JARVIS_BASE_URL   "https://your-jarvis-backend.onrender.com"
#define JARVIS_API_KEY    "your_esp32_webhook_secret_here"
#define DEVICE_ID         "esp32-tft-01"
#define FIRMWARE_VERSION  "1.0.0"

// ── Polling Interval ───────────────────────────────────────────
#define POLL_INTERVAL_MS  30000     // 30 seconds

// ── TFT Display Pins (ILI9341 / ST7789 — 2.8 inch) ────────────
// Adjust for your wiring
#define TFT_CS    5
#define TFT_DC    2
#define TFT_RST   4
#define TFT_MOSI  23
#define TFT_SCLK  18
#define TFT_MISO  19
#define TFT_LED   15    // Backlight — set to -1 if wired to 3.3V directly

// ── Display Settings ───────────────────────────────────────────
#define TFT_WIDTH   320
#define TFT_HEIGHT  240
#define TFT_ROTATION 1  // Landscape

// ── HUD Colors (RGB565) ────────────────────────────────────────
#define COLOR_BG        0x0009   // Very dark blue (#0A0E1A)
#define COLOR_CYAN      0x07FF   // Cyan (#00F5FF) — primary text
#define COLOR_WHITE     0xFFFF
#define COLOR_DIM       0x4228   // Dim grey — secondary text
#define COLOR_ALERT     0xF800   // Red  — overdue alerts
#define COLOR_GREEN     0x07E0   // Green — ok status
#define COLOR_AMBER     0xFDA0   // Amber — warning

// ── Debug ──────────────────────────────────────────────────────
#define DEBUG_SERIAL    true
#define SERIAL_BAUD     115200

#endif // CONFIG_H