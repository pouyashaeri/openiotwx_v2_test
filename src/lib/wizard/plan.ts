import {
  CONFIGS,
  COUNTS,
  DOCS,
  GAPS,
  INTENTS,
  LINKS,
  MEASURES,
  PLACES,
  PROGRESS,
  SURPRISES,
  WHO,
  intentLabel,
} from "./catalog.ts";
import {
  formatMoney,
  isMidRange,
  isNearBuildings,
  knownAddonCents,
  recommend,
  type Recommendation,
} from "./recommend.ts";
import type {
  Answers,
  GapId,
  Goal,
  GoalChange,
  MeasureId,
  ProgressId,
  SurpriseId,
  WhoId,
} from "./types.ts";

export type SensorPick = {
  id: string;
  name: string;
  role: string;
  iface: string;
  status: "classic" | "check" | "pending";
  note: string;
  price?: string;
};

export type Task = {
  id: string;
  group: "Parts" | "Build" | "Deploy" | "With people" | "Check-ins";
  label: string;
  detail?: string;
};

export type Coverage = {
  id: string;
  label: string;
  note: string;
  score: number;
};

export type DraftPlan = {
  ready: boolean;
  siteName: string;
  hobby: boolean;
  recommendation: Recommendation | null;
  sensors: SensorPick[];
  tasks: Task[];
  suggestedGoals: Goal[];
  coverage: Coverage[];
  printHours: number;
  printNote: string;
  addonCents: number;
  stationCount: number;
};

const STATUS_LABEL: Record<SensorPick["status"], string> = {
  classic: "In the classic guide",
  check: "Confirm the driver",
  pending: "Firmware in progress",
};

export function statusLabel(status: SensorPick["status"]): string {
  return STATUS_LABEL[status];
}

function has(answers: Answers, id: MeasureId): boolean {
  return answers.measures.includes(id);
}

export function sensorPicks(answers: Answers): SensorPick[] {
  const picks: SensorPick[] = [];
  if (has(answers, "air")) {
    if (answers.sharp) {
      picks.push({
        id: "ms8607",
        name: "MS8607",
        role: "Temperature, pressure, and humidity",
        iface: "Qwiic",
        status: "check",
        note: "Chosen because the site swings hot or cold. It does not read VOC. TMP117 and TMP119 are temperature-only alternatives. HDC3022 covers temperature and humidity, not pressure.",
      });
    } else {
      picks.push({
        id: "bme",
        name: "BME680 or BME688",
        role: "Temperature, humidity, pressure, and VOC",
        iface: "Qwiic",
        status: "classic",
        note: "One everyday part covers the air trio and a VOC reading. Move to the MS8607 if extremes are the point.",
      });
    }
  } else if (answers.sharp) {
    picks.push({
      id: "tmp",
      name: "TMP117 or TMP119",
      role: "Temperature only",
      iface: "Qwiic",
      status: "check",
      note: "A narrow high-precision temperature part. MCP9808 is the other temperature option on the list. Add an MS8607 if you also need pressure and humidity.",
    });
  }
  if (has(answers, "rain")) {
    picks.push({
      id: "rg15",
      name: "Hydreon RG15",
      role: "Rain",
      iface: "Grove",
      status: "classic",
      note: "Screws into the orb in place of the stock base. First-version firmware expects it on the microcontroller Grove port.",
    });
  }
  if (has(answers, "wind")) {
    picks.push({
      id: "ws302",
      name: "SENTEC WS302",
      role: "Wind speed and direction",
      iface: "RS-485",
      status: "pending",
      price: "$62.00",
      note: "Ultrasonic anemometer. The price is on the configuration sheet. Do not treat it as plug-and-play until the firmware lands.",
    });
  }
  if (has(answers, "soil")) {
    picks.push({
      id: "soil",
      name: "DFRobot RS-485 soil moisture",
      role: "Soil moisture",
      iface: "RS-485",
      status: "pending",
      price: "$29.90",
      note: "Listed on the configuration sheet. Wiring can be planned now. The software column is still not done.",
    });
  }
  if (has(answers, "pm")) {
    picks.push({
      id: "pm",
      name: "PMSA3000i",
      role: "Fine particles",
      iface: "Qwiic",
      status: "check",
      note: "The classic assembly guide houses an air-quality node. Confirm this exact part’s driver in the firmware you flash.",
    });
  }
  if (has(answers, "co2")) {
    picks.push({
      id: "co2",
      name: "SCD40",
      role: "Carbon dioxide",
      iface: "Qwiic",
      status: "check",
      note: "Chain it with the other Qwiic parts. It is a poor outdoor wind-rain sensor and a good shelter or classroom sensor.",
    });
  }
  if (has(answers, "ozone")) {
    picks.push({
      id: "o3",
      name: "DFRobot SEN0321",
      role: "Ozone",
      iface: "Qwiic",
      status: "check",
      note: "Keep the element out of standing water. Cap every unused 1 inch port on the orb.",
    });
  }
  if (has(answers, "sun")) {
    picks.push({
      id: "uv",
      name: "LTR390",
      role: "Ultraviolet",
      iface: "Qwiic",
      status: "classic",
      note: "The classic guide prints a UV tube and cap. Peel any film off the sensor.",
    });
    picks.push({
      id: "lux",
      name: "TSL2591",
      role: "Light intensity",
      iface: "Qwiic",
      status: "check",
      note: "Pair with the UV board or drop it if you only need one sun reading.",
    });
  }
  return picks;
}

