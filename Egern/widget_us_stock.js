/*
 * US Stock Real-Time Price Widget
 * 获取美股三大指数实时价格，根据 widgetFamily 生成不同 UI
 */

var STOCKS = "GSPC,DJI,IXIC";
var API_URL = "https://query1.finance.yahoo.com/v8/finance/chart/" + STOCKS + "?interval=1d&range=1d";

var STOCK_MAP = {
  GSPC: { symbol: "S&P 500", icon: "chart.line.uptrend.xyaxis.circle.fill", color: "#FF6B6B" },
  DJI:  { symbol: "Dow Jones", icon: "chart.line.uptrend.xyaxis.circle.fill", color: "#4ECDC4" },
  IXIC: { symbol: "NASDAQ", icon: "chart.line.uptrend.xyaxis.circle.fill", color: "#45B7D1" },
};

var ALL_IDS = Object.keys(STOCK_MAP);

function formatPrice(price) {
  if (price >= 1000) return price.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(3);
  return price.toFixed(4);
}

function formatChange(change) {
  if (change == null) return "+0.0%";
  var sign = change >= 0 ? "+" : "";
  return sign + change.toFixed(2) + "%";
}

function changeColor(change) {
  return change >= 0 ? "#34C759" : "#FF3B30";
}

function changeIcon(change) {
  return change >= 0 ? "arrow.up.right" : "arrow.down.right";
}

// --- DSL Builders ---

function txt(text, fontSize, weight, color, opts) {
  var el = {
    type: "text",
    text: text,
    font: { weight: weight || "regular", size: fontSize, family: "Menlo" },
  };
  if (color) el.textColor = color;
  if (opts) { for (var k in opts) el[k] = opts[k]; }
  return el;
}

function icon(systemName, size, tintColor, opts) {
  var el = {
    type: "image",
    src: "sf-symbol:" + systemName,
    width: size,
    height: size,
  };
  if (tintColor) el.color = tintColor;
  if (opts) { for (var k in opts) el[k] = opts[k]; }
  return el;
}

function hstack(children, opts) {
  var el = {
    type: "stack",
    direction: "row",
    alignItems: "center",
    children: children,
  };
  if (opts) { for (var k in opts) el[k] = opts[k]; }
  return el;
}

function vstack(children, opts) {
  var el = {
    type: "stack",
    direction: "column",
    alignItems: "start",
    children: children,
  };
  if (opts) { for (var k in opts) el[k] = opts[k]; }
  return el;
}

function spacer(length) {
  var el = { type: "spacer" };
  if (length != null) el.length = length;
  return el;
}

function dateTxt(dateStr, style, fontSize, weight, color) {
  return {
    type: "date",
    date: dateStr,
    format: style,
    font: { size: fontSize, weight: weight || "medium" },
    textColor: color,
  };
}

function stockIcon(info, size) {
  var pad = Math.round(size * 0.3);
  var total = size + pad * 2;
  return vstack([icon(info.icon, size, info.color)], {
    alignItems: "center",
    padding: [pad, pad, pad, pad],
    backgroundColor: info.color + "33",
    borderRadius: total / 2,
  });
}

function cardGradient(color) {
  return {
    type: "linear",
    colors: [color + "33", color + "11"],
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 1, y: 1 },
  };
}

// --- Shared UI Components ---

function separator() {
  return hstack([spacer()], { height: 1, backgroundColor: "rgba(255,255,255,0.08)" });
}

function headerBar(title, titleSize, iconSize, showTime) {
  var children = [
    icon("chart.line.uptrend.xyaxis.circle.fill", iconSize, "#FFD700"),
    txt(title, titleSize, "heavy", "#FFD700", {
      shadowColor: "rgba(255,215,0,0.4)",
      shadowRadius: 4,
      shadowOffset: { x: 0, y: 0 },
    }),
    spacer(),
  ];
  if (showTime) {
    children.push(dateTxt(new Date().toISOString(), "time", Math.max(9, titleSize - 4), "medium", "rgba(255,255,255,0.5)"));
  }
  return hstack(children, { gap: 4 });
}

function footerBar() {
  return hstack([
    icon("clock.arrow.circlepath", 8, "rgba(255,255,255,0.3)"),
    dateTxt(new Date().toISOString(), "relative", 9, "medium", "rgba(255,255,255,0.3)"),
    spacer(),
    txt("Yahoo Finance", 8, "medium", "rgba(255,255,255,0.2)"),
  ], { gap: 3 });
}

function sectionLabel(label) {
  return txt(label, 10, "semibold", "rgba(255,255,255,0.3)");
}

// --- Row / Card Builders ---

var CARD_PRESETS = {
  small:  { layout: "column", iconSize: 14, priceSize: 15, symbolSize: 12, changeSize: 11, changeIconSize: 8,  borderRadius: 10, padding: [8, 10, 8, 10],   borderWidth: 0.5, nameSize: 0,  innerGap: 3 },
  medium: { layout: "row",    iconSize: 20, priceSize: 18, symbolSize: 16, changeSize: 13, changeIconSize: 10, borderRadius: 14, padding: [10, 12, 10, 12], borderWidth: 1,   nameSize: 10, innerGap: 6 },
  large:  { layout: "row",    iconSize: 26, priceSize: 24, symbolSize: 18, changeSize: 15, changeIconSize: 12, borderRadius: 14, padding: [14, 16, 14, 16], borderWidth: 1,   nameSize: 11, innerGap: 8 },
};

