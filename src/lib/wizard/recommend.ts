import { CONFIGS } from "./catalog.ts";
import type { Answers, ConfigId, MeasureId } from "./types.ts";

export type Decline = { id: ConfigId; name: string; because: string };

export type Recommendation = {
  configId: Exclude<ConfigId, "E">;
  experimental: boolean;
  reasons: string[];
  declined: Decline[];
  ports: string[];
  power: string;
  baseLine: string;
  baseCents: number;
  includePoeBase: boolean;
};

const QWIIC: MeasureId[] = ["air", "pm", "co2", "ozone", "sun"];

function has(answers: Answers, id: MeasureId): boolean {
  return answers.measures.includes(id);
}

function qwiicCount(answers: Answers): number {
  return QWIIC.filter((id) => has(answers, id)).length;
}

function rs485Count(answers: Answers): number {
  return (has(answers, "wind") ? 1 : 0) + (has(answers, "soil") ? 1 : 0);
}

function decline(
  chosen: Exclude<ConfigId, "E">,
  lines: Record<Exclude<ConfigId, "E">, string>,
  experimental: boolean,
): Decline[] {
  const ids: Array<Exclude<ConfigId, "E">> = ["A", "B", "C", "D"];
  const rows: Decline[] = ids
    .filter((id) => id !== chosen)
    .map((id) => ({ id, name: CONFIGS[id].name, because: lines[id] }));
  rows.push({
    id: "E",
    name: CONFIGS.E.name,
    because: experimental
      ? "Kept as a later experiment. There is no board to flash yet, so it is not the station in this draft."
      : "Amateur radio at 1.8–30 MHz is only for sites past every other link, and the board is still unchosen.",
  });
  return rows;
}

/** Sites close to buildings, where a network is usually within reach. */
export function isNearBuildings(place: Answers["place"]): boolean {
  return place === "urban" || place === "indoors" || place === "home";
}

/** The old "edge of town" case: close to people, far from a router. A farm usually behaves the same. */
export function isMidRange(place: Answers["place"]): boolean {
  return place === "edge" || place === "farm";
}

/** Panel size or plug, in the person's own terms, when they told us how the station is powered. */
function powerFor(
  configId: Exclude<ConfigId, "E">,
  answers: Answers,
  fallback: string,
): string {
  if (answers.power === "outlet") {
    // Power over the network cable is still the plan when the PoE base is in play.
    return fallback.startsWith("Power over Ethernet")
      ? fallback
      : "A wall outlet with a USB power adapter";
  }
  if (answers.power === "solar") {
    const panel = configId === "C" ? "about 20 W" : configId === "D" ? "about 10 W" : "6–10 W";
    return `A solar panel, ${panel}`;
  }
  return fallback;
}

function placeTension(answers: Answers): string | null {
  if (
    (answers.place === "rural" || answers.place === "extreme") &&
    (answers.link === "wifi" || answers.link === "poe")
  ) {
    return "You described a remote site but a building-style link. That holds only if the cable or hotspot truly reaches the mast. If it does not, come back and choose radio or cellular.";
  }
  if (answers.place === "extreme" && answers.link === "cell") {
    return "Cellular at a site you called beyond the usual network is a gamble. If the SIM cannot register there, the radio build is the fallback.";
  }
  if (isNearBuildings(answers.place) && answers.link === "lora") {
    return "Radio is a fair choice in town when stations should hear each other instead of depending on a building network.";
  }
  return null;
}

function loraPartner(answers: Answers): string | null {
  if ((answers.count ?? 1) < 2) {
    return "One LoRa station still needs a partner that can hear it: a second node beside a desk, or a gateway later. Pair-to-pair does not require LoRaWAN.";
  }
  return "With more than one station, LoRa can run pair-to-pair and skip a gateway. The base in this plan is the US915 version. Other regions need a different radio.";
}

