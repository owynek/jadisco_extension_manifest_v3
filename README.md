# Powiadamiacz-Jadisco.pl – Rozszerzenie Chrome

🔔 **Jadisco.pl** to rozszerzenie Chrome, które powiadamia Cię o rozpoczęciu transmisji lub zmianie tematu na stronie
Jadisco. Zbudowane w oparciu o **Manifest V3**, wykorzystuje WebSockety, powiadomienia Chrome i dźwięk odtwarzany w tle. <br>
[Link do rozszerzenia](https://chromewebstore.google.com/detail/jadiscopl/onoloilfmbomfgdalcbbpnlnhibneofa)
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

├── *icons/* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Folder z ikonami <br>
├── *images/* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Folder z obrazami <br>
├── *sounds/* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Folder z dzwiękiem powiadamiacza <br>
├── *background.js* &nbsp;&nbsp;&nbsp;&nbsp;# Logika połączenia WebSocket i powiadomień <br>
├── *playSound.js* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Obsługa odtwarzania dźwięku <br>
├── *audio.html* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Offscreen dokument do dźwięku <br>
├── *audio.js* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Skrypt odtwarzający MP3 <br>
├── *popup.html* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Widok popupu rozszerzenia <br>
├── *popup.js* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Skrypt obsługujący interfejs <br>
├── *popup.css* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Styl popupu <br>
├── *glow.css* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Stylizowane efekty glow <br>
├── *background.css* &nbsp;&nbsp;# Efekt graficzny tła <br>
├── *animation.css* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Gradientowa animacja <br>
├── *manifest.json* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Plik konfiguracyjny rozszerzenia <br>
└── *README.md* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Ten dokument <br>

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
],
"host_permissions": [
"https://jadisco.pl/*",
"https://livegamers.pl/*"
]
```

| Permission        | Użycie                           |
|-------------------|----------------------------------|
| **notifications** | pokazywanie powiadomień          |
| **storage**       | zapisywanie ustawień użytkownika |
| **alarms**        | cykliczne utrzymanie aktywności  |
| **offscreen**     | odtwarzanie dźwięków             |
| **tabs**          | otwieranie stron                 |

---

## 🧪 Wskazówki dla deweloperów

Użyj chrome://extensions → Inspect service worker, by debugować tło

WebSocket automatycznie się odnawia (exponential backoff)

Kliknij „🔊 Test Sound” w popupie, by sprawdzić dźwięk

Kliknij „🔁 Odśwież dane”, by wymusić ponowne połączenie

---

## 📄 Licencja

MIT License – możesz swobodnie modyfikować, rozwijać i korzystać z kodu.
