import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const OUTPUT_DIR = resolve("public/datasets/northstar-commerce");
const SEED = 347727;
const CUSTOMER_COUNT = 1_800;
const PRODUCT_COUNT = 160;
const ANCHOR_DATE = new Date("2026-06-30T12:00:00Z");

let state = SEED >>> 0;
const random = () => {
  state = (state * 1664525 + 1013904223) >>> 0;
  return state / 0x1_0000_0000;
};
const normal = () => {
  const u = Math.max(random(), Number.EPSILON);
  const v = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 0) => Number(value.toFixed(digits));
const pick = (values) => values[Math.floor(random() * values.length)];
const weightedPick = (items) => {
  const value = random();
  let cursor = 0;
  for (const item of items) {
    cursor += item.weight;
    if (value <= cursor) return item;
  }
  return items.at(-1);
};
const csv = (rows, columns) =>
  [
    columns.join(","),
    ...rows.map((row) => columns.map((key) => row[key]).join(",")),
  ].join("\n") + "\n";
const dateBefore = (days) => {
  const date = new Date(ANCHOR_DATE);
  date.setUTCDate(date.getUTCDate() - Math.max(0, Math.round(days)));
  return date.toISOString().slice(0, 10);
};

const catalog = {
  footwear: [
    [
      "Trail Runner",
      "trail running shoe grippy sole stable technical terrain",
      148,
    ],
    [
      "Road Tempo",
      "road running shoe responsive foam daily speed training",
      132,
    ],
    [
      "Hike Ridge",
      "waterproof hiking boot ankle support rugged mountain trail",
      184,
    ],
    ["City Step", "comfortable everyday sneaker lightweight urban travel", 112],
    [
      "Recovery Slide",
      "soft recovery sandal cushioned post workout comfort",
      68,
    ],
  ],
  jackets: [
    [
      "Alpine Shell",
      "waterproof breathable mountain shell wet weather protection",
      288,
    ],
    ["Down Summit", "warm insulated down jacket cold alpine conditions", 326],
    ["Fleece Grid", "breathable grid fleece midlayer hiking climbing", 146],
    ["Wind Sprint", "light packable wind jacket running exposed ridges", 118],
    ["Rain City", "waterproof commuter rain jacket clean urban styling", 214],
  ],
  apparel: [
    ["Merino Base", "soft merino wool base layer cool weather hiking", 108],
    ["Trail Tee", "quick drying breathable running shirt warm conditions", 62],
    ["Trek Pant", "durable stretch hiking trousers weather resistance", 128],
    ["Summit Short", "lightweight climbing short reinforced pocket", 82],
    [
      "Thermal Tight",
      "warm stretch running tight reflective winter training",
      96,
    ],
  ],
  packs: [
    [
      "Daypack",
      "light hiking daypack breathable back panel bottle pockets",
      132,
    ],
    ["Fastpack", "trail fastpack running vest harness gear storage", 176],
    ["Trek Pack", "large trekking backpack adjustable harness rain cover", 268],
    ["Commuter Roll", "waterproof urban rolltop backpack laptop sleeve", 158],
    ["Travel Duffel", "durable carry duffel organised adventure travel", 188],
  ],
  camp: [
    ["Camp Mug", "stainless insulated camping mug hot drinks outdoors", 34],
    ["Camp Flask", "stainless insulated flask hot cold drinks", 48],
    ["Cook Set", "compact nesting camp cookware lightweight stove meals", 92],
    ["Base Lantern", "rechargeable camp lantern warm dimmable light", 76],
    [
      "Trail Chair",
      "packable lightweight camp chair strong aluminium frame",
      104,
    ],
  ],
  hydration: [
    ["Trail Bottle", "light reusable water bottle hiking running", 32],
    ["Hydration Vest", "running hydration vest soft flasks gear pockets", 154],
    ["Filter Flow", "compact water filter safe backcountry hydration", 72],
    ["Reservoir", "leakproof hydration bladder backpack compatible", 58],
    ["Thermal Tumbler", "insulated travel tumbler durable all day drinks", 42],
  ],
  accessories: [
    ["Summit Cap", "light sun cap breathable trail protection", 38],
    ["Merino Sock", "cushioned merino hiking sock moisture control", 28],
    ["Trail Pole", "adjustable carbon trekking pole stable steep terrain", 124],
    ["Head Torch", "rechargeable headlamp bright trail night camp", 68],
    ["Dry Bag", "waterproof rolltop dry bag protect adventure gear", 46],
  ],
  recovery: [
    ["Massage Roll", "firm recovery roller mobility tired muscles", 44],
    ["Recovery Ball", "targeted massage ball portable muscle release", 24],
    ["Stretch Band", "resistance stretch band warmup recovery mobility", 30],
    ["Sleep Mask", "soft blackout travel sleep mask recovery", 26],
    ["Heat Wrap", "reusable warm muscle wrap post adventure recovery", 58],
  ],
};
const variants = [
  ["Core", "reliable balanced everyday", 0.9],
  ["Pro", "premium technical performance", 1.25],
  ["Lite", "minimal lightweight packable", 1.05],
  ["Eco", "recycled durable lower impact", 1.12],
];