export function recommend(answers: Answers): Recommendation {
  const rain = has(answers, "rain");
  const qwiic = qwiicCount(answers) > 0;
  const rs = rs485Count(answers);
  const poe = answers.link === "poe";
  const reasons: string[] = [];
  const tension = placeTension(answers);
  if (tension) reasons.push(tension);

  const finish = (
    configId: Exclude<ConfigId, "E">,
    extra: string[],
    ports: string[],
    power: string,
    baseLine: string,
    baseCents: number,
    includePoeBase: boolean,
    experimental: boolean,
    declined: Record<Exclude<ConfigId, "E">, string>,
  ): Recommendation => ({
    configId,
    experimental,
    reasons: [...reasons, ...extra],
    declined: decline(configId, declined, experimental),
    ports,
    power: powerFor(configId, answers, power),
    baseLine,
    baseCents,
    includePoeBase,
  });

  if (answers.link === "ham") {
    return finish(
      "D",
      [
        "You asked for a path past cellular range. Long-haul ham radio (WSPR/APRS, 1.8–30 MHz) has no chosen board yet, so this draft builds the LoRa station you can assemble and keeps ham radio as a later experiment.",
        loraPartner(answers) ?? "",
      ].filter(Boolean),
      portsFor("D", answers),
      CONFIGS.D.power,
      `${CONFIGS.D.base} (${CONFIGS.D.baseCost})`,
      CONFIGS.D.baseCents,
      false,
      true,
      {
        A: "A building drop does not reach a site this far out.",
        B: "Neighborhood Wi-Fi still needs a hotspot at the mast.",
        C: "Cellular was not the link you can count on here.",
        D: "",
      },
    );
  }

  if (answers.link === "lora") {
    return finish(
      "D",
      [
        "LoRa matches a plan where the stations themselves are the network. Pair-to-pair needs no gateway. The listed base is US915.",
        loraPartner(answers) ?? "",
        rs
          ? "Wind and soil ride RS-485. On this base that is the native port plus Port A, two devices at most. Firmware for both sensors is still in progress."
          : "",
      ].filter(Boolean),
      portsFor("D", answers),
      CONFIGS.D.power,
      `${CONFIGS.D.base} (${CONFIGS.D.baseCost})`,
      CONFIGS.D.baseCents,
      false,
      false,
      {
        A: "The classic drop assumes a hotspot or a network cable.",
        B: "The Wi-Fi base is the wrong radio for this link.",
        C: "Cellular is the other way to leave Wi-Fi behind. You chose station-to-station radio instead.",
        D: "",
      },
    );
  }

  if (answers.link === "cell") {
    return finish(
      "C",
      [
        "An NB-IoT SIM in the base reports where a hotspot will not. Activate the SIM before field day, and budget a 20 W panel or a plug.",
        rs
          ? "Wind and soil use RS-485, two devices maximum on this base (native plus Port A). Treat both as firmware-in-progress, not plug-and-play."
          : "Rain, if you selected it, stays on the microcontroller Grove port.",
      ],
      portsFor("C", answers),
      CONFIGS.C.power,
      `${CONFIGS.C.base} (${CONFIGS.C.baseCost})`,
      CONFIGS.C.baseCents,
      false,
      false,
      {
        A: "The classic station has no internal cellular radio.",
        B: "Wi-Fi alone was not the link you said reaches this mast.",
        C: "",
        D: "Choose radio instead if the SIM will not register at the site. LoRa can pair without a gateway.",
      },
    );
  }

  const classicBlocked =
    rs > 0 || (poe && rain && qwiic);

  if (!classicBlocked) {
    const poeBase = poe;
    const extra = [
      poeBase
        ? "A network drop with power on the cable fits the classic station. The PoE base is the extension under the Atom Lite."
        : "A short urban sensor list on a real hotspot fits the classic Atom Lite. Skip the PoE base unless a network drop is actually there.",
      rain
        ? "The rain gauge takes the Grove port. Do not add an RS-485 sensor to this classic build."
        : "Qwiic parts chain on the GPIO header, up to eight.",
      poe && rain && !qwiic
        ? "Rain with PoE is acceptable here only because no Qwiic chain is sharing the build."
        : "",
    ].filter(Boolean);
    return finish(
      "A",
      extra,
      portsFor("A", answers, poeBase),
      poeBase ? "Power over Ethernet from the W5500 base" : CONFIGS.A.power,
      poeBase
        ? `${CONFIGS.A.base} (${CONFIGS.A.baseCost})`
        : "No extension base required. Add the PoE base later only if a network drop appears ($18.50).",
      poeBase ? CONFIGS.A.baseCents : 0,
      poeBase,
      false,
      {
        A: "",
        B: "The PortABC base is for RS-485 instruments or a mix the classic drop cannot carry.",
        C: "Cellular adds a SIM and a larger power budget you did not ask for.",
        D: "Radio is the switch to make if the hotspot or cable stops reaching the mast.",
      },
    );
  }

  const whyB = [
    rs
      ? "Wind or soil needs RS-485. The PortABC base is the one specified for that: rain stays on Grove, quick-connect on Port A, RS-485 on Ports B and C. Firmware for the anemometer and the soil probe is not finished."
      : "PoE, rain, and a Qwiic chain collide on the classic drop. Rain cannot share that build with both PoE and Qwiic parts.",
    "Power becomes a wall plug or a 6–10 W solar panel, not the cable.",
  ];
  return finish(
    "B",
    whyB,
    portsFor("B", answers),
    CONFIGS.B.power,
    `${CONFIGS.B.base} (${CONFIGS.B.baseCost})`,
    CONFIGS.B.baseCents,
    false,
    false,
    {
      A: poe
        ? "Classic PoE cannot carry this sensor mix. The PoE base is out; RS-485 also refuses to share it with rain."
        : "Classic Wi-Fi is for a Qwiic and Grove list without RS-485 instruments.",
      B: "",
      C: "Add cellular only if the hotspot fails at the mast. It costs more power.",
      D: "LoRa replaces Wi-Fi when stations should relay on their own. Pair-to-pair needs no gateway.",
    },
  );
}

