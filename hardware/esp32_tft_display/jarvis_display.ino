// hardware/esp32_tft_display/jarvis_display.ino
// ══════════════════════════════════════════════════════════════
//  JARVIS OS — ESP32 TFT HUD Main Sketch
//
//  Libraries required (install via Arduino Library Manager):
//    - TFT_eSPI by Bodmer (configure User_Setup.h for your display)
//    - ArduinoJson by Benoit Blanchon (v6.x)
//    - HTTPClient (built into ESP32 Arduino core)
//
//  Hardware:
//    - ESP32-WROOM-32 (any variant)
//    - 2.8" TFT Display (ILI9341 or ST7789 driver)
//    - Wire according to config.h pin definitions
// ══════════════════════════════════════════════════════════════

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TFT_eSPI.h>
#include "config.h"

// ── Display instance ───────────────────────────────────────────
TFT_eSPI tft = TFT_eSPI();

// ── State variables ───────────────────────────────────────────
unsigned long lastPollTime   = 0;
unsigned long lastClockUpdate = 0;
bool          wifiConnected  = false;
int           pollFailCount  = 0;
String        currentLine4   = "";
String        currentLine5   = "";
String        currentLine6   = "";
String        currentAlert   = "";
bool          hasAlert        = false;

// ── Animation frame counter ───────────────────────────────────
int  animFrame  = 0;
bool scanActive = true;


// ══════════════════════════════════════════════════════════════
//  SETUP
// ══════════════════════════════════════════════════════════════
void setup() {
    if (DEBUG_SERIAL) {
        Serial.begin(SERIAL_BAUD);
        Serial.println("\n\n🚀 JARVIS OS — ESP32 TFT HUD Booting...");
    }

    // ── Init TFT ─────────────────────────────────────────────
    initDisplay();

    // ── Show boot screen ──────────────────────────────────────
    showBootScreen();

    // ── Connect WiFi ──────────────────────────────────────────
    connectWiFi();

    // ── First data fetch ──────────────────────────────────────
    if (wifiConnected) {
        fetchAndDraw();
    }

    lastPollTime    = millis();
    lastClockUpdate = millis();
}


// ══════════════════════════════════════════════════════════════
//  MAIN LOOP
// ══════════════════════════════════════════════════════════════
void loop() {
    unsigned long now = millis();

    // ── Poll JARVIS backend every POLL_INTERVAL_MS ────────────
    if (now - lastPollTime >= POLL_INTERVAL_MS) {
        lastPollTime = now;

        if (WiFi.status() != WL_CONNECTED) {
            if (DEBUG_SERIAL) Serial.println("⚠ WiFi lost — reconnecting...");
            drawStatusBadge("RECONNECTING", COLOR_AMBER);
            connectWiFi();
        }

        if (wifiConnected) {
            fetchAndDraw();
        }
    }

    // ── Update clock every second ─────────────────────────────
    // (Uses millis — no NTP needed since server sends time)
    if (now - lastClockUpdate >= 1000) {
        lastClockUpdate = now;
        animFrame++;
        drawScanLine();   // Animate the HUD scan line
    }

    delay(50);  // Small yield to prevent WDT reset
}


// ══════════════════════════════════════════════════════════════
//  DISPLAY INITIALIZATION
// ══════════════════════════════════════════════════════════════
void initDisplay() {
    tft.init();
    tft.setRotation(TFT_ROTATION);
    tft.fillScreen(COLOR_BG);

    // ── Set backlight ─────────────────────────────────────────
    if (TFT_LED >= 0) {
        pinMode(TFT_LED, OUTPUT);
        analogWrite(TFT_LED, 200);  // 0-255 brightness
    }

    if (DEBUG_SERIAL) Serial.println("✅ TFT Display initialized");
}


// ══════════════════════════════════════════════════════════════
//  BOOT SCREEN
// ══════════════════════════════════════════════════════════════
void showBootScreen() {
    tft.fillScreen(COLOR_BG);

    // ── Border frame ──────────────────────────────────────────
    tft.drawRect(2, 2, TFT_WIDTH-4, TFT_HEIGHT-4, COLOR_CYAN);
    tft.drawRect(4, 4, TFT_WIDTH-8, TFT_HEIGHT-8, COLOR_DIM);

    // ── Logo ─────────────────────────────────────────────────
    tft.setTextColor(COLOR_CYAN);
    tft.setTextSize(3);
    tft.setCursor(60, 60);
    tft.println("JARVIS OS");

    tft.setTextColor(COLOR_DIM);
    tft.setTextSize(1);
    tft.setCursor(80, 100);
    tft.println("Personal AI Command Center");

    tft.setCursor(100, 115);
    tft.print("FW v");
    tft.println(FIRMWARE_VERSION);

    // ── Connecting status ─────────────────────────────────────
    tft.setTextColor(COLOR_AMBER);
    tft.setTextSize(1);
    tft.setCursor(90, 150);
    tft.println("Connecting to WiFi...");

    // ── Corner decorations ────────────────────────────────────
    drawCornerDecorations();
}


// ══════════════════════════════════════════════════════════════
//  WIFI CONNECTION
// ══════════════════════════════════════════════════════════════
void connectWiFi() {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    if (DEBUG_SERIAL) {
        Serial.print("📶 Connecting to WiFi: ");
        Serial.print(WIFI_SSID);
    }

    unsigned long startAttempt = millis();
    int dotCount = 0;

    while (WiFi.status() != WL_CONNECTED &&
           millis() - startAttempt < WIFI_TIMEOUT_MS) {
        delay(500);
        if (DEBUG_SERIAL) Serial.print(".");
        dotCount++;

        // Show progress dots on screen
        tft.setTextColor(COLOR_CYAN);
        tft.setTextSize(1);
        tft.setCursor(90 + (dotCount * 6), 165);
        tft.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        pollFailCount = 0;

        if (DEBUG_SERIAL) {
            Serial.println();
            Serial.print("✅ WiFi connected! IP: ");
            Serial.println(WiFi.localIP());
        }

        // Update boot screen status
        tft.fillRect(80, 145, 200, 30, COLOR_BG);
        tft.setTextColor(COLOR_GREEN);
        tft.setTextSize(1);
        tft.setCursor(90, 150);
        tft.print("WiFi: ");
        tft.println(WiFi.localIP().toString());

        delay(800);

    } else {
        wifiConnected = false;
        if (DEBUG_SERIAL) Serial.println("\n💥 WiFi failed!");

        tft.fillRect(80, 145, 200, 30, COLOR_BG);
        tft.setTextColor(COLOR_ALERT);
        tft.setTextSize(1);
        tft.setCursor(85, 150);
        tft.println("WiFi FAILED. Retrying...");
    }
}


// ══════════════════════════════════════════════════════════════
//  FETCH DATA FROM JARVIS BACKEND
// ══════════════════════════════════════════════════════════════
void fetchAndDraw() {
    if (DEBUG_SERIAL) Serial.println("📡 Fetching from JARVIS backend...");

    drawStatusBadge("SYNCING", COLOR_AMBER);

    HTTPClient http;

    // ── Build POST body ───────────────────────────────────────
    StaticJsonDocument<256> reqDoc;
    reqDoc["device_id"]      = DEVICE_ID;
    reqDoc["firmware_ver"]   = FIRMWARE_VERSION;
    reqDoc["display_mode"]   = "tasks";
    reqDoc["free_heap_kb"]   = ESP.getFreeHeap() / 1024;
    reqDoc["wifi_rssi"]      = WiFi.RSSI();
    reqDoc["uptime_seconds"] = millis() / 1000;
    reqDoc["ip_address"]     = WiFi.localIP().toString();

    String reqBody;
    serializeJson(reqDoc, reqBody);

    // ── Make POST request to /api/v1/webhooks/esp32 ───────────
    String url = String(JARVIS_BASE_URL) + "/api/v1/webhooks/esp32";
    http.begin(url);
    http.addHeader("Content-Type",    "application/json");
    http.addHeader("X-ESP32-Secret",  JARVIS_API_KEY);
    http.addHeader("X-ESP32-Device-ID", DEVICE_ID);
    http.setTimeout(8000);  // 8 second timeout

    int httpCode = http.POST(reqBody);

    if (DEBUG_SERIAL) {
        Serial.print("📨 HTTP response: ");
        Serial.println(httpCode);
    }

    if (httpCode == 200) {
        String response = http.getString();
        parseAndDraw(response);
        pollFailCount = 0;
        drawStatusBadge("ONLINE", COLOR_GREEN);

    } else {
        pollFailCount++;
        if (DEBUG_SERIAL) {
            Serial.print("⚠ Fetch failed. Code: ");
            Serial.print(httpCode);
            Serial.print(" | Failures: ");
            Serial.println(pollFailCount);
        }

        if (pollFailCount >= 3) {
            drawStatusBadge("OFFLINE", COLOR_ALERT);
        } else {
            drawStatusBadge("RETRY", COLOR_AMBER);
        }
    }

    http.end();
}


