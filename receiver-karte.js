// receiver-karte v1.1.1
// Einzeln installierbares Modul (Home Assistant Marketplace / HACS, Kategorie Dashboard).
window.customCards = window.customCards || [];
window.customCardFeatures = window.customCardFeatures || [];
// Eigener Block: Namen bleiben lokal, auch wenn mehrere Karten zusammen geladen werden.
{
// ---------------------------------------------------------------------------
// Receiver-Karte: AV-Receiver in einer Karte (Ein/Aus, Lautstaerke, Quellen als Tasten,
// weitere Quellen als Auswahl, Klangmodus, laufender Titel ueber einen Abspieler wie Music Assistant).
//
//   type: custom:receiver-karte
//   entity: media_player.pioneer_av_receiver          # Hauptzone (Quelle, Lautstaerke)
//   player: media_player.pioneer_sc_lx501_4d60b5_2    # optional, Abspieler fuer Titel/Cover/Play
//   name: Receiver                                    # optional
//   quellen:                                          # Haupttasten (Rest unter "Weitere Quellen")
//     - { quelle: TV, name: TV, icon: mdi:television }
//     - { quelle: Strm-box, name: Google TV, icon: mdi:google-play }
//     - { quelle: Network, name: Cast / Netzwerk, icon: mdi:cast-audio }
//   weitere: true                                     # optional, Auswahl fuer die uebrigen Quellen
//   fernbedienung: true                               # optional, Fernbedienung zum Aufklappen
//
// Fernbedienung: Steuerkreuz, Zurueck/Home/Menue und Wiedergabe gehen an das Geraet der gerade
// gewaehlten Quelle (je Quelle remote: remote.* oder webos: media_player.* eintragen), die
// Lautstaerke-Tasten steuern immer den Receiver selbst.
//     - { quelle: Strm-box, name: Musik-Stick, icon: mdi:music, remote: remote.wohnzimmer }

const TYPE16 = "receiver-karte";
const RV_ICON = { tv: "mdi:television", "strm-box": "mdi:google-play", network: "mdi:cast-audio", "bd/dvd": "mdi:disc-player",
  game: "mdi:gamepad-variant", pc: "mdi:desktop-classic", "cbl/sat": "mdi:satellite-variant", "internet radio": "mdi:radio",
  bluetooth: "mdi:bluetooth", phono: "mdi:record-player", cd: "mdi:disc", tuner: "mdi:radio-tower", usb: "mdi:usb" };

class ReceiverKarte extends HTMLElement {
  setConfig(c) {
    if (!c?.entity) throw new Error("entity (media_player.*) fehlt");
    this._config = { weitere: true, fernbedienung: true, ...c };
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); }

  _s(id) { return id ? this._hass?.states[id] : null; }
  _dienst(d, s, daten) { return this._hass.callService(d, s, daten); }

  // Geraet hinter der aktiven Quelle (fuer Steuerkreuz und Wiedergabe-Tasten)
  _ziel() {
    const q = this._s(this._config.entity)?.attributes.source;
    const roh = (this._config.quellen || []).find((x) => x && typeof x === "object" && x.quelle === q);
    return roh && (roh.remote || roh.webos) ? { name: roh.name || roh.quelle, remote: roh.remote, webos: roh.webos } : null;
  }

  _fbMoeglich() {
    return this._config.fernbedienung !== false
      && (this._config.quellen || []).some((x) => x && typeof x === "object" && (x.remote || x.webos));
  }

  _taste(cmd) {
    const e = { entity_id: this._config.entity };
    if (cmd === "VOLUME_UP") return this._dienst("media_player", "volume_up", e);
    if (cmd === "VOLUME_DOWN") return this._dienst("media_player", "volume_down", e);
    if (cmd === "VOLUME_MUTE") {
      return this._dienst("media_player", "volume_mute", { ...e, is_volume_muted: !this._s(this._config.entity)?.attributes.is_volume_muted });
    }
    const z = this._ziel();
    if (!z) return;
    if (z.webos) {
      const lg = { DPAD_UP: "UP", DPAD_DOWN: "DOWN", DPAD_LEFT: "LEFT", DPAD_RIGHT: "RIGHT", DPAD_CENTER: "ENTER", BACK: "BACK",
        HOME: "HOME", MENU: "MENU" }[cmd];
      if (lg) return this._dienst("webostv", "button", { entity_id: z.webos, button: lg });
      const mp = { MEDIA_PLAY_PAUSE: "media_play_pause", MEDIA_PREVIOUS: "media_previous_track", MEDIA_NEXT: "media_next_track" }[cmd];
      if (mp) return this._dienst("media_player", mp, { entity_id: z.webos });
      return;
    }
    return this._dienst("remote", "send_command", { entity_id: z.remote, command: cmd });
  }

  _quellen() {
    const s = this._s(this._config.entity), liste = s?.attributes.source_list || [];
    const q = (this._config.quellen || []).map((x) => (typeof x === "string" ? { quelle: x } : x)).filter((x) => x && x.quelle);
    const haupt = q.length ? q : liste.slice(0, 4).map((x) => ({ quelle: x }));
    return haupt.map((x) => ({ quelle: x.quelle, name: x.name || x.quelle, icon: x.icon || RV_ICON[String(x.quelle).toLowerCase()] || "mdi:import" }));
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 14px 16px; box-sizing: border-box; }
        .kopf { display: flex; align-items: center; gap: 12px; }
        .kopf .ic { --mdc-icon-size: 28px; color: var(--state-icon-color, #44739e); }
        .kopf.an .ic { color: var(--state-media_player-active-color, var(--amber-color, #ffc107)); }
        .titel { flex: 1; min-width: 0; }
        .name { font-size: 16px; font-weight: 500; color: var(--primary-text-color); }
        .status { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        button { font: inherit; cursor: pointer; border: none; background: none; color: var(--primary-text-color); }
        .rund { width: 42px; height: 42px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
          background: var(--secondary-background-color, rgba(127,127,127,.15)); flex: none; }
        .rund ha-icon { --mdc-icon-size: 22px; }
        .power.an { background: var(--success-color, #43a047); color: #fff; }
        .laut { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
        .laut input { flex: 1; accent-color: var(--primary-color); height: 28px; min-width: 0; }
        .wert { width: 38px; text-align: right; font-size: 14px; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
        .rund.klein { width: 34px; height: 34px; }
        .rund.klein ha-icon { --mdc-icon-size: 18px; }
        .stumm.an { background: var(--error-color, #e53935); color: #fff; }
        .quellen { display: grid; grid-template-columns: repeat(auto-fit, minmax(92px, 1fr)); gap: 8px; margin-top: 14px; }
        .q { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px; border-radius: 12px;
          background: var(--secondary-background-color, rgba(127,127,127,.12)); border: 2px solid transparent; font-size: 13px; line-height: 1.2; text-align: center; }
        .q ha-icon { --mdc-icon-size: 28px; color: var(--state-icon-color, #44739e); }
        .q.aktiv { border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 18%, transparent); }
        .q.aktiv ha-icon { color: var(--primary-color); }
        .zeile2 { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .zeile2 label { flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--secondary-text-color); }
        select { font: inherit; font-size: 14px; padding: 6px 8px; border-radius: 8px; color: var(--primary-text-color);
          background: var(--card-background-color, #1c1c1c); border: 1px solid var(--divider-color, #555); }
        .musik { display: none; align-items: center; gap: 12px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--divider-color, #444); }
        .musik.an { display: flex; }
        .cover { width: 56px; height: 56px; border-radius: 8px; background: var(--secondary-background-color) center/cover no-repeat; flex: none;
          display: flex; align-items: center; justify-content: center; }
        .cover ha-icon { --mdc-icon-size: 28px; color: var(--secondary-text-color); }
        .info { flex: 1; min-width: 0; }
        .t1 { font-size: 14px; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .t2 { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tasten { display: flex; gap: 6px; }
        .aus .laut, .aus .zeile2 { opacity: .45; }
        .auf { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; margin-top: 12px; padding: 6px;
          font-size: 13px; color: var(--secondary-text-color); border-top: 1px solid var(--divider-color, #444); }
        .auf ha-icon { --mdc-icon-size: 18px; transition: transform .2s; }
        .auf.offen ha-icon { transform: rotate(180deg); }
        .fbbox { display: none; margin-top: 8px; }
        .fbbox.offen { display: block; }
        .fbziel { text-align: center; font-size: 12px; color: var(--secondary-text-color); margin-bottom: 8px; }
        .fb { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
        .kreuz { display: grid; grid-template-columns: repeat(3, 48px); grid-template-rows: repeat(3, 48px); gap: 4px; }
        .kreuz button { border-radius: 12px; background: var(--secondary-background-color, rgba(127,127,127,.15)); display: flex; align-items: center; justify-content: center; }
        .kreuz button.ok { border-radius: 50%; background: var(--primary-color); color: var(--text-primary-color, #fff); font-weight: 500; }
        .kreuz ha-icon { --mdc-icon-size: 24px; }
        .spalte { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .medien { display: flex; justify-content: center; gap: 10px; margin-top: 10px; }
        .fbbox button:disabled { opacity: .35; cursor: default; }
      </style>
      <ha-card>
        <div class="kopf">
          <ha-icon class="ic" icon="mdi:audio-video"></ha-icon>
          <div class="titel"><div class="name"></div><div class="status"></div></div>
          <button class="rund power" title="Ein / Aus"><ha-icon icon="mdi:power"></ha-icon></button>
        </div>
        <div class="laut">
          <button class="rund klein stumm" title="Stumm"><ha-icon icon="mdi:volume-high"></ha-icon></button>
          <button class="rund klein leiser" title="Leiser"><ha-icon icon="mdi:minus"></ha-icon></button>
          <input type="range" min="0" max="100" step="1">
          <button class="rund klein lauter" title="Lauter"><ha-icon icon="mdi:plus"></ha-icon></button>
          <span class="wert"></span>
        </div>
        <div class="quellen"></div>
        <div class="zeile2">
          <label class="lw">Weitere Quellen<select class="weitere"></select></label>
          <label class="lk">Klangmodus<select class="klang"></select></label>
        </div>
        <div class="musik">
          <div class="cover"><ha-icon icon="mdi:music"></ha-icon></div>
          <div class="info"><div class="t1"></div><div class="t2"></div></div>
          <div class="tasten">
            <button class="rund klein zurueck" title="Zurück"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
            <button class="rund klein play" title="Wiedergabe / Pause"><ha-icon icon="mdi:play"></ha-icon></button>
            <button class="rund klein vor" title="Weiter"><ha-icon icon="mdi:skip-next"></ha-icon></button>
          </div>
        </div>
        <button class="auf"><span>Fernbedienung</span><ha-icon icon="mdi:chevron-down"></ha-icon></button>
        <div class="fbbox">
          <div class="fbziel"></div>
          <div class="fb">
            <div class="spalte">
              <button class="rund ziel" data-k="BACK" title="Zurück"><ha-icon icon="mdi:arrow-u-left-top"></ha-icon></button>
              <button class="rund ziel" data-k="HOME" title="Startseite"><ha-icon icon="mdi:home"></ha-icon></button>
              <button class="rund ziel" data-k="MENU" title="Menü"><ha-icon icon="mdi:menu"></ha-icon></button>
            </div>
            <div class="kreuz">
              <span></span><button class="ziel" data-k="DPAD_UP"><ha-icon icon="mdi:chevron-up"></ha-icon></button><span></span>
              <button class="ziel" data-k="DPAD_LEFT"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
              <button class="ok ziel" data-k="DPAD_CENTER">OK</button>
              <button class="ziel" data-k="DPAD_RIGHT"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
              <span></span><button class="ziel" data-k="DPAD_DOWN"><ha-icon icon="mdi:chevron-down"></ha-icon></button><span></span>
            </div>
            <div class="spalte">
              <button class="rund rx" data-k="VOLUME_UP" title="Lauter"><ha-icon icon="mdi:volume-plus"></ha-icon></button>
              <button class="rund rx" data-k="VOLUME_MUTE" title="Stumm"><ha-icon icon="mdi:volume-off"></ha-icon></button>
              <button class="rund rx" data-k="VOLUME_DOWN" title="Leiser"><ha-icon icon="mdi:volume-minus"></ha-icon></button>
            </div>
          </div>
          <div class="medien">
            <button class="rund klein ziel" data-k="MEDIA_PREVIOUS" title="Zurück"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
            <button class="rund klein ziel" data-k="MEDIA_PLAY_PAUSE" title="Wiedergabe / Pause"><ha-icon icon="mdi:play-pause"></ha-icon></button>
            <button class="rund klein ziel" data-k="MEDIA_NEXT" title="Weiter"><ha-icon icon="mdi:skip-next"></ha-icon></button>
          </div>
        </div>
      </ha-card>`;
    const r = this.shadowRoot, e = () => ({ entity_id: this._config.entity });
    const an = () => this._s(this._config.entity)?.state !== "off";
    r.querySelector(".power").addEventListener("click", () => this._dienst("media_player", an() ? "turn_off" : "turn_on", e()));
    r.querySelector(".stumm").addEventListener("click", () => {
      const s = this._s(this._config.entity);
      this._dienst("media_player", "volume_mute", { ...e(), is_volume_muted: !s?.attributes.is_volume_muted });
    });
    r.querySelector(".leiser").addEventListener("click", () => this._dienst("media_player", "volume_down", e()));
    r.querySelector(".lauter").addEventListener("click", () => this._dienst("media_player", "volume_up", e()));
    const regler = r.querySelector("input");
    regler.addEventListener("input", () => { this._ziehen = true; r.querySelector(".wert").textContent = regler.value; });
    regler.addEventListener("change", () => {
      this._ziehen = false;
      this._dienst("media_player", "volume_set", { ...e(), volume_level: Number(regler.value) / 100 });
    });
    r.querySelector(".weitere").addEventListener("change", (ev) => { if (ev.target.value) this._quelle(ev.target.value); });
    r.querySelector(".klang").addEventListener("change", (ev) => {
      if (ev.target.value) this._dienst("media_player", "select_sound_mode", { ...e(), sound_mode: ev.target.value });
    });
    const p = () => ({ entity_id: this._config.player });
    r.querySelector(".zurueck").addEventListener("click", () => this._dienst("media_player", "media_previous_track", p()));
    r.querySelector(".play").addEventListener("click", () => this._dienst("media_player", "media_play_pause", p()));
    r.querySelector(".vor").addEventListener("click", () => this._dienst("media_player", "media_next_track", p()));
    r.querySelector(".auf").addEventListener("click", () => {
      this._offen = !this._offen;
      r.querySelector(".auf").classList.toggle("offen", this._offen);
      r.querySelector(".fbbox").classList.toggle("offen", this._offen);
    });
    r.querySelectorAll(".fbbox [data-k]").forEach((b) => b.addEventListener("click", () => this._taste(b.dataset.k)));
    this._offen = false;
    this._quellenSchluessel = null;
    this._update();
  }

  async _quelle(q) {
    const e = { entity_id: this._config.entity };
    if (this._s(this._config.entity)?.state === "off") {
      await this._dienst("media_player", "turn_on", e);
      await new Promise((ok) => setTimeout(ok, 1500));
    }
    await this._dienst("media_player", "select_source", { ...e, source: q });
  }

  _update() {
    const r = this.shadowRoot, c = this._config;
    if (!r || !c || !this._hass) return;
    const s = this._s(c.entity), card = r.querySelector("ha-card");
    const an = !!s && !["off", "unavailable", "unknown"].includes(s.state);
    const a = s?.attributes || {};
    card.classList.toggle("aus", !an);
    r.querySelector(".kopf").classList.toggle("an", an);
    r.querySelector(".name").textContent = c.name || a.friendly_name || c.entity;
    r.querySelector(".status").textContent = !s ? "nicht gefunden" : s.state === "unavailable" ? "nicht erreichbar"
      : !an ? "Aus" : [(this._quellen().find((q) => q.quelle === a.source) || {}).name || a.source, a.sound_mode].filter(Boolean).join(" · ") || "An";
    r.querySelector(".power").classList.toggle("an", an);

    // Lautstaerke
    const vol = a.volume_level != null ? Math.round(a.volume_level * 100) : null;
    const regler = r.querySelector("input");
    regler.disabled = !an || vol == null;
    if (!this._ziehen && vol != null) regler.value = String(vol);
    if (!this._ziehen) r.querySelector(".wert").textContent = an && vol != null ? String(vol) : "–";
    const stumm = !!a.is_volume_muted;
    const sb = r.querySelector(".stumm");
    sb.classList.toggle("an", an && stumm);
    sb.querySelector("ha-icon").setAttribute("icon", stumm ? "mdi:volume-off" : "mdi:volume-high");
    ["stumm", "leiser", "lauter"].forEach((k) => (r.querySelector(`.${k}`).disabled = !an));

    // Quellen-Tasten
    const haupt = this._quellen(), schluessel = JSON.stringify(haupt);
    const box = r.querySelector(".quellen");
    if (schluessel !== this._quellenSchluessel) {
      this._quellenSchluessel = schluessel;
      box.innerHTML = "";
      for (const q of haupt) {
        const b = document.createElement("button");
        b.className = "q"; b.dataset.q = q.quelle;
        b.innerHTML = `<ha-icon icon="${q.icon}"></ha-icon><span></span>`;
        b.querySelector("span").textContent = q.name;
        b.addEventListener("click", () => this._quelle(q.quelle));
        box.appendChild(b);
      }
    }
    box.querySelectorAll(".q").forEach((b) => b.classList.toggle("aktiv", an && b.dataset.q === a.source));

    // Weitere Quellen
    const rest = (a.source_list || []).filter((x) => !haupt.some((q) => q.quelle === x));
    const lw = r.querySelector(".lw"), sel = r.querySelector(".weitere");
    lw.style.display = c.weitere && rest.length ? "" : "none";
    const optW = JSON.stringify([rest, an ? a.source : null]);
    if (sel.dataset.k !== optW) {
      sel.dataset.k = optW;
      sel.innerHTML = `<option value="">${an && rest.includes(a.source) ? "" : "– auswählen –"}</option>`
        + rest.map((x) => `<option value="${x}"${an && x === a.source ? " selected" : ""}>${x}</option>`).join("");
    }

    // Klangmodus
    const modi = a.sound_mode_list || [];
    const lk = r.querySelector(".lk"), kl = r.querySelector(".klang");
    lk.style.display = modi.length > 1 ? "" : "none";
    const optK = JSON.stringify([modi, a.sound_mode]);
    if (kl.dataset.k !== optK) {
      kl.dataset.k = optK;
      kl.innerHTML = modi.map((x) => `<option value="${x}"${x === a.sound_mode ? " selected" : ""}>${x}</option>`).join("");
    }
    r.querySelector(".zeile2").style.display = lw.style.display === "none" && lk.style.display === "none" ? "none" : "";

    // Laufender Titel (Abspieler, sonst Hauptzone)
    const pl = this._s(c.player), pa = pl?.attributes || {};
    const quelleT = pl && ["playing", "paused"].includes(pl.state) && (pa.media_title || pa.media_artist) ? pa
      : an && (a.media_title || a.media_artist) ? a : null;
    const musik = r.querySelector(".musik");
    musik.classList.toggle("an", !!quelleT);
    if (quelleT) {
      r.querySelector(".t1").textContent = quelleT.media_title || "";
      r.querySelector(".t2").textContent = [quelleT.media_artist, quelleT.media_album_name].filter(Boolean).join(" · ");
      const bild = quelleT.entity_picture, cv = r.querySelector(".cover");
      cv.style.backgroundImage = bild ? `url("${bild}")` : "";
      cv.querySelector("ha-icon").style.display = bild ? "none" : "";
      r.querySelector(".play ha-icon").setAttribute("icon", pl?.state === "playing" ? "mdi:pause" : "mdi:play");
      r.querySelector(".tasten").style.display = quelleT === pa ? "" : "none";
    }

    // Fernbedienung
    const fb = this._fbMoeglich();
    r.querySelector(".auf").style.display = fb ? "" : "none";
    if (!fb && this._offen) {
      this._offen = false;
      r.querySelector(".fbbox").classList.remove("offen");
      r.querySelector(".auf").classList.remove("offen");
    }
    const z = an ? this._ziel() : null;
    r.querySelector(".fbziel").textContent = !an ? "Receiver ist aus"
      : z ? `Steuert: ${z.name} · Lautstärke: Receiver` : "Für diese Quelle ist keine Fernbedienung hinterlegt – nur Lautstärke";
    r.querySelectorAll(".fbbox .ziel").forEach((b) => (b.disabled = !z));
    r.querySelectorAll(".fbbox .rx").forEach((b) => (b.disabled = !an));
  }

  getCardSize() { return this._fbMoeglich() ? 5 : 4; }
  getGridOptions() { return { columns: 12, rows: "auto" }; }

  static getConfigForm() {
    return {
      schema: [
        { name: "entity", required: true, selector: { entity: { domain: "media_player" } } },
        { name: "player", selector: { entity: { domain: "media_player" } } },
        { name: "name", selector: { text: {} } },
        { name: "weitere", selector: { boolean: {} } },
        { name: "fernbedienung", selector: { boolean: {} } },
        { name: "quellen", selector: { object: {} } },
      ],
      computeLabel: (s) => ({ entity: "Receiver (Hauptzone)", player: "Abspieler für Titel (z. B. Music Assistant)", name: "Name",
        weitere: "Übrige Quellen als Auswahl anzeigen", fernbedienung: "Fernbedienung zum Aufklappen", quellen: "Quellen-Tasten" }[s.name] || s.name),
      computeHelper: (s) => (s.name === "quellen"
        ? "Liste mit quelle (Name wie am Receiver), name, icon und für die Fernbedienung remote (remote.*) oder webos (media_player.*) – z. B. - {quelle: Strm-box, name: Musik, icon: mdi:music, remote: remote.wohnzimmer}" : undefined),
    };
  }

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {}).filter((id) => id.startsWith("media_player."));
    const rx = ids.find((id) => hass.states[id].attributes.device_class === "receiver" && hass.states[id].attributes.source_list) || ids[0] || "";
    return { entity: rx };
  }
}

if (!customElements.get(TYPE16)) customElements.define(TYPE16, ReceiverKarte);
if (!window.customCards.some((c) => c.type === TYPE16)) {
  window.customCards.push({ type: TYPE16, name: "Receiver-Karte", description: "AV-Receiver: Ein/Aus, Lautstärke, Quellen als Tasten, Klangmodus, laufender Titel und Fernbedienung", preview: true });
}
}

console.info("%c receiver-karte %c v1.1.0 ", "color:#fff;background:#03a9f4;font-weight:700", "color:#03a9f4");