function printHours(answers: Answers): { hours: number; note: string } {
  const n = answers.count ?? 1;
  let one = 14;
  if (has(answers, "air") || answers.sharp) one += 6;
  if (has(answers, "rain")) one += 4;
  if (has(answers, "sun")) one += 4;
  if (has(answers, "pm") || has(answers, "co2") || has(answers, "ozone")) one += 5;
  if (has(answers, "wind")) one += 4;
  if (has(answers, "soil")) one += 3;
  const capped = Math.min(35, one);
  const hours = capped * n;
  const note =
    capped >= 35
      ? `About ${hours} hours for ${n} station${n === 1 ? "" : "s"}. A full station with base accessories is 35 hours on an entry-level printer. Most single parts finish in under 5 hours.`
      : `About ${hours} hours for ${n} station${n === 1 ? "" : "s"}, lighter than the 35-hour full kit because you are not printing every housing. Most single parts finish in under 5 hours.`;
  return { hours, note };
}

function tasksFor(answers: Answers, rec: Recommendation, sensors: SensorPick[]): Task[] {
  const n = answers.count ?? 1;
  const cfg = CONFIGS[rec.configId];
  const tasks: Task[] = [
    {
      id: "part-mcu",
      group: "Parts",
      label: `Order ${n} × ${cfg.mcu}`,
      detail: "New builds use the Atom Lite. Do not buy a fresh RP2040 unless you are repairing a station already in the field.",
    },
    {
      id: "part-base",
      group: "Parts",
      label: rec.includePoeBase || rec.baseCents > 0
        ? `Order ${n} × ${rec.baseLine}`
        : "Skip the extension base unless you add PoE later",
      detail: rec.baseLine,
    },
  ];

  for (const sensor of sensors) {
    tasks.push({
      id: `part-${sensor.id}`,
      group: "Parts",
      label: `Order ${n} × ${sensor.name}`,
      detail: sensor.price
        ? `${sensor.role}. About ${sensor.price} each. ${sensor.note}`
        : `${sensor.role} on ${sensor.iface}. ${sensor.note}`,
    });
  }

  tasks.push(
    {
      id: "part-power",
      group: "Parts",
      label: `Power: ${rec.power}`,
      detail:
        rec.configId === "C"
          ? "A cellular base wants the larger budget. A 20 W panel or a wall plug."
          : rec.configId === "D"
            ? "A 10 W panel is the listed budget. Test it under the light the site actually gets."
            : "Confirm the supply before you print a housing around it.",
    },
    {
      id: "part-mast",
      group: "Parts",
      label: "1 inch threaded mast, caps, and filament",
      detail:
        "Any 1 inch PVC or matching thread works. Cap unused ports so water and dust stay out of the orb.",
    },
    {
      id: "build-print",
      group: "Build",
      label: "Print the housings you actually need",
      detail: `STL files live with the housing repository. ${printHours(answers).note}`,
    },
    {
      id: "build-firmware",
      group: "Build",
      label: "Install the IoTwx library and Atom Lite board profile",
      detail:
        "Upload speed 115200, CPU 240 MHz, flash 4 MB, partition scheme Huge APP. Library: NCAR esp32-atomlite-arduino-iotwx.",
    },
    {
      id: "build-config",
      group: "Build",
      label: "Write config.json for this link, then upload the filesystem",
      detail:
        "Flash the sketch, then load the data folder with LittleFS / ESP32 Sketch Data Upload. The old shortcut uploader was removed because it exposed credentials. Close other serial tools if the port is busy, tap reset, and pick the board again.",
    },
    {
      id: "build-bench",
      group: "Build",
      label: "Bench-test every sensor marked ready before it goes in the orb",
      detail: sensors.some((sensor) => sensor.status === "pending")
        ? "Leave wind and soil on the checklist as wiring only until firmware exists. Do not block the rest of the station on them."
        : "A sane temperature and a sane clock are enough to move on.",
    },
    {
      id: "build-assemble",
      group: "Build",
      label: "Assemble the orb and cap what you are not using",
      detail:
        "Follow the classic core assembly for rain, air, and UV housings even if the base underneath is new.",
    },
    {
      id: "deploy-permission",
      group: "Deploy",
      label: "Put it only where you are allowed to",
      detail: "Roof, yard, vehicle, or field. Permission first, then the mast.",
    },
    {
      id: "deploy-link",
      group: "Deploy",
      label: "Prove the link from the real site before the final mount",
      detail:
        rec.configId === "C"
          ? "Seat the SIM, activate it with the carrier, and confirm a message leaves the site."
          : rec.configId === "D"
            ? "Hear the paired station or gateway from the mast location, not from the workbench."
            : "Confirm the hotspot or cable still works at the height you will mount.",
    },
    {
      id: "deploy-data",
      group: "Deploy",
      label: "Choose where readings go, including the option to keep them",
      detail:
        "MQTT needs a broker. CHORDS is the documented service. Publishing onto the public OpenIoTwx map is optional. You do not owe anyone the data.",
    },
  );

  if (answers.intent !== "bench") {
    tasks.push(...communityTasks(answers));
  } else {
    tasks.push({
      id: "bench-note",
      group: "Check-ins",
      label: "Stop here if you only wanted the build",
      detail: "The field library has the classic manuals. Come back through the wizard if this station starts serving other people.",
    });
  }

  tasks.push(
    {
      id: "check-7",
      group: "Check-ins",
      label: "Day 7: power, time, and one reading that looks sane",
      detail: "Write down what failed. A dead station teaches more than a silent one.",
    },
    {
      id: "check-30",
      group: "Check-ins",
      label: "Day 30: copy an interim note and share it with whoever owns the site",
      detail: "Use the interim note button. It lists what is ticked on this device and which goal posts moved.",
    },
  );

  return tasks;
}

