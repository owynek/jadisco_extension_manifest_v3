# Powiadamiacz Jadisco.pl - Chrome Extension (Manifest V3)

Rozszerzenie monitoruje status streamu Jadisco i wysyla powiadomienia o:
- starcie transmisji,
- zmianie tematu.

Projekt dziala na Manifest V3 (service worker), WebSocket i API Chrome Extensions.

[Link do rozszerzenia w Chrome Web Store](https://chromewebstore.google.com/detail/jadiscopl/onoloilfmbomfgdalcbbpnlnhibneofa)

## Funkcje

- Polaczenie z WebSocket `wss://livegamers.pl/api/pubsub` (site_id: `16`).
- Powiadomienia systemowe o starcie streamu i zmianie tematu.
- Odtwarzanie dzwieku powiadomienia przez dokument `offscreen`.
- Automatyczne ponowne laczenie (exponential backoff) po utracie polaczenia.
- Keep-alive przez `chrome.alarms` (co 1 minute).
- Manual refresh z popupu (`manualRefresh`).
- Zapisywanie ustawien uzytkownika (`chrome.storage.sync`).
- Zapisywanie ostatniego statusu (`chrome.storage.local`).
- Otwieranie/fokusowanie karty Jadisco.
- Integracja z Side Panel (czat).

## Side Panel (chat)

Side panel jest skonfigurowany w `manifest.json`:

```json
"side_panel": {
  "default_path": "sidepanel.html"
}
```

`sidepanel.html` laduje iframe z czatem:
- `https://poorchat.net/channels/jadisco`

Panel mozna otworzyc na 3 sposoby:
- recznie z popupu (ikona czatu),
- automatycznie po starcie streamu (gdy wlaczone `Open chat on stream start`),
- po kliknieciu powiadomienia (gdy wlaczone `openChatOnNotificationClick`).

## Uzywane permissions

Aktualna lista z `manifest.json`:

```json
"permissions": [
  "notifications",
  "offscreen",
  "storage",
  "alarms",
  "background",
  "sidePanel",
  "tabs"
]
```

| Permission | Po co jest uzywane |
| --- | --- |
| `notifications` | Tworzenie i czyszczenie powiadomien o streamie i temacie. |
| `offscreen` | Tworzenie `audio.html` do odtwarzania MP3 w tle. |
| `storage` | `sync` dla ustawien i `local` dla ostatniego statusu. |
| `alarms` | Keep-alive i reaktywacja polaczenia po wybudzeniu. |
| `background` | Dzialanie logiki monitoringu w tle (service worker + harmonogram). |
| `sidePanel` | Otwieranie panelu bocznego z czatem przez `chrome.sidePanel.open`. |
| `tabs` | Otwieranie/fokusowanie karty Jadisco i wyszukiwanie istniejacych kart. |

Uwaga: aktualny `manifest.json` nie definiuje `host_permissions`.

## Struktura projektu

- `manifest.json` - konfiguracja rozszerzenia (MV3, popup, side panel, permissions).
- `background.js` - WebSocket, notyfikacje, reconnect, alarms, reakcje na klikniecia.
- `popup.html` / `popup.js` / `popup.css` - UI popupu i ustawienia.
- `sidepanel.html` / `style.css` - widok panelu bocznego z czatem.
- `playSound.js` / `audio.html` / `audio.js` - odtwarzanie dzwieku przez offscreen document.
- `glow.css` / `background.css` / `animation.css` - efekty wizualne popupu.
- `icons/`, `images/`, `sounds/` - zasoby statyczne.

## Instalacja lokalna

1. Sklonuj albo pobierz repozytorium.
2. Otworz `chrome://extensions/`.
3. Wlacz `Developer mode`.
4. Kliknij `Load unpacked` i wskaz folder projektu.
5. Przypnij rozszerzenie i przetestuj popup oraz side panel.

## Debug

- `chrome://extensions/` -> `Inspect views` -> `service worker` (logika tla).
- W popupie:
  - `Test` sprawdza audio,
  - `Manual refresh` wymusza odswiezenie statusu.

## Licencja

MIT
