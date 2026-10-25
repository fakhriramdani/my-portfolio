import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMonthYear, formatRange, formatPeriod } from "../src/lib/date";

test("formatMonthYear renders Month YYYY in English (BR-005)", () => {
  assert.equal(formatMonthYear("2021-09"), "September 2021");
  assert.equal(formatMonthYear("2019-10"), "October 2019");
  assert.equal(formatMonthYear("2015-09"), "September 2015");
});

test("formatRange uses en dash and Present for open range (BR-005)", () => {
  assert.equal(formatRange("2021-09", null), "September 2021 – Present");
  assert.equal(
    formatRange("2019-10", "2021-09"),
    "October 2019 – September 2021",
  );
});

test("formatPeriod formats YYYY-MM ranges and preserves open range (BR-005)", () => {
  assert.equal(formatPeriod("2021-09 – Present"), "September 2021 – Present");
  assert.equal(
    formatPeriod("2019-10 – 2021-09"),
    "October 2019 – September 2021",
  );
});

test("formatMonthYear rejects invalid month", () => {
  assert.throws(() => formatMonthYear("2021-13"), /Invalid month/);
});