function communityTasks(answers: Answers): Task[] {
  const tasks: Task[] = [];
  const surprises = new Set(answers.surprises);
  const gaps = new Set(answers.gaps);
  const progress = new Set(answers.progress);
  const who = answers.who;

  if (who.length) {
    const names = who
      .map((id) => WHO.find((item) => item.id === id)?.title)
      .filter(Boolean)
      .join("; ");
    tasks.push({
      id: "people-who",
      group: "With people",
      label: "Name a steward and a backup who can both open this plan",
      detail: `You said this is for: ${names}.`,
    });
  } else {
    tasks.push({
      id: "people-who",
      group: "With people",
      label: "Name a steward before the station goes up",
      detail: "The wizard did not record who this is for. A station with no owner goes quiet.",
    });
  }

  if (surprises.has("water")) {
    tasks.push({
      id: "people-water",
      group: "With people",
      label: "Agree who looks at the rain reading when heavy weather is forecast",
      detail: "One name, one place they look, one thing they do if the number climbs.",
    });
  }
  if (surprises.has("heat")) {
    tasks.push({
      id: "people-heat",
      group: "With people",
      label: "Pick the afternoon hour someone will glance at temperature for the first month",
      detail: "Note shade, height, and whether the sensor is in a room or on a mast. Those change the meaning.",
    });
  }
  if (surprises.has("air")) {
    tasks.push({
      id: "people-air",
      group: "With people",
      label: "Write one sentence about what the air sensor does not do",
      detail: "It is not a medical device and it does not close a school by itself. Say what action a high reading actually triggers.",
    });
  }
  if (surprises.has("storm")) {
    tasks.push({
      id: "people-storm",
      group: "With people",
      label: "Plan the tie-down and who checks the mast after a storm",
      detail: "Wind firmware may lag the housing. The mount still has to survive the weather you named.",
    });
  }
  if (surprises.has("dry")) {
    tasks.push({
      id: "people-dry",
      group: "With people",
      label: "Walk the probe location with the person who works that ground",
      detail: "Soil firmware is unfinished. The siting conversation is still worth having now.",
    });
  }
  if (surprises.has("power") || gaps.has("upkeep")) {
    tasks.push({
      id: "people-power",
      group: "With people",
      label: "Write the monthly look: power, link, and a photo of the mast",
      detail: "Keeping it running was named as the hard part. Put it on a repeating date.",
    });
  }
  if (surprises.has("picture") || gaps.has("nomeasure")) {
    tasks.push({
      id: "people-picture",
      group: "With people",
      label: "Share the first week of readings with the people who asked for a picture",
      detail: "A photo of the screen is enough. A public map is not required.",
    });
  }
  if (gaps.has("control") || progress.has("ours")) {
    tasks.push({
      id: "people-control",
      group: "With people",
      label: "Decide, in writing, what stays private",
      detail:
        "Use a broker you control if the community does not want a public feed. Record the decision next to the goal posts.",
    });
  }
  if (gaps.has("siting")) {
    tasks.push({
      id: "people-site",
      group: "With people",
      label: "Walk two candidate sites and reject one",
      detail: "Permission, flooding, shade, and whether someone can visit it on a weekday.",
    });
  }
  if (progress.has("backup")) {
    tasks.push({
      id: "people-backup",
      group: "With people",
      label: "Name the backup mount or the neighbor who can host the station",
      detail: "Write it down before the first site is the only site.",
    });
  }
  if (progress.has("practice") || progress.has("checklist")) {
    tasks.push({
      id: "people-practice",
      group: "With people",
      label: "Put a practice date on a calendar before you need the plan",
      detail: "Run the checklist once. Note what was missing. That note is the interim report.",
    });
  }
  if (answers.intent === "teach") {
    tasks.push({
      id: "people-class",
      group: "With people",
      label: "Leave the next class a one-page version, not only the repository",
      detail: "What was built, what failed, who has the login, where the printer files are.",
    });
  }
  return tasks;
}

function suggestedGoals(answers: Answers): Goal[] {
  if (answers.intent === "bench") {
    return [
      {
        id: "goal-bench",
        text: "A station that boots, reads, and can be explained without the spreadsheet.",
      },
    ];
  }
  const goals: Goal[] = [];
  const push = (id: ProgressId | GapId | SurpriseId | WhoId | "default", text: string) => {
    goals.push({ id: `goal-${id}`, text });
  };
  if (answers.progress.includes("trust")) {
    push("trust", "A station people trust enough to look at before they look at the sky.");
  }
  if (answers.progress.includes("ours")) {
    push("ours", "Readings the community can open without handing the archive to someone else.");
  }
  if (answers.progress.includes("checklist")) {
    push("checklist", "A one-page checklist that still makes sense on a bad day.");
  }
  if (answers.progress.includes("backup")) {
    push("backup", "A named backup if the first mast, host, or link fails.");
  }
  if (answers.progress.includes("practice")) {
    push("practice", "One practice run, with notes, before the plan is needed for real.");
  }
  if (goals.length === 0) {
    push("default", "A working station and a named person who will look at it next month.");
  }
  return goals.slice(0, 4);
}

function coverage(answers: Answers, rec: Recommendation): Coverage[] {
  if (answers.intent === "bench") {
    return [
      {
        id: "parts",
        label: "Parts named",
        score: answers.measures.length ? 90 : 30,
        note: answers.measures.length
          ? "The sensor list is specific enough to order."
          : "No measurements selected yet.",
      },
      {
        id: "link",
        label: "Link matches the place",
        score: linkScore(answers),
        note: "Bench builds still fail when the link and the site disagree.",
      },
      {
        id: "manual",
        label: "You can build from the manuals",
        score: 80,
        note: "Classic flashing and assembly guides stay linked beside this draft.",
      },
    ];
  }

  return [
    {
      id: "seeing",
      label: "Seeing the place",
      score: seeingScore(answers),
      note: seeingNote(answers),
    },
    {
      id: "reaching",
      label: "Staying in touch",
      score: linkScore(answers),
      note: `${CONFIGS[rec.configId].name} is the link in this draft.`,
    },
    {
      id: "people",
      label: "Someone to own it",
      score: answers.who.length === 0 ? 35 : answers.who.length === 1 ? 70 : 90,
      note:
        answers.who.length === 0
          ? "No audience was named. Add one before you mount anything."
          : "An audience is named. A steward and a backup still have to be people, not categories.",
    },
    {
      id: "backup",
      label: "A second option",
      score: answers.progress.includes("backup") ? 90 : (answers.count ?? 1) > 1 ? 70 : 40,
      note: answers.progress.includes("backup")
        ? "You asked for a backup if the first site fails. The checklist has a line for it."
        : "There is no named backup yet.",
    },
    {
      id: "practice",
      label: "A trial run",
      score: answers.progress.includes("practice") ? 90 : answers.progress.includes("checklist") ? 65 : 35,
      note: answers.progress.includes("practice")
        ? "You wanted to try the plan before you need it."
        : "Nothing on the calendar yet. A trial run is how the checklist gets shorter.",
    },
  ];
}

function seeingScore(answers: Answers): number {
  const pairs: Array<[SurpriseId, MeasureId[]]> = [
    ["water", ["rain"]],
    ["heat", ["air"]],
    ["air", ["pm", "co2", "ozone", "air"]],
    ["storm", ["wind"]],
    ["dry", ["soil", "rain"]],
    ["picture", ["air", "rain", "pm", "sun"]],
  ];
  const active = pairs.filter(([id]) => answers.surprises.includes(id));
  if (active.length === 0) return answers.measures.length ? 60 : 30;
  const hit = active.filter(([, measures]) =>
    measures.some((measure) => answers.measures.includes(measure)),
  ).length;
  return Math.round(35 + (65 * hit) / active.length);
}

function seeingNote(answers: Answers): string {
  if (answers.surprises.length === 0) {
    return "The place questions were skipped, so this only reflects the sensors you picked.";
  }
  const missing: string[] = [];
  if (answers.surprises.includes("water") && !has(answers, "rain")) missing.push("rain");
  if (answers.surprises.includes("heat") && !has(answers, "air") && !answers.sharp) {
    missing.push("temperature");
  }
  if (
    answers.surprises.includes("air") &&
    !has(answers, "pm") &&
    !has(answers, "co2") &&
    !has(answers, "ozone") &&
    !has(answers, "air")
  ) {
    missing.push("an air measurement");
  }
  if (answers.surprises.includes("storm") && !has(answers, "wind")) missing.push("wind");
  if (answers.surprises.includes("dry") && !has(answers, "soil")) missing.push("soil moisture");
  if (missing.length === 0) return "The sensors line up with what you said the place deals with.";
  return `Still unmeasured: ${missing.join(", ")}. That may be fine. It should be a choice.`;
}

function linkScore(answers: Answers): number {
  const place = answers.place;
  const link = answers.link;
  if (!place || !link) return 40;
  const near = isNearBuildings(place);
  const mid = isMidRange(place);
  if (link === "ham") return place === "extreme" ? 70 : 45;
  if (link === "lora") return near ? 75 : 92;
  if (link === "cell") return place === "extreme" ? 55 : near ? 70 : 90;
  if (link === "poe") return near ? 90 : 50;
  if (link === "wifi") return near ? 92 : mid ? 68 : 48;
  return 60;
}

export function buildPlan(answers: Answers, siteName: string): DraftPlan {
  const ready = Boolean(
    answers.intent && answers.place && answers.link && answers.count && answers.measures.length,
  );
  if (!ready) {
    return {
      ready: false,
      siteName: siteName || "This place",
      hobby: answers.intent === "bench",
      recommendation: null,
      sensors: [],
      tasks: [],
      suggestedGoals: [],
      coverage: [],
      printHours: 0,
      printNote: "",
      addonCents: 0,
      stationCount: answers.count ?? 1,
    };
  }
  const recommendation = recommend(answers);
  const sensors = sensorPicks(answers);
  const printed = printHours(answers);
  return {
    ready: true,
    siteName: siteName.trim() || "This place",
    hobby: answers.intent === "bench",
    recommendation,
    sensors,
    tasks: tasksFor(answers, recommendation, sensors),
    suggestedGoals: suggestedGoals(answers),
    coverage: coverage(answers, recommendation),
    printHours: printed.hours,
    printNote: printed.note,
    addonCents: knownAddonCents(answers, recommendation.baseCents),
    stationCount: answers.count ?? 1,
  };
}

