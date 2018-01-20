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
  const cacheExport = require("../raw/cache_export.json");
  Object.keys(cacheExport).forEach(cacheItemKey => {
    let cacheItem = cacheExport[cacheItemKey];
    if(!items[cacheItemKey] && cacheItem.name && cacheItem.name.toLowerCase() !== "null") {
      items[cacheItemKey] = {};
    }
    
    if(items[cacheItemKey] && !items[cacheItemKey].name) {
      items[cacheItemKey].name = cacheItem.name;
    }
    
    if (items[cacheItemKey]) {
      let item = items[cacheItemKey];
      item.has_noted = cacheItem.notedID > 0;
      if(item.has_noted) {
        item.noted = cacheItem.notedID;
      }
      item.members = cacheItem.members;
    }
  });
  await saveItems(itemsRaw);
}

(async () => {
  if (require.main === module) {
    await main();
  }
})();

module.exports = main;