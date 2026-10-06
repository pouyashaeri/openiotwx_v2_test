import type {
  ConfigId,
  CountId,
  GapId,
  Intent,
  LinkId,
  MeasureId,
  PlaceId,
  ProgressId,
  SurpriseId,
  WhoId,
} from "./types";

export type Choice<T extends string | number> = {
  id: T;
  title: string;
  body: string;
  icon: string;
};

export const INTENTS: Choice<Intent>[] = [
  {
    id: "community",
    title: "A place and the people there",
    body: "A neighborhood, a campus, a coast, a town. You want a station and a first plan people can share.",
    icon: "users",
  },
  {
    id: "watch",
    title: "One site I look after",
    body: "A home, a building, a field, a road. Start with what that site has to live with.",
    icon: "home",
  },
  {
    id: "teach",
    title: "A class or a lab",
    body: "Students should leave with a build they understand and a short list of what to do next.",
    icon: "school",
  },
  {
    id: "bench",
    title: "I want to build one and learn",
    body: "Parts, print time, and the flashing checklist. Skip the community plan.",
    icon: "hammer",
  },
];

export const PLACES: Choice<PlaceId>[] = [
  {
    id: "urban",
    title: "In town",
    body: "Buildings, power, and a network are close. A mast on a roof, a yard, or a campus quad.",
    icon: "building",
  },
  {
    id: "edge",
    title: "Edge of town",
    body: "Wi-Fi thins out. A road, a shelter, or a site that is close to people but far from a router.",
    icon: "sign",
  },
  {
    id: "rural",
    title: "Rural or hard to reach",
    body: "Services are a trip away. Stations may need to hear each other without a building network.",
    icon: "trees",
  },
  {
    id: "extreme",
    title: "Beyond the usual network",
    body: "Cell is unreliable or gone. Getting there is the hard part. Plan for power you carry in.",
    icon: "mountain",
  },
];

export const LINKS: Choice<LinkId>[] = [
  {
    id: "poe",
    title: "A network cable that also powers it",
    body: "Ethernet with power on the same cable. Best beside a building that already has a drop.",
    icon: "cable",
  },
  {
    id: "wifi",
    title: "Wi-Fi that actually reaches",
    body: "A hotspot or building network you trust at the mast. Wall power or a small solar panel.",
    icon: "wifi",
  },
  {
    id: "cell",
    title: "A small cellular SIM",
    body: "The station carries its own NB-IoT radio. For the edge of town, a shelter, or a long driveway.",
    icon: "signal",
  },
  {
    id: "lora",
    title: "Radio between stations",
    body: "LoRa can talk pair-to-pair with no gateway. LoRaWAN is there later if you add one.",
    icon: "radio",
  },
  {
    id: "ham",
    title: "Far past cell, by amateur radio",
    body: "Only if you already work with ham radio. This path is not ready to order or flash.",
    icon: "antenna",
  },
];

export const MEASURES: Choice<MeasureId>[] = [
  {
    id: "air",
    title: "The air around the site",
    body: "Temperature, humidity, and pressure. Everyday parts also sniff volatile compounds.",
    icon: "thermo",
  },
  {
    id: "rain",
    title: "Rain",
    body: "A digital gauge on the Grove port. The first wiring map keeps it there.",
    icon: "rain",
  },
  {
    id: "wind",
    title: "Wind",
    body: "An ultrasonic anemometer on RS-485. Housing is specified. Firmware is not finished.",
    icon: "wind",
  },
  {
    id: "soil",
    title: "Soil moisture",
    body: "A wired probe for beds, fields, or a levee. Firmware for this probe is still in progress.",
    icon: "sprout",
  },
  {
    id: "pm",
    title: "Particles in the air",
    body: "Fine dust and smoke. Useful when the air itself is what people notice.",
    icon: "haze",
  },
  {
    id: "co2",
    title: "Carbon dioxide",
    body: "A room, a classroom, or a shelter where stale air matters.",
    icon: "gauge",
  },
  {
    id: "ozone",
    title: "Ozone",
    body: "An outdoor gas reading for days when the air feels sharp.",
    icon: "sun",
  },
  {
    id: "sun",
    title: "Sunlight and UV",
    body: "How bright it is, and a UV reading beside it. Both are small Qwiic boards.",
    icon: "rays",
  },
];

