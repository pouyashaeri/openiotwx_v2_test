import type { Answers, ConfigId, LinkId } from "./types";

export type FlasherDevice = "esp32" | "rp2040";

export type FlashPath = {
  device: FlasherDevice;
  /** Short name of the board the browser flasher will program. */
  board: string;
  /** One sentence tying the board back to what the person chose in the questionnaire. */
  why: string;
  /** Link to the static flasher, carrying the device so the right path is preselected. */
  href: string;
  /** Things to have in hand before pressing the button. */
  bring: string[];
  /** A caveat worth showing next to the button, when the flasher does not cover everything in the plan. */
  note?: string;
  /** What happens in the two flasher steps, in the order the person sees them. */
  steps: { title: string; body: string }[];
};

export const FLASHER_ROOT = `${import.meta.env.BASE_URL}flash-wizard/index.html`;

const BOARD: Record<FlasherDevice, string> = {
  esp32: "M5Stack Atom Lite (ESP32)",
  rp2040: "Adafruit Feather RP2040 RFM95 (LoRa)",
};

function whyFor(device: FlasherDevice, link: LinkId | null): string {
  if (device === "rp2040") {
    return "You chose radio between stations, so the flasher takes you down the LoRa path: the Adafruit Feather RP2040 with its RFM95 radio.";
  }
  switch (link) {
    case "wifi":
      return "You chose Wi-Fi, so the flasher takes you down the Atom Lite path.";
    case "cell":
      return "You chose a cellular SIM, so the flasher takes you down the Atom Lite path, and the NB-IoT base carries the SIM.";
    case "poe":
      return "You chose a network cable that also powers the station, so the flasher takes you down the Atom Lite path, set to Ethernet / PoE.";
    default:
      return "The flasher takes you down the Atom Lite path.";
  }
}

/**
 * Which flasher path a plan leads to, or null when nothing can be flashed yet.
 * Wi-Fi, PoE, and cellular configurations (A, B, C) flash the Atom Lite.
 * The radio configuration (D) flashes the Feather RP2040 with LoRa.
 * The long-haul experiment (E) has no board, so there is nothing to flash.
 */
export function flashPathFor(configId: ConfigId, answers: Answers): FlashPath | null {
  if (configId === "E") return null;
  const device: FlasherDevice = configId === "D" ? "rp2040" : "esp32";
  const link = answers.link;

  const params = new URLSearchParams({ device, from: "plan" });
  if (link && link !== "ham") params.set("link", link);

  if (device === "rp2040") {
    return {
      device,
      board: BOARD.rp2040,
      why: whyFor(device, link),
      href: `${FLASHER_ROOT}?${params.toString()}`,
      bring: [
        "The Feather RP2040 RFM95 with its antenna attached",
        "A USB cable that carries data, not only power",
        "Chrome or Edge on a computer (the flasher needs Web Serial)",
        "Your name, email, and the site's latitude and longitude",
      ],
      steps: [
        {
          title: "Configure",
          body: "Enter the station owner and location. Advanced radio timing has working defaults.",
        },
        {
          title: "Flash",
          body: "Hold BOOTSEL while plugging in, copy the firmware, then the browser saves your settings to the board.",
        },
      ],
    };
  }

  return {
    device,
    board: BOARD.esp32,
    why: whyFor(device, link),
    href: `${FLASHER_ROOT}?${params.toString()}`,
    note:
      link === "cell"
        ? "The flasher's form has Wi-Fi and Ethernet fields only. It has no cellular or SIM settings, so it configures the Wi-Fi side of this station. Activate the SIM separately."
        : undefined,
    bring: [
      "The Atom Lite with its base attached",
      "A USB-C cable that carries data, not only power",
      "Chrome or Edge on a computer (the flasher needs Web Serial)",
      link === "poe"
        ? "The MQTT broker address and a topic for this station"
        : "The Wi-Fi name and password, the MQTT broker address, and a topic",
    ],
    steps: [
      {
        title: "Configure",
        body: "Name the station, set the network and broker. Advanced timing has working defaults.",
      },
      {
        title: "Flash",
        body: "Plug in the Atom Lite and the browser writes the firmware and your settings in one go.",
      },
    ],
  };
}
