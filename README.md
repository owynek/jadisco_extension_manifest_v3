# Powiadamiacz-Jadisco.pl – Rozszerzenie Chrome

🔔 **Jadisco.pl** to rozszerzenie Chrome, które powiadamia Cię o rozpoczęciu transmisji lub zmianie tematu na stronie Jadisco. Zbudowane w oparciu o **Manifest V3**, wykorzystuje WebSockety, powiadomienia Chrome i dźwięk odtwarzany w tle.

---

## 🚀 Funkcje

- 📡 Połączenie z WebSocket `livegamers.pl`
- 🔔 Powiadomienia o rozpoczęciu transmisji lub zmianie tematu
- 🔊 Dźwięk przy rozpoczęciu transmisji
- 💤 Automatyczne ponowne połączenie po wybudzeniu komputera
- 🔁 Ręczne odświeżenie połączenia
- 💾 Zapisywanie ustawień użytkownika
- 📄 Interfejs popup z informacją o statusie i temacie transmisji

---

## 📁 Struktura projektu
├── background.js # Logika połączenia WebSocket i powiadomień<br>
├── playSound.js # Obsługa odtwarzania dźwięku<br>
├── audio.html # Offscreen dokument do dźwięku<br>
├── audio.js # Skrypt odtwarzający MP3<br>
├── popup.html # Widok popupu rozszerzenia<br>
├── popup.js # Skrypt obsługujący interfejs<br>
├── popup.css # Styl popupu<br>
├── glow.css # Stylizowane efekty glow<br>
├── background.css # Efekt graficzny tła<br>
├── animation.css # Gradientowa animacja<br>
├── manifest.json # Plik konfiguracyjny rozszerzenia<br>
└── README.md # Ten dokument<br>


---

## ⚙️ Instalacja

1. Pobierz lub sklonuj repozytorium.
2. Wejdź w przeglądarce Chrome na `chrome://extensions/`
3. Włącz tryb deweloperski (przełącznik w prawym górnym rogu).
4. Kliknij **Wczytaj rozpakowane rozszerzenie** i wybierz folder projektu.
5. Ikona Jadisco powinna pojawić się w pasku narzędzi.

---

## 🔐 Używane `permissions`

```json
"permissions": [
  "notifications",
  "storage",
  "alarms",
  "offscreen",
  "tabs",
  "contextMenus"
],
"host_permissions": [
  "https://jadisco.pl/*",
  "https://livegamers.pl/*"
]
```

Użycie:
notifications – pokazywanie powiadomień
storage – zapisywanie ustawień użytkownika
alarms – cykliczne utrzymanie aktywności
offscreen – odtwarzanie dźwięków
tabs, contextMenus – otwieranie stron, menu kontekstowe

## 🧪 Wskazówki dla deweloperów
Użyj chrome://extensions → Inspect service worker, by debugować tło

WebSocket automatycznie się odnawia (exponential backoff)

Kliknij „🔊 Test Sound” w popupie, by sprawdzić dźwięk

Kliknij „🔁 Odśwież dane”, by wymusić ponowne połączenie

## 📄 Licencja
MIT License – możesz swobodnie modyfikować, rozwijać i korzystać z kodu.