export const COUNTS: Choice<CountId>[] = [
  {
    id: 1,
    title: "One station",
    body: "Learn the build, or watch a single mast.",
    icon: "one",
  },
  {
    id: 3,
    title: "A handful",
    body: "Three stations. Enough to compare a roof, a street, and a low spot.",
    icon: "few",
  },
  {
    id: 6,
    title: "A small network",
    body: "Six stations. Someone has to keep the checklist, not just the hardware.",
    icon: "many",
  },
];

export const SURPRISES: Choice<SurpriseId>[] = [
  {
    id: "water",
    title: "Water where it causes trouble",
    body: "Flooding, a low street, a roof, a culvert that surprises people.",
    icon: "rain",
  },
  {
    id: "heat",
    title: "Heat that wears people down",
    body: "Afternoons that stay hot, or rooms that do not cool overnight.",
    icon: "thermo",
  },
  {
    id: "air",
    title: "Air that feels wrong",
    body: "Smoke, dust, exhaust, or a shelter that goes stale.",
    icon: "haze",
  },
  {
    id: "storm",
    title: "Wind and storms",
    body: "Gusts, a loose roof, or gear that has to stay tied down.",
    icon: "wind",
  },
  {
    id: "dry",
    title: "Dry ground",
    body: "Gardens, fields, or soils that fail before anyone agrees they are dry.",
    icon: "sprout",
  },
  {
    id: "power",
    title: "Power or contact drops out",
    body: "The measurement only helps if the station can still be heard.",
    icon: "battery",
  },
  {
    id: "picture",
    title: "No shared picture yet",
    body: "People swap stories. Nobody has a reading from this place.",
    icon: "users",
  },
];

export const WHO: Choice<WhoId>[] = [
  {
    id: "neighbors",
    title: "Households and neighbors",
    body: "People who live with the station, not only the person who built it.",
    icon: "home",
  },
  {
    id: "school",
    title: "A school or youth group",
    body: "A class that can keep the checklist between semesters.",
    icon: "school",
  },
  {
    id: "land",
    title: "People who grow or steward land",
    body: "A farm, a garden, a restoration site, a shoreline.",
    icon: "sprout",
  },
  {
    id: "coordinators",
    title: "People who step in when something breaks",
    body: "The folks neighbors already call. They need a one-page version.",
    icon: "clipboard",
  },
  {
    id: "partners",
    title: "A lab, agency, or partner",
    body: "Useful, as long as the community can still decide what is shared.",
    icon: "building",
  },
];

export const PROGRESS: Choice<ProgressId>[] = [
  {
    id: "trust",
    title: "A station people trust",
    body: "The numbers look sane, and someone knows who to ask when they do not.",
    icon: "check",
  },
  {
    id: "ours",
    title: "Readings we can see, on our terms",
    body: "A dashboard or a download that does not require giving the data away.",
    icon: "shield",
  },
  {
    id: "checklist",
    title: "A one-page checklist",
    body: "Short enough to follow on a bad day, not only on build day.",
    icon: "clipboard",
  },
  {
    id: "backup",
    title: "A backup if the first site fails",
    body: "Another mount, another host, or a second station already named.",
    icon: "home",
  },
  {
    id: "practice",
    title: "We have tried the plan once",
    body: "A date on the calendar before anyone actually needs it.",
    icon: "flag",
  },
];

export const GAPS: Choice<GapId>[] = [
  {
    id: "nomeasure",
    title: "No local measurements yet",
    body: "The first useful thing is a station that really runs.",
    icon: "gauge",
  },
  {
    id: "control",
    title: "Data exists, but it is not ours",
    body: "Someone else holds the record. This place cannot reuse it.",
    icon: "shield",
  },
  {
    id: "owner",
    title: "Nobody is clearly responsible",
    body: "Hardware fails quietly when everyone assumes someone else looks.",
    icon: "users",
  },
  {
    id: "siting",
    title: "We are not sure where it should live",
    body: "Permission, shade, flooding, and who can visit it are still open.",
    icon: "pin",
  },
  {
    id: "upkeep",
    title: "Building is easier than keeping it running",
    body: "The plan should budget a monthly look, not only a weekend build.",
    icon: "wrench",
  },
];

