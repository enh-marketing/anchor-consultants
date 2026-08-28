import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateEmi, formatAed, toMonths, clamp, EMI_LIMITS } from './emi.ts';

const round = (n: number, dp = 2) => Number(n.toFixed(dp));

test('matches the values shown on the WordPress original', () => {
  // 50,000 AED at 15% over 5 years. The live site displays 1189 / 71,370 / 21,370.
  const { emi, totalPayment, totalInterest } = calculateEmi({
    principal: 50_000,
    annualRatePercent: 15,
    months: 60,
  });
  assert.equal(round(emi), 1189.5);
  assert.equal(formatAed(emi), '1,189 AED');
  assert.equal(formatAed(totalPayment), '71,370 AED');
  assert.equal(formatAed(totalInterest), '21,370 AED');
});

test('totals are derived from the unrounded instalment', () => {
  const { emi, totalPayment, totalInterest } = calculateEmi({
    principal: 50_000,
    annualRatePercent: 15,
    months: 60,
  });
  assert.equal(round(totalPayment), round(emi * 60));
  assert.equal(round(totalInterest), round(totalPayment - 50_000));
  assert.equal(Math.round(totalPayment), 71_370);
  assert.equal(Math.round(totalInterest), 21_370);
});

test('a zero rate splits the principal evenly', () => {
  const { emi, totalInterest } = calculateEmi({
    principal: 120_000,
    annualRatePercent: 0,
    months: 12,
  });
  assert.equal(emi, 10_000);
  assert.equal(round(totalInterest), 0);
});

test('interest is always positive for a positive rate', () => {
  for (const rate of [1, 5, 12.5, 30]) {
    for (const months of [6, 60, 360]) {
      const { totalInterest, emi } = calculateEmi({
        principal: 250_000,
        annualRatePercent: rate,
        months,
      });
      assert.ok(totalInterest > 0, `interest should be positive at ${rate}% / ${months}m`);
      assert.ok(emi > 0);
    }
  }
});

test('a longer tenure lowers the instalment but raises total interest', () => {
  const short = calculateEmi({ principal: 500_000, annualRatePercent: 8, months: 120 });
  const long = calculateEmi({ principal: 500_000, annualRatePercent: 8, months: 240 });
  assert.ok(long.emi < short.emi);
  assert.ok(long.totalInterest > short.totalInterest);
});

test('a higher rate raises the instalment', () => {
  const low = calculateEmi({ principal: 500_000, annualRatePercent: 4, months: 240 });
  const high = calculateEmi({ principal: 500_000, annualRatePercent: 9, months: 240 });
  assert.ok(high.emi > low.emi);
});

test('the instalment scales linearly with the principal', () => {
  const a = calculateEmi({ principal: 100_000, annualRatePercent: 6, months: 60 });
  const b = calculateEmi({ principal: 200_000, annualRatePercent: 6, months: 60 });
  assert.equal(round(b.emi), round(a.emi * 2));
});

test('handles the extremes of the control ranges', () => {
  const min = calculateEmi({
    principal: EMI_LIMITS.amount.min,
    annualRatePercent: EMI_LIMITS.rate.min,
    months: EMI_LIMITS.months.min,
  });
  const max = calculateEmi({
    principal: EMI_LIMITS.amount.max,
    annualRatePercent: EMI_LIMITS.rate.max,
    months: EMI_LIMITS.months.max,
  });
  for (const r of [min, max]) {
    assert.ok(Number.isFinite(r.emi) && r.emi > 0);
    assert.ok(Number.isFinite(r.totalPayment) && r.totalPayment > 0);
  }
});

test('never returns NaN for junk input', () => {
  const r = calculateEmi({ principal: NaN, annualRatePercent: NaN, months: NaN });
  assert.ok(!Number.isNaN(formatAed(r.emi).length));
  assert.equal(formatAed(NaN), '0 AED');
});

test('formats thousands consistently', () => {
  assert.equal(formatAed(21_361), '21,361 AED');
  assert.equal(formatAed(71_361), '71,361 AED');
  assert.equal(formatAed(999), '999 AED');
});

test('converts tenure units', () => {
  assert.equal(toMonths(5, 'years'), 60);
  assert.equal(toMonths(30, 'years'), 360);
  assert.equal(toMonths(18, 'months'), 18);
});

test('clamps to range', () => {
  assert.equal(clamp(1, 5, 10), 5);
  assert.equal(clamp(50, 5, 10), 10);
  assert.equal(clamp(7, 5, 10), 7);
  assert.equal(clamp(NaN, 5, 10), 5);
});
