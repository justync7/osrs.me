"use strict";

const _ = require("lodash");
const ProgressBar = require("progress");
const fs = require("fs-promise");
const cloudscraper = require("cloudscraper");
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
  
  cloudscraper.get('https://rsbuddy.com/exchange/names.json', async function(error, response, body) {
    if (error) {
      console.log('Error occurred');
    } else {
      let fetched = Object.keys(JSON.parse(body)).filter(id => !items.hasOwnProperty(id.toString()));
      
      console.log(`Fetched ${fetched.length} items that aren't already in the schema`);
      
      for (let idn in fetched) {
        if(fetched[idn].name) {
          let id = idn.toString();
          items[id] = {};
          let item = items[id];
          item.store = fetched[idn].store;
          item.name = fetched[idn].name;
          item.wiki_mapped = false;
          item.is_in_exchange = true;
        }
      }
      
      await saveItems(itemsRaw);
    }
  });
}

(async () => {
  if (require.main === module) {
    await main();
  }
})();

module.exports = main;