function portsFor(
  id: Exclude<ConfigId, "E">,
  answers: Answers,
  poeBase = false,
): string[] {
  const rain = has(answers, "rain");
  const rs = rs485Count(answers);
  const qwiic = qwiicCount(answers) > 0;

  if (id === "A") {
    return [
      rain
        ? "Grove on the Atom Lite: Hydreon RG15 rain gauge."
        : "Grove on the Atom Lite: free in this build.",
      qwiic
        ? "Qwiic chain on the GPIO header, up to eight parts."
        : "No Qwiic chain in this build.",
      poeBase
        ? "PoE base (W5500) underneath. It takes the extension spot."
        : "No PoE base. Power the Atom Lite from USB.",
      "RS-485 is not part of this build. Wind and soil would force a different base.",
    ];
  }

  if (id === "B") {
    return [
      "Grove on the Atom Lite: Hydreon RG15. This first version keeps rain there.",
      "Port A: quick-connect devices.",
      rs
        ? "Ports B and C: RS-485 for wind and soil. This base allows up to three RS-485 devices."
        : "Ports B and C: spare RS-485. Use them later without replanning the orb.",
      qwiic
        ? "Qwiic: use Port B only when that port is not holding RS-485. Otherwise keep the chain off the RS-485 ports."
        : "Qwiic: none selected. Port B can take a chain later if it is free of RS-485.",
    ];
  }

  const shared =
    rs >= 2 && qwiic
      ? "Port A is busy: both RS-485 devices need native plus Port A. Keep the Qwiic chain on the microcontroller Grove side, with the rain gauge."
      : qwiic
        ? "Qwiic: microcontroller Grove or Port A."
        : "Qwiic: none selected.";
  return [
    rain
      ? "Grove on the Atom Lite: Hydreon RG15."
      : "Grove on the Atom Lite: open for a Grove part or a short Qwiic lead.",
    "RS-485: the native port plus Port A, two devices maximum.",
    shared,
    id === "D"
      ? "Radio base is US915 LoRaWAN hardware. Pair-to-pair does not require a gateway or a LoRaWAN network."
      : "The NB-IoT base needs a SIM activated before you seal the housing.",
  ];
}

export function knownAddonCents(answers: Answers, baseCents: number): number {
  const n = answers.count ?? 1;
  let cents = baseCents * n;
  if (has(answers, "wind")) cents += 6200 * n;
  if (has(answers, "soil")) cents += 2990 * n;
  return cents;
}

export function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