function stockCard(id, data, variant) {
  var info = STOCK_MAP[id];
  var change = data.change;
  var p = CARD_PRESETS[variant];

  var changeRow = hstack([
    icon(changeIcon(change), p.changeIconSize, changeColor(change)),
    txt(formatChange(change), p.changeSize, "semibold", changeColor(change)),
  ], { gap: 2 });

  var cardOpts = {
    gap: p.innerGap,
    padding: p.padding,
    backgroundGradient: cardGradient(info.color),
    borderRadius: p.borderRadius,
    borderWidth: p.borderWidth,
    borderColor: info.color + (p.borderWidth >= 1 ? "55" : "44"),
  };

  if (p.layout === "column") {
    return vstack([
      hstack([stockIcon(info, p.iconSize), txt(info.symbol, p.symbolSize, "bold", "#FFFFFF")], { gap: 4 }),
      txt(formatPrice(data.price), p.priceSize, "semibold", "#FFFFFF", { minScale: 0.6, maxLines: 1 }),
      changeRow,
    ], cardOpts);
  }

  var nameItems = [txt(info.symbol, p.symbolSize, "heavy", "#FFFFFF")];
  if (p.nameSize) {
    nameItems.push(txt(info.name, p.nameSize, "medium", "rgba(255,255,255,0.5)"));
  }

  return vstack([
    hstack([
      stockIcon(info, p.iconSize),
      vstack(nameItems, { gap: 0 }),
      spacer(),
      vstack([
        txt(formatPrice(data.price), p.priceSize, "bold", "#FFFFFF"),
        changeRow,
      ], { alignItems: "end", gap: 1 }),
    ], { gap: p.innerGap }),
  ], cardOpts);
}

function stockRow(id, data, compact) {
  var info = STOCK_MAP[id];
  var change = data.change;
  var sz = compact ? 11 : 13;
  var iconSz = compact ? 11 : 14;

  return hstack([
    stockIcon(info, iconSz),
    txt(info.symbol, sz, "medium", "#FFFFFF", { maxLines: 1 }),
    spacer(),
    txt(formatPrice(data.price), sz, "semibold", "#FFFFFF", { maxLines: 1, minScale: 0.7 }),
    txt(formatChange(change), sz, "medium", changeColor(change)),
  ], { gap: compact ? 4 : 6 });
}

function rowGroup(items, gap) {
  return vstack(items, { gap: gap || 6 });
}

function filterAvailable(ids, data) {
  return ids.filter(function (id) { return data[id]; });
}

// --- System Widget Shell ---

function systemWidget(gradientColors, padding, children, extraOpts) {
  var opts = {
    type: "widget",
    gap: 0,
    padding: padding,
    backgroundGradient: {
      type: "linear",
      colors: gradientColors,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 },
    },
    children: children,
  };
  if (extraOpts) { for (var k in extraOpts) opts[k] = opts[k]; }
  return opts;
}

function systemBody(title, titleSize, iconSize, bodyChildren) {
  return [
    headerBar(title, titleSize, iconSize, true),
    spacer(6),
    separator(),
    spacer(),
  ].concat(bodyChildren).concat([
    spacer(),
    footerBar(),
  ]);
}

// --- Layout Builders ---

function buildAccessoryCircular(data) {
  var sp500 = data.GSPC;
  var change = sp500 ? sp500.change : 0;
  return {
    type: "widget",
    gap: 2,
    children: [
      spacer(),
      icon("chart.line.uptrend.xyaxis.circle.fill", 18, "#FF6B6B"),
      txt(sp500 ? formatPrice(sp500.price) : "--", 12, "bold", null, { minScale: 0.5 }),
      txt(sp500 ? formatChange(change) : "", 9, "medium", null, { minScale: 0.5 }),
      spacer(),
    ],
  };
}

function buildAccessoryRectangular(data) {
  var ids = filterAvailable(["GSPC", "DJI", "IXIC"], data);
  var rows = ids.map(function (id) {
    var stock = data[id];
    var info = STOCK_MAP[id];
    var change = stock.change;
    return hstack([
      icon(info.icon, 9),
      vstack([txt(info.symbol, 10, "bold")], { width: 30, height: 12 }),
      spacer(),
      txt(formatPrice(stock.price), 10, "semibold", null, { minScale: 0.5, maxLines: 1 }),
      vstack([txt(formatChange(change), 9, "medium")], { alignItems: "end", width: 42, height: 12 }),
    ], { gap: 3 });
  });
  return { type: "widget", gap: 2, children: rows };
}