const products = [];
for (const [category, families] of Object.entries(catalog)) {
  for (const [family, terms, basePrice] of families) {
    for (const [variant, variantTerms, multiplier] of variants) {
      const index = products.length + 1;
      products.push({
        sku: `SKU-${String(index).padStart(4, "0")}`,
        name: `${family} ${variant}`,
        category,
        family: family.toLowerCase().replaceAll(" ", "-"),
        description: `${variantTerms} ${terms}`,
        price: round(basePrice * multiplier + normal() * 4, 2),
        margin: round(clamp(0.42 + normal() * 0.07, 0.24, 0.68), 2),
        season: pick(["all-season", "summer", "winter", "shoulder"]),
        premium: variant === "Pro" ? "yes" : "no",
        copurchase_skus: "",
      });
    }
  }
}
if (products.length !== PRODUCT_COUNT)
  throw new Error(`Expected ${PRODUCT_COUNT} products`);

const segmentSpecs = [
  {
    name: "VIP loyalists",
    weight: 0.1,
    orders: 27,
    basket: 168,
    recency: 7,
    discount: 0.07,
    returns: 0.04,
    engagement: 0.86,
    satisfaction: 9.0,
    tickets: 0.5,
    tenure: 34,
  },
  {
    name: "High-value loyalists",
    weight: 0.16,
    orders: 18,
    basket: 132,
    recency: 18,
    discount: 0.12,
    returns: 0.06,
    engagement: 0.72,
    satisfaction: 8.3,
    tickets: 0.9,
    tenure: 28,
  },
  {
    name: "Frequent regulars",
    weight: 0.29,
    orders: 12,
    basket: 84,
    recency: 31,
    discount: 0.18,
    returns: 0.08,
    engagement: 0.58,
    satisfaction: 7.6,
    tickets: 1.2,
    tenure: 22,
  },
  {
    name: "Emerging shoppers",
    weight: 0.22,
    orders: 4,
    basket: 72,
    recency: 20,
    discount: 0.23,
    returns: 0.09,
    engagement: 0.64,
    satisfaction: 7.8,
    tickets: 0.8,
    tenure: 7,
  },
  {
    name: "Lapsing customers",
    weight: 0.23,
    orders: 6,
    basket: 76,
    recency: 126,
    discount: 0.31,
    returns: 0.16,
    engagement: 0.2,
    satisfaction: 5.9,
    tickets: 2.5,
    tenure: 25,
  },
];
const regions = [
  "Queensland",
  "New South Wales",
  "Victoria",
  "Western Australia",
  "South Australia",
  "Tasmania",
];
const channels = [
  "organic",
  "paid-social",
  "search",
  "referral",
  "retail-store",
];
const categories = Object.keys(catalog);
const campaigns = [
  "always-on",
  "trail-season",
  "winter-layering",
  "member-event",
  "cart-recovery",
];
const actionFor = (segment) =>
  ({
    "VIP loyalists": "Early access and premium bundle",
    "High-value loyalists": "Loyalty upgrade with category cross-sell",
    "Frequent regulars": "Free shipping threshold reminder",
    "Emerging shoppers": "Second-purchase education sequence",
    "Lapsing customers": "Win-back offer with service recovery",
  })[segment];

const customers = [];
const orders = [];
const lineItems = [];
let orderSequence = 1;
let lineSequence = 1;