export type ConfigSpec = {
  id: ConfigId;
  name: string;
  tag: string;
  mcu: string;
  comms: string;
  base: string;
  baseCost: string;
  baseCents: number;
  power: string;
  places: string;
};

export const CONFIGS: Record<ConfigId, ConfigSpec> = {
  A: {
    id: "A",
    name: "Classic building drop",
    tag: "Wi-Fi, optional PoE",
    mcu: "M5Stack Atom Lite (ESP32)",
    comms: "Wi-Fi 4/5 through an external hotspot, or PoE when the W5500 base is fitted",
    base: "M5Stack PoE base (W5500), only if you are using the cable for power",
    baseCost: "$18.50",
    baseCents: 1850,
    power: "Power over Ethernet, or USB from a wall plug if you skip the PoE base",
    places: "Urban, simple sensor list",
  },
  B: {
    id: "B",
    name: "Neighborhood Wi-Fi",
    tag: "Portable sensor mix",
    mcu: "M5Stack Atom Lite (ESP32)",
    comms: "Wi-Fi 4/5 through an external hotspot",
    base: "M5Stack PortABC + Seeed RS-485 Grove",
    baseCost: "$9.09",
    baseCents: 909,
    power: "Wall plug or a 6–10 W solar panel",
    places: "Urban, when the sensor list gets longer",
  },
  C: {
    id: "C",
    name: "Edge cellular",
    tag: "Wi-Fi plus NB-IoT",
    mcu: "M5Stack Atom Lite (ESP32)",
    comms: "Wi-Fi 4/5, plus an internal NB-IoT SIM",
    base: "M5Stack DTU NB-IoT2 v1.1",
    baseCost: "$17.90",
    baseCents: 1790,
    power: "Wall plug or a 20 W solar panel",
    places: "Urban edge, suburban, semi-rural",
  },
  D: {
    id: "D",
    name: "Radio link",
    tag: "LoRa, pair or LoRaWAN",
    mcu: "M5Stack Atom Lite (ESP32)",
    comms: "LoRa. Pair-to-pair needs no gateway. LoRaWAN if you add one later.",
    base: "M5Stack DTU LoRaWAN base, US915",
    baseCost: "$22.90",
    baseCents: 2290,
    power: "About 10 W of solar",
    places: "Rural, remote, and town sites that should hear each other",
  },
  E: {
    id: "E",
    name: "Long-haul experiment",
    tag: "Not ready to build",
    mcu: "Board still to be chosen",
    comms: "Amateur radio, WSPR/APRS, 1.8–30 MHz",
    base: "No base specified yet",
    baseCost: "n/a",
    baseCents: 0,
    power: "About 20 W of solar, once a board exists",
    places: "Extreme remote only",
  },
};

export const DOCS = {
  home: "https://ncar.github.io/openiotwx/",
  guide: "https://ncar.github.io/openiotwx/guide/",
  print: "https://ncar.github.io/openiotwx/print/",
  flash: "https://ncar.github.io/openiotwx/installation/core_install/",
  assemble: "https://ncar.github.io/openiotwx/assemble/core/",
  data: "https://ncar.github.io/openiotwx/data_management/",
  platform: "https://ncar.github.io/openiotwx/introduction/platform/",
  ideals: "https://ncar.github.io/openiotwx/introduction/ideals/",
  contribute: "https://ncar.github.io/openiotwx/contribution/",
  firmware: "https://github.com/NCAR/esp32-atomlite-arduino-iotwx",
  stl: "https://github.com/NCAR/openiotwx-stl/tree/main/housing",
} as const;

export function intentLabel(id: Intent): string {
  return INTENTS.find((item) => item.id === id)?.title ?? id;
}

export function placeLabel(id: PlaceId): string {
  return PLACES.find((item) => item.id === id)?.title ?? id;
}

export function linkLabel(id: LinkId): string {
  return LINKS.find((item) => item.id === id)?.title ?? id;
}
