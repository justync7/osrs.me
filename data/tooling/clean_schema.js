"use strict";

const _ = require("lodash");
const ProgressBar = require('progress');
const fs = require("fs-promise");
const itemSchema = require("./lib/item_schema.js");

const ITEMS_JSON_LOCATION = "../raw/items.json";

async function loadItems() {
  return await itemSchema.loadItems(ITEMS_JSON_LOCATION);
}

async function saveItems(itemsRaw) {
  return await itemSchema.saveItems(itemsRaw, ITEMS_JSON_LOCATION);
}

async function main() {
  const itemsRaw = await loadItems();
  const items = itemsRaw.item;
  let i = 0;
  Object.keys(items).forEach(itemId => {
    let item = items[itemId];
    if(!item.name || item.name.toLowerCase() === "null" || item.name === "\u0001" || typeof item.id === "undefined") {
      delete items[itemId];
      i++;
    } else {
      Object.keys(item).forEach(itemKey => {
        if(item[itemKey] == null) {
          delete item[itemKey];
          i++;
        }
      });
    }
  });
  console.log(`Cleaned ${i} dirty items`);
  await saveItems(itemsRaw);
}

(async () => {
  if (require.main === module) {
    await main();
  }
})();

module.exports = main;