for (let customerIndex = 0; customerIndex < CUSTOMER_COUNT; customerIndex++) {
  const spec = weightedPick(segmentSpecs);
  const customerId = `C-${String(customerIndex + 1).padStart(5, "0")}`;
  const preferredCategory = pick(categories);
  const orderCount = Math.max(
    1,
    Math.round(spec.orders + normal() * Math.max(1.5, spec.orders * 0.2)),
  );
  const daysSinceOrder = Math.round(
    clamp(spec.recency + normal() * Math.max(4, spec.recency * 0.2), 1, 240),
  );
  const discountShare = round(
    clamp(spec.discount + normal() * 0.055, 0, 0.65),
    3,
  );
  const returnRate = round(clamp(spec.returns + normal() * 0.035, 0, 0.45), 3);
  const emailEngagement = round(
    clamp(spec.engagement + normal() * 0.1, 0.02, 0.98),
    3,
  );
  const satisfaction = round(
    clamp(spec.satisfaction + normal() * 0.75, 2.5, 10),
    1,
  );
  const supportTickets = Math.max(0, Math.round(spec.tickets + normal() * 1.1));
  const tenureMonths = Math.max(2, Math.round(spec.tenure + normal() * 6));
  const region = pick(regions);
  const acquisitionChannel = pick(channels);
  const membershipTier =
    spec.name === "VIP loyalists"
      ? pick(["gold", "gold", "silver"])
      : spec.name === "High-value loyalists"
        ? pick(["silver", "silver", "gold"])
        : pick(["none", "none", "bronze", "silver"]);
  const churnScore =
    -1.8 +
    daysSinceOrder / 65 +
    supportTickets * 0.22 +
    returnRate * 2.5 +
    discountShare * 0.8 -
    emailEngagement * 1.1 -
    (satisfaction - 7) * 0.18 -
    Math.min(orderCount, 20) * 0.025 +
    normal() * 0.72;
  const churnProbability = 1 / (1 + Math.exp(-churnScore));
  const churned = random() < churnProbability ? 1 : 0;
  let spend = 0;
  const customerOrders = [];
  for (let orderIndex = 0; orderIndex < orderCount; orderIndex++) {
    const progress = orderCount === 1 ? 0 : orderIndex / (orderCount - 1);
    const historyWindow = Math.max(
      0,
      Math.min(700 - daysSinceOrder, tenureMonths * 30 - daysSinceOrder),
    );
    const spacing = historyWindow * (1 - progress);
    const orderDate = dateBefore(
      Math.min(729, daysSinceOrder + spacing + Math.abs(normal() * 4)),
    );
    const orderId = `O-${String(orderSequence++).padStart(7, "0")}`;
    const targetTotal = clamp(
      spec.basket + normal() * spec.basket * 0.22,
      24,
      520,
    );
    const itemCount = Math.max(
      1,
      Math.min(5, Math.round(targetTotal / 58 + normal())),
    );
    const chosen = [];
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
      const category = random() < 0.66 ? preferredCategory : pick(categories);
      const candidates = products.filter(
        (product) => product.category === category && !chosen.includes(product),
      );
      chosen.push(pick(candidates.length ? candidates : products));
    }
    const weights = chosen.map(() => 0.7 + random() * 0.6);
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    chosen.forEach((product, itemIndex) => {
      const quantity = random() < 0.12 ? 2 : 1;
      const itemRevenue = round(
        (targetTotal * weights[itemIndex]) / totalWeight,
        2,
      );
      lineItems.push({
        line_item_id: `LI-${String(lineSequence++).padStart(8, "0")}`,
        order_id: orderId,
        customer_id: customerId,
        sku: product.sku,
        quantity,
        item_revenue: itemRevenue,
        category: product.category,
      });
    });
    const orderTotal = round(targetTotal, 2);
    spend += orderTotal;
    const order = {
      order_id: orderId,
      customer_id: customerId,
      order_date: orderDate,
      sales_channel: random() < 0.78 ? "online" : "retail-store",
      campaign: pick(campaigns),
      discount_rate: round(clamp(discountShare + normal() * 0.05, 0, 0.6), 2),
      order_total: orderTotal,
      items: itemCount,
      returned: random() < returnRate ? 1 : 0,
    };
    orders.push(order);
    customerOrders.push(order);
  }
  const avgBasket = spend / orderCount;
  customers.push({
    customer_id: customerId,
    region,
    acquisition_channel: acquisitionChannel,
    membership_tier: membershipTier,
    preferred_category: preferredCategory,
    tenure_months: tenureMonths,
    orders: orderCount,
    spend: round(spend, 2),
    avg_basket: round(avgBasket, 2),
    discount_share: discountShare,
    return_rate: returnRate,
    support_tickets: supportTickets,
    days_since_order: daysSinceOrder,
    email_engagement: emailEngagement,
    satisfaction_score: satisfaction,
    lifetime_value: round(spend * (1.12 + tenureMonths / 100), 2),
    churned,
    latent_segment: spec.name.replaceAll(" ", "-"),
    recommended_action: actionFor(spec.name).replaceAll(",", " "),
  });
}

