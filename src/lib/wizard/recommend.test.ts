import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recommend } from "./recommend.ts";
import { blankAnswers, type Answers } from "./types.ts";

function answers(patch: Partial<Answers>): Answers {
  return { ...blankAnswers(), ...patch };
}

describe("recommend", () => {
  it("keeps a simple urban Wi-Fi station on the classic drop", () => {
    const result = recommend(
      answers({
        intent: "bench",
        place: "urban",
        link: "wifi",
        measures: ["air", "rain", "sun"],
        count: 1,
      }),
    );
    assert.equal(result.configId, "A");
    assert.equal(result.includePoeBase, false);
  });

  it("adds the PoE base only when the cable is the power plan and sensors allow it", () => {
    const result = recommend(
      answers({
        intent: "watch",
        place: "urban",
        link: "poe",
        measures: ["air"],
        count: 1,
      }),
    );
    assert.equal(result.configId, "A");
    assert.equal(result.includePoeBase, true);
    assert.equal(result.baseCents, 1850);
  });

  it("refuses PoE plus rain plus Qwiic on the classic drop", () => {
    const result = recommend(
      answers({
        intent: "community",
        place: "urban",
        link: "poe",
        measures: ["air", "rain"],
        count: 1,
      }),
    );
    assert.equal(result.configId, "B");
    assert.match(result.reasons.join(" "), /PoE/);
  });

  it("sends wind to the PortABC Wi-Fi base", () => {
    const result = recommend(
      answers({
        intent: "watch",
        place: "urban",
        link: "wifi",
        measures: ["air", "wind"],
        count: 1,
      }),
    );
    assert.equal(result.configId, "B");
    assert.match(result.reasons.join(" "), /Firmware/);
  });

  it("selects cellular when that is the link", () => {
    const result = recommend(
      answers({
        intent: "community",
        place: "edge",
        link: "cell",
        measures: ["air", "rain"],
        count: 3,
      }),
    );
    assert.equal(result.configId, "C");
    assert.equal(result.baseCents, 1790);
  });

  it("selects LoRa and mentions pair-to-pair", () => {
    const result = recommend(
      answers({
        intent: "community",
        place: "rural",
        link: "lora",
        measures: ["air", "rain"],
        count: 3,
      }),
    );
    assert.equal(result.configId, "D");
    assert.match(result.reasons.join(" "), /gateway/);
    assert.equal(result.experimental, false);
  });

  it("does not pretend ham radio is buildable", () => {
    const result = recommend(
      answers({
        intent: "community",
        place: "extreme",
        link: "ham",
        measures: ["air"],
        count: 1,
      }),
    );
    assert.equal(result.configId, "D");
    assert.equal(result.experimental, true);
    assert.equal(result.declined.some((row) => row.id === "E"), true);
  });
});
