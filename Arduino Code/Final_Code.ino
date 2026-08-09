#include <WiFi.h>
#include <HTTPClient.h>
#include "HX711.h"
#include <ArduinoJson.h>

// WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Firebase Realtime Database URL
const char* firebaseBaseUrl = "https://tkph-ace70-default-rtdb.firebaseio.com/trucks/truck1/readings/.json";

// HX711 Load Cell Connections
#define DT 21
#define SCK 22
HX711 scale;

// Wheel & Hall Sensor Setup
#define HALL_SENSOR_PIN 23
const float wheelDiameterMeters = 0.06;  // Update with your actual wheel diameter
const float wheelCircumference = PI * wheelDiameterMeters; // in meters
const int pulsesPerRevolution = 1;      // Use 1 if there's one magnet per wheel rev

volatile int revolutionCount = 0;
volatile unsigned long lastInterruptTime = 0;  // For debouncing
unsigned long lastTime = 0;

// Function Prototypes
float getStableWeight();
void sendToFirebase(float weight_tonnes, float speed, float tkph);
void IRAM_ATTR countRevolution() {
    unsigned long interruptTime = millis();
    if (interruptTime - lastInterruptTime > 10) { // 10ms debounce
        revolutionCount++;
        lastInterruptTime = interruptTime;
    }
}

void setup() {
    Serial.begin(115200);

    // Connect to WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi...");
    }
    Serial.println("Connected to WiFi");

    // Load Cell Setup
    scale.begin(DT, SCK);
    scale.set_scale(10000.0); // Calibrate this value
    scale.tare();  

    // Hall Sensor Setup
    pinMode(HALL_SENSOR_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(HALL_SENSOR_PIN), countRevolution, FALLING);

    lastTime = millis();
}

void loop() {
    // Get weight
    float weight_kg = getStableWeight();
    float weight_tonnes = weight_kg;

    Serial.print("Weight (tonnes): ");
    Serial.println(weight_tonnes);

    // Calculate RPM and Speed
    unsigned long currentTime = millis();
    unsigned long timeDiffMs = currentTime - lastTime;
    float timeDiffMinutes = timeDiffMs / 60000.0;
    float timeDiffSeconds = timeDiffMs / 1000.0;

    int revolutions = revolutionCount / (int)pulsesPerRevolution;
    float rpm = revolutions / timeDiffMinutes;
    float speed = ((revolutions * wheelCircumference * 3.6) / timeDiffSeconds); // km/h

    Serial.print("RPM : ");
    Serial.println((int)rpm);
    Serial.print("Speed (km/h): ");
    Serial.println(speed);

    revolutionCount = 0;
    lastTime = currentTime;

    // TKPH Calculation
    float tkph = weight_tonnes * speed;
    Serial.print("TKPH: ");
    Serial.println(tkph);

    // Send to Firebase
    sendToFirebase(weight_tonnes, speed, tkph);

    delay(3000); // Delay before next reading
}

// Send data to Firebase
int entryNumber = 1;

void sendToFirebase(float weight_tonnes, float speed, float tkph) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;

        String path = "https://tkph-ace70-default-rtdb.firebaseio.com/trucks/truck1/readings/" + 
                      String(entryNumber) + ".json";

        http.begin(path);
        http.addHeader("Content-Type", "application/json");

        StaticJsonDocument<200> doc;
        doc["entry_no"] = entryNumber;
        doc["truck_id"] = 1;
        doc["tkph"] = tkph;
        doc["speed"] = speed;
        doc["payload"] = weight_tonnes;

        String jsonPayload;
        serializeJson(doc, jsonPayload);

        Serial.println("Sending data to Firebase...");
        Serial.println(jsonPayload);

        int httpResponseCode = http.PUT(jsonPayload);

        if (httpResponseCode > 0) {
            Serial.println("Data sent to Firebase successfully");
            Serial.print("HTTP Response code: ");
            Serial.println(httpResponseCode);
            entryNumber++;
        } else {
            Serial.print("Error sending data. HTTP Response code: ");
            Serial.println(httpResponseCode);
            Serial.println(http.errorToString(httpResponseCode));
        }

        http.end();
    } else {
        Serial.println("WiFi Disconnected");
    }
}

// Get stable weight from HX711
float getStableWeight() {
    float sum = 0;
    int readings = 10;

    for (int i = 0; i < readings; i++) {
        float reading = scale.get_units();
        if (isnan(reading)) {
            Serial.println("Error: HX711 reading invalid!");
            return 0;
        }
        sum += reading;
        delay(10);
    }

    float avg_weight = sum / readings;
    return avg_weight < 0 ? -avg_weight : avg_weight;
}
