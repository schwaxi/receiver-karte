# Receiver-Karte

AV-Receiver: Ein/Aus, Lautstärke, Quellen als Tasten, Klangmodus, laufender Titel und eine aufklappbare Fernbedienung

![Receiver-Karte](images/receiver-karte.png)

## Installation

### Über den Marketplace (Home Assistant 2026.11 und neuer)

1. **Einstellungen** → **Marketplace** → **Aus Link hinzufügen**.
2. Die Adresse dieses Repositorys eintragen, Kategorie **Dashboard**.
3. **Receiver-Karte** installieren. Die Ressource wird dabei automatisch eingetragen.

### Über HACS (ältere Versionen)

**HACS** → ⋮ → **Benutzerdefinierte Repositories** → Adresse dieses Repositorys, Typ **Dashboard** → installieren.

### Manuell

`receiver-karte.js` nach `/config/www/` kopieren und unter **Einstellungen** → **Dashboards** → ⋮ → **Ressourcen**
als JavaScript-Modul `/local/receiver-karte.js` eintragen.

## Verwendung

```yaml
type: custom:receiver-karte
```

## Konfiguration

```
Receiver-Karte: AV-Receiver in einer Karte (Ein/Aus, Lautstaerke, Quellen als Tasten,
weitere Quellen als Auswahl, Klangmodus, laufender Titel ueber einen Abspieler wie Music Assistant).

  type: custom:receiver-karte
  entity: media_player.pioneer_av_receiver          # Hauptzone (Quelle, Lautstaerke)
  player: media_player.pioneer_sc_lx501_4d60b5_2    # optional, Abspieler fuer Titel/Cover/Play
  name: Receiver                                    # optional
  quellen:                                          # Haupttasten (Rest unter "Weitere Quellen")
    - { quelle: TV, name: TV, icon: mdi:television }
    - { quelle: Strm-box, name: Google TV, icon: mdi:google-play, remote: remote.google_tv }
    - { quelle: Network, name: Cast / Netzwerk, icon: mdi:cast-audio }
  weitere: true                                     # optional, Auswahl fuer die uebrigen Quellen
  fernbedienung: true                               # optional, Fernbedienung zum Aufklappen
```

### Fernbedienung

Viele Receiver-Integrationen kennen keine Menütasten. Die Fernbedienung der Karte steuert deshalb
das Gerät, das an der gerade gewählten Quelle hängt: Steuerkreuz, Zurück, Startseite, Menü und
Wiedergabe gehen an die `remote`-Entität (z. B. Google TV / Android TV) oder an einen LG-Fernseher
(`webos: media_player.…`), die bei der Quelle eingetragen ist. Die Lautstärke-Tasten steuern immer
den Receiver. Der Knopf „Fernbedienung“ erscheint, sobald bei mindestens einer Quelle `remote` oder
`webos` eingetragen ist.

## Lizenz

MIT
