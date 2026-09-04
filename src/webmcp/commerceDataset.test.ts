import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type Row = Record<string, string>;

function readCsv(name: string): Row[] {
  const [header, ...lines] = readFileSync(
    resolve(process.cwd(), "public/datasets/northstar-commerce", name),
    "utf8",
  )
    .trim()
    .split(/\r?\n/);
  const columns = header.split(",");
  return lines.map((line) =>
    Object.fromEntries(
      line.split(",").map((value, index) => [columns[index], value]),
    ),
  );
}

describe("Northstar Commerce synthetic dataset", () => {
  const customers = readCsv("customers.csv");
  const orders = readCsv("orders.csv");
  const lineItems = readCsv("order-items.csv");
  const products = readCsv("products.csv");
  const dailySales = readCsv("daily-sales.csv");

  it("contains the documented deterministic commerce world", () => {
    expect(customers).toHaveLength(1_800);
    expect(orders).toHaveLength(19_840);
    expect(lineItems).toHaveLength(41_626);
    expect(products).toHaveLength(160);
    expect(dailySales).toHaveLength(730);
    expect(
      customers.reduce((sum, customer) => sum + Number(customer.churned), 0) /
        customers.length,
    ).toBeCloseTo(0.283, 3);
  });

  it("provides a complete chronological daily demand series", () => {
    expect(dailySales[0].date).toBe("2024-07-01");
    expect(dailySales.at(-1)?.date).toBe("2026-06-30");
    expect(
      dailySales.every(
        (row) =>
          Number(row.units_sold) > 0 &&
          Number.isFinite(Number(row.avg_price)) &&
          ["0", "1"].includes(row.promotion),
      ),
    ).toBe(true);
  });

  it("keeps primary keys unique and every relationship valid", () => {
    const customerIds = new Set(
      customers.map((customer) => customer.customer_id),
    );
    const orderIds = new Set(orders.map((order) => order.order_id));
    const skus = new Set(products.map((product) => product.sku));

    expect(customerIds.size).toBe(customers.length);
    expect(orderIds.size).toBe(orders.length);
    expect(skus.size).toBe(products.length);
    expect(orders.every((order) => customerIds.has(order.customer_id))).toBe(
      true,
    );
    expect(
      lineItems.every(
        (item) =>
          orderIds.has(item.order_id) &&
          customerIds.has(item.customer_id) &&
          skus.has(item.sku),
      ),
    ).toBe(true);
    expect(
      products.every((product) =>
        product.copurchase_skus
          .split("|")
          .filter(Boolean)
          .every((sku) => skus.has(sku)),
      ),
    ).toBe(true);
  });
});