// ══════════════════════════════════════════════════════════════
//  PARSE JSON RESPONSE AND DRAW HUD
// ══════════════════════════════════════════════════════════════
void parseAndDraw(String jsonResponse) {
    // ── Parse JSON ────────────────────────────────────────────
    // Response shape:
    // { "display": { "line1":..., "line2":..., ... "alert":... } }

    StaticJsonDocument<1024> doc;
    DeserializationError err = deserializeJson(doc, jsonResponse);

    if (err) {
        if (DEBUG_SERIAL) {
            Serial.print("💥 JSON parse failed: ");
            Serial.println(err.c_str());
        }
        drawErrorLine("JSON parse error");
        return;
    }

    JsonObject display = doc["display"];
    if (display.isNull()) {
        if (DEBUG_SERIAL) Serial.println("⚠ No 'display' key in response");
        drawErrorLine("No display data");
        return;
    }

    // ── Extract lines ─────────────────────────────────────────
    String line1 = display["line1"] | "JARVIS OS";
    String line2 = display["line2"] | "Unknown Date";
    String line3 = display["line3"] | "--:--";
    String line4 = display["line4"] | "";
    String line5 = display["line5"] | "";
    String line6 = display["line6"] | "";
    String alert = display["alert"] | "";

    // Cache for re-draws
    currentLine4 = line4;
    currentLine5 = line5;
    currentLine6 = line6;
    currentAlert = alert;
    hasAlert     = (alert.length() > 0);

    // ── Draw full HUD ─────────────────────────────────────────
    drawFullHUD(line1, line2, line3, line4, line5, line6, alert);

    if (DEBUG_SERIAL) {
        Serial.println("✅ HUD updated:");
        Serial.println("   " + line1);
        Serial.println("   " + line2 + "  " + line3);
        Serial.println("   " + line4);
        Serial.println("   " + line5);
        Serial.println("   " + line6);
        if (alert.length() > 0) {
            Serial.println("   ⚠ " + alert);
        }
    }
}


// ══════════════════════════════════════════════════════════════
//  DRAW FULL HUD LAYOUT
// ══════════════════════════════════════════════════════════════
void drawFullHUD(
    String line1, String line2, String line3,
    String line4, String line5, String line6,
    String alert
) {
    // ── Clear content area ────────────────────────────────────
    tft.fillRect(6, 6, TFT_WIDTH-12, TFT_HEIGHT-12, COLOR_BG);

    // ── Outer border ─────────────────────────────────────────
    tft.drawRect(2, 2, TFT_WIDTH-4, TFT_HEIGHT-4, COLOR_CYAN);

    // ── LINE 1: System header "JARVIS OS" ─────────────────────
    tft.setTextColor(COLOR_CYAN);
    tft.setTextSize(2);
    tft.setCursor(10, 10);
    tft.println(line1);

    // ── Separator line under header ───────────────────────────
    tft.drawLine(10, 32, TFT_WIDTH-10, 32, COLOR_DIM);

    // ── LINE 2: Date ──────────────────────────────────────────
    tft.setTextColor(COLOR_DIM);
    tft.setTextSize(1);
    tft.setCursor(10, 38);
    tft.println(line2);

    // ── LINE 3: Time (large, center) ──────────────────────────
    tft.setTextColor(COLOR_WHITE);
    tft.setTextSize(4);
    int timeX = (TFT_WIDTH - (line3.length() * 24)) / 2;
    tft.setCursor(timeX > 0 ? timeX : 10, 50);
    tft.println(line3);

    // ── Separator ─────────────────────────────────────────────
    tft.drawLine(10, 102, TFT_WIDTH-10, 102, COLOR_DIM);

    // ── LINE 4: Tasks ─────────────────────────────────────────
    tft.setTextColor(COLOR_CYAN);
    tft.setTextSize(1);
    tft.setCursor(10, 110);
    drawIconPrefix("T:", COLOR_CYAN);
    tft.println(line4);

    // ── LINE 5: Email ─────────────────────────────────────────
    tft.setTextColor(COLOR_CYAN);
    tft.setCursor(10, 125);
    drawIconPrefix("E:", COLOR_CYAN);
    tft.println(line5);

    // ── LINE 6: Next event ────────────────────────────────────
    tft.setTextColor(COLOR_DIM);
    tft.setCursor(10, 140);
    tft.println(line6);

    // ── Separator ─────────────────────────────────────────────
    tft.drawLine(10, 155, TFT_WIDTH-10, 155, COLOR_DIM);

    // ── ALERT LINE (red) ──────────────────────────────────────
    if (alert.length() > 0) {
        tft.setTextColor(COLOR_ALERT);
        tft.setTextSize(1);
        tft.setCursor(10, 163);
        tft.println(alert);
    } else {
        // Show WiFi RSSI when no alert
        tft.setTextColor(COLOR_DIM);
        tft.setTextSize(1);
        tft.setCursor(10, 163);
        tft.print("RSSI: ");
        tft.print(WiFi.RSSI());
        tft.print("dBm  Heap: ");
        tft.print(ESP.getFreeHeap() / 1024);
        tft.print("KB");
    }

    // ── Corner decorations ────────────────────────────────────
    drawCornerDecorations();

    // ── Device ID (bottom right, tiny) ────────────────────────
    tft.setTextColor(COLOR_DIM);
    tft.setTextSize(1);
    tft.setCursor(TFT_WIDTH - 80, TFT_HEIGHT - 14);
    tft.println(DEVICE_ID);
}