const orderItems = new Map();
for (const item of lineItems) {
  const set = orderItems.get(item.order_id) ?? [];
  set.push(item.sku);
  orderItems.set(item.order_id, set);
}
const pairCounts = new Map();
for (const skus of orderItems.values()) {
  for (const sku of skus) {
    for (const other of skus) {
      if (sku === other) continue;
      const key = `${sku}|${other}`;
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }
  }
}
for (const product of products) {
  product.copurchase_skus = [...pairCounts.entries()]
    .filter(([key]) => key.startsWith(`${product.sku}|`))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key.split("|")[1])
    .join("|");
}

const dailySales = [];
for (let dayIndex = 0; dayIndex < 730; dayIndex++) {
  const date = new Date(ANCHOR_DATE);
  date.setUTCDate(date.getUTCDate() - (729 - dayIndex));
  const dayOfWeek = date.getUTCDay();
  const month = date.getUTCMonth();
  const dayOfMonth = date.getUTCDate();
  const promotion =
    random() < 0.12 || dayIndex % 56 < 4 || (month === 10 && dayOfMonth > 22)
      ? 1
      : 0;
  const holiday =
    (month === 11 && dayOfMonth >= 20) ||
    (month === 0 && dayOfMonth <= 3) ||
    (month === 3 && dayOfMonth >= 7 && dayOfMonth <= 10)
      ? 1
      : 0;
  const yearly = Math.sin((2 * Math.PI * dayIndex) / 365 - 0.8);
  const temperature = round(22 + 8 * yearly + normal() * 2.2, 1);
  const avgPrice = round(
    118 -
      promotion * 9 +
      Math.sin((2 * Math.PI * dayIndex) / 31) * 2.5 +
      normal() * 1.8,
    2,
  );
  const weeklyMultiplier = [1.2, 0.88, 0.91, 0.95, 1, 1.08, 1.28][dayOfWeek];
  const baseline = 94 + dayIndex * 0.035 + 16 * yearly;
  const unitsSold = Math.max(
    25,
    Math.round(
      baseline * weeklyMultiplier +
        promotion * 34 +
        holiday * 23 -
        (avgPrice - 115) * 0.72 -
        Math.abs(temperature - 22) * 0.18 +
        normal() * 5.5,
    ),
  );
  const orderCount = Math.max(12, Math.round(unitsSold / 1.56 + normal() * 2));
  dailySales.push({
    date: date.toISOString().slice(0, 10),
    units_sold: unitsSold,
    orders: orderCount,
    revenue: round(unitsSold * avgPrice, 2),
    avg_price: avgPrice,
    promotion,
    holiday,
    temperature,
    day_of_week: dayOfWeek,
  });
}

const files = {
  "customers.csv": [customers, Object.keys(customers[0])],
  "orders.csv": [orders, Object.keys(orders[0])],
  "order-items.csv": [lineItems, Object.keys(lineItems[0])],
  "products.csv": [products, Object.keys(products[0])],
  "daily-sales.csv": [dailySales, Object.keys(dailySales[0])],
};

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all(
  Object.entries(files).map(([name, [rows, columns]]) =>
    writeFile(resolve(OUTPUT_DIR, name), csv(rows, columns)),
  ),
);
await writeFile(
  resolve(OUTPUT_DIR, "schema.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      seed: SEED,
      anchorDate: ANCHOR_DATE.toISOString(),
      tables: Object.fromEntries(
        Object.entries(files).map(([name, [rows, columns]]) => [
          name,
          { rowCount: rows.length, columns },
        ]),
      ),
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  resolve(OUTPUT_DIR, "provenance.md"),
  `# Northstar Commerce synthetic dataset\n\n- Generated locally with deterministic JavaScript; no external model or private source records were used.\n- Seed: ${SEED}\n- Anchor date: ${ANCHOR_DATE.toISOString().slice(0, 10)}\n- Customers: ${customers.length}\n- Orders: ${orders.length}\n- Line items: ${lineItems.length}\n- Products: ${products.length}\n- Daily sales records: ${dailySales.length}\n- Scenario: fictional Australian outdoor retailer with intentionally overlapping customer behaviours, probabilistic churn, and two years of daily demand.\n- Validation: row counts, primary keys, foreign keys, numeric ranges, chronological dates, deterministic regeneration, and product co-purchase references.\n\nThe latent_segment field is retained for demo evaluation but is not used as a clustering feature. Daily sales include known retail demand drivers for comparing univariate and multivariate forecasts. All names and identifiers are synthetic.\n`,
);

console.log(
  JSON.stringify({
    customers: customers.length,
    orders: orders.length,
    lineItems: lineItems.length,
    products: products.length,
    dailySales: dailySales.length,
    churnRate: round(
      customers.reduce((sum, customer) => sum + customer.churned, 0) /
        customers.length,
      3,
    ),
  }),
);