function buildAccessoryInline(data) {
  var sp500 = data.GSPC;
  var dji = data.DJI;
  var nasdaq = data.IXIC;
  var text = "";
  if (sp500) text += "S&P 500 " + formatPrice(sp500.price) + " " + formatChange(sp500.change);
  else text += "S&P 500 --";
  if (dji) text += " | Dow Jones " + formatPrice(dji.price);
  if (nasdaq) text += " | NASDAQ " + formatPrice(nasdaq.price);
  return {
    type: "widget",
    children: [
      icon("chart.line.uptrend.xyaxis.circle.fill", 12, "#FF6B6B"),
      txt(text, 12, "medium", null, { minScale: 0.7, maxLines: 1 }),
    ],
  };
}

function buildSystemSmall(data) {
  var rows = filterAvailable(["GSPC", "DJI", "IXIC"], data)
    .map(function (id) { return stockRow(id, data[id], true); });

  return systemWidget(
    ["#1A1A2E", "#16213E", "#0F3460"],
    [12, 14, 10, 14],
    systemBody("US Stocks", 13, 14, [
      rowGroup(rows, 6),
    ])
  );
}

function buildSystemMedium(data) {
  var ids = filterAvailable(ALL_IDS, data);
  var left = ids.slice(0, 4).map(function (id) { return stockRow(id, data[id], true); });
  var right = ids.slice(4).map(function (id) { return stockRow(id, data[id], true); });

  return systemWidget(
    ["#0D0D1A", "#1A1A3E", "#2D1B69"],
    [12, 14, 10, 14],
    systemBody("US Stocks Tracker", 14, 18, [
      hstack([
        rowGroup(left, 5),
        vstack([], { width: 1, backgroundColor: "rgba(255,255,255,0.08)" }),
        rowGroup(right, 5),
      ], { alignItems: "start", gap: 10 }),
    ])
  );
}

function buildSystemLarge(data) {
  var featured = filterAvailable(["GSPC", "DJI"], data)
    .map(function (id) { return stockCard(id, data[id], "medium"); });

  var restIds = ALL_IDS.filter(function (id) { return id !== "GSPC" && id !== "DJI"; });
  var rows = filterAvailable(restIds, data)
    .map(function (id) { return stockRow(id, data[id], true); });

  return systemWidget(
    ["#0B0B1E", "#151538", "#1E0A3C"],
    [12, 14, 10, 14],
    systemBody("US Stocks Tracker", 16, 20, [
      rowGroup(featured, 8),
      spacer(),
      sectionLabel("MARKET"),
      spacer(4),
      rowGroup(rows, 6),
    ]),
    { backgroundGradient: {
      type: "linear",
      colors: ["#0B0B1E", "#151538", "#1E0A3C"],
      stops: [0, 0.5, 1],
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0.8, y: 1 },
    }}
  );
}

function buildSystemExtraLarge(data) {
  var featured = filterAvailable(["GSPC", "DJI", "IXIC"], data)
    .map(function (id) { return stockCard(id, data[id], "large"); });

  return systemWidget(
    ["#0B0B1E", "#0E1A3D", "#1E0A3C"],
    [14, 16, 12, 16],
    systemBody("US Stocks Tracker", 20, 24, [
      hstack(featured, { gap: 10 }),
    ])
  );
}

function errorWidget() {
  return {
    type: "widget",
    padding: 16,
    backgroundColor: "#1A1A2E",
    children: [
      icon("wifi.exclamationmark", 32, "#FF3B30"),
      txt("Failed to load prices", 14, "medium", "#FF3B30"),
    ],
  };
}

// --- Render ---

var BUILDERS = {
  accessoryCircular:    buildAccessoryCircular,
  accessoryRectangular: buildAccessoryRectangular,
  accessoryInline:      buildAccessoryInline,
  systemSmall:          buildSystemSmall,
  systemMedium:         buildSystemMedium,
  systemLarge:          buildSystemLarge,
  systemExtraLarge:     buildSystemExtraLarge,
};

function render(data, family) {
  var build = BUILDERS[family] || buildSystemMedium;
  var widget = build(data);
  widget.refreshAfter = new Date(Date.now() + 60 * 1000).toISOString();
  return widget;
}

// --- Main ---

export default async function(ctx) {
  var family = ctx.widgetFamily;
  console.log("widgetFamily: " + (family || "null"));

  try {
    var resp = await ctx.http.get(API_URL);
    var data = await resp.json();
    var result = {};
    
    // 验证数据结构
    if (!data || !data['chart'] || !data['chart']['result'] || !Array.isArray(data['chart']['result'])) {
      console.log("Invalid data structure");
      return errorWidget();
    }

    // Extract stock data from response
    for (var i = 0; i < data['chart']['result'].length; i++) {
      var item = data['chart']['result'][i];
      var symbol = item['meta']['symbol'];
      var meta = item['meta'];
      var regularMarketPrice = meta['regularMarketPrice'];
      var regularMarketDayHigh = meta['regularMarketDayHigh'];
      var regularMarketDayLow = meta['regularMarketDayLow'];
      var regularMarketTime = meta['regularMarketTime'];

      result[symbol] = {
        price: regularMarketPrice,
        change: regularMarketDayHigh - regularMarketDayLow
      };
    }

    return render(result, family);
  } catch (e) {
    console.log("API request failed: " + e.message);
    return errorWidget();
  }
}