// ══════════════════════════════════════════════════════════════
//  HUD VISUAL HELPERS
// ══════════════════════════════════════════════════════════════

void drawCornerDecorations() {
    // Top-left corner bracket
    tft.drawLine(2, 2, 12, 2, COLOR_CYAN);
    tft.drawLine(2, 2, 2, 12, COLOR_CYAN);

    // Top-right corner bracket
    tft.drawLine(TFT_WIDTH-12, 2, TFT_WIDTH-2, 2, COLOR_CYAN);
    tft.drawLine(TFT_WIDTH-2, 2, TFT_WIDTH-2, 12, COLOR_CYAN);

    // Bottom-left corner bracket
    tft.drawLine(2, TFT_HEIGHT-12, 2, TFT_HEIGHT-2, COLOR_CYAN);
    tft.drawLine(2, TFT_HEIGHT-2, 12, TFT_HEIGHT-2, COLOR_CYAN);

    // Bottom-right corner bracket
    tft.drawLine(TFT_WIDTH-2, TFT_HEIGHT-12, TFT_WIDTH-2, TFT_HEIGHT-2, COLOR_CYAN);
    tft.drawLine(TFT_WIDTH-12, TFT_HEIGHT-2, TFT_WIDTH-2, TFT_HEIGHT-2, COLOR_CYAN);
}


void drawStatusBadge(String label, uint16_t color) {
    // Small status badge in top-right corner
    tft.fillRect(TFT_WIDTH-70, 8, 65, 12, COLOR_BG);
    tft.setTextColor(color);
    tft.setTextSize(1);
    tft.setCursor(TFT_WIDTH-68, 10);
    tft.println(label);
}


void drawIconPrefix(String icon, uint16_t color) {
    tft.setTextColor(color);
    tft.print(icon);
    tft.print(" ");
}


void drawScanLine() {
    // Animated scanning line — moves down the screen
    static int scanY = 35;

    // Erase previous scan line
    if (scanY > 35) {
        tft.drawLine(3, scanY - 1, TFT_WIDTH-3, scanY - 1, COLOR_BG);
    }

    // Draw new scan line (very dim cyan)
    tft.drawLine(3, scanY, TFT_WIDTH-3, scanY, 0x0003);

    scanY += 2;
    if (scanY >= TFT_HEIGHT - 5) {
        scanY = 35;
    }
}


void drawErrorLine(String errorMsg) {
    tft.fillRect(6, 160, TFT_WIDTH-12, 20, COLOR_BG);
    tft.setTextColor(COLOR_ALERT);
    tft.setTextSize(1);
    tft.setCursor(10, 165);
    tft.println("ERR: " + errorMsg);
}