export function planToText(
  answers: Answers,
  plan: DraftPlan,
  goals: Goal[],
  checks: Record<string, boolean>,
  log: GoalChange[],
): string {
  if (!plan.ready || !plan.recommendation) return "Finish the wizard before copying a plan.";
  const cfg = CONFIGS[plan.recommendation.configId];
  const lines: string[] = [
    `OpenIoTwx draft plan`,
    `Place: ${plan.siteName}`,
    `Starting point: ${answers.intent ? intentLabel(answers.intent) : "Unset"}`,
    `Station: ${cfg.name} × ${plan.stationCount}`,
    `Link tag: ${cfg.tag}`,
    ``,
    `Why this station`,
    ...plan.recommendation.reasons.map((reason) => `- ${reason}`),
    ``,
    `Not chosen`,
    ...plan.recommendation.declined.map((row) => `- ${row.name}: ${row.because}`),
    ``,
    `Wiring`,
    ...plan.recommendation.ports.map((port) => `- ${port}`),
    `Power: ${plan.recommendation.power}`,
    plan.printNote,
    `Known base and listed sensor prices: ${formatMoney(plan.addonCents)}. Microcontrollers, filament, masts, and most Qwiic parts are extra.`,
    ``,
    `Sensors`,
    ...plan.sensors.map(
      (sensor) => `- ${sensor.name} (${sensor.iface}, ${statusLabel(sensor.status)}): ${sensor.note}`,
    ),
    ``,
    `Checklist`,
    ...plan.tasks.map((task) => `${checks[task.id] ? "[x]" : "[ ]"} ${task.group}: ${task.label}`),
    ``,
    `Goal posts`,
    ...goals.map((goal) => `- ${goal.text}`),
  ];
  if (log.length) {
    lines.push(``, `When the goal posts moved`);
    for (const change of log) {
      lines.push(`- ${change.at}: "${change.from}" → "${change.to}" (${change.why})`);
    }
  }
  lines.push(
    ``,
    `Draft coverage is a picture of this first plan, not a grade.`,
    ...plan.coverage.map((row) => `- ${row.label}: ${row.score} — ${row.note}`),
    ``,
    `Manuals: ${DOCS.guide}`,
    `Print files: ${DOCS.stl}`,
    `Firmware: ${DOCS.firmware}`,
  );
  return lines.join("\n");
}

export function interimText(
  plan: DraftPlan,
  goals: Goal[],
  checks: Record<string, boolean>,
  log: GoalChange[],
): string {
  if (!plan.ready || !plan.recommendation) return "No draft yet.";
  const done = plan.tasks.filter((task) => checks[task.id]);
  const open = plan.tasks.filter((task) => !checks[task.id]);
  const cfg = CONFIGS[plan.recommendation.configId];
  return [
    `OpenIoTwx interim note`,
    `Place: ${plan.siteName}`,
    `Date: ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`,
    `Station: ${cfg.name} × ${plan.stationCount}`,
    `Done on this device: ${done.length} of ${plan.tasks.length}`,
    ``,
    `Finished`,
    ...(done.length ? done.map((task) => `- ${task.label}`) : ["- Nothing ticked yet"]),
    ``,
    `Still open`,
    ...open.slice(0, 8).map((task) => `- ${task.label}`),
    ``,
    `Goal posts`,
    ...goals.map((goal) => `- ${goal.text}`),
    ``,
    log.length ? `Changes recorded: ${log.length}` : `No goal post has been edited yet.`,
    ...log.slice(-3).map((change) => `- ${change.why}`),
  ].join("\n");
}

export function choiceTitle(group: "place" | "link" | "count" | "intent", id: string | number): string {
  const table = { place: PLACES, link: LINKS, count: COUNTS, intent: INTENTS } as const;
  const found = table[group].find((item) => item.id === id);
  return found?.title ?? String(id);
}

export function measureTitle(id: MeasureId): string {
  return MEASURES.find((item) => item.id === id)?.title ?? id;
}

export function surpriseTitle(id: SurpriseId): string {
  return SURPRISES.find((item) => item.id === id)?.title ?? id;
}

export function progressTitle(id: ProgressId): string {
  return PROGRESS.find((item) => item.id === id)?.title ?? id;
}

export function gapTitle(id: GapId): string {
  return GAPS.find((item) => item.id === id)?.title ?? id;
}
