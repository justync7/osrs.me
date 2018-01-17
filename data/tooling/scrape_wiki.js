"use strict";

const _ = require("lodash");
const ProgressBar = require('progress');
const promisify = require("util").promisify;
const fs = require("fs-promise");
const WikiTextParser = require("parse-wikitext");
const WIKI_URL = "oldschoolrunescape.wikia.com";
const wikiTextParser = new WikiTextParser(WIKI_URL);
function getArticle(name) {
  return new Promise((resolve, reject) => {
    wikiTextParser.getArticle(name, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
const INFOBOX_REGEX = /{{Infobox (Item|Bonuses)\s*(\|(.*)\s*)*}}/g
const ITEMS_JSON_LOCATION = "../raw/items.json";

const getCleanedName = v => encodeURI(v.replace(/\s/g, "_"));
const transform = (i, t) => { return {index: i, transform: t}; };
const identity = v => v;
const isYes = v => v.toLowerCase() === "yes";
const percentage = v => parseInt(v) / 100;
const lowerString = v => v.toLowerCase();
const trim = v => v.trim();

const WIKI_TRANSFORMS = {
  tradeable: transform(["tradeable"], isYes),
  equipable: transform(["equipable"], isYes),
  stackable: transform(["stackable"], isYes),
  quest: transform(["quest_item"], isYes),
  members: transform(["members"], isYes),
  examine: transform(["description"], identity),
  weight: transform(["weight"], parseInt),
  high: transform(["high_alch"], parseInt),
  low: transform(["low_alch"], parseInt),
  store: transform(["store_value"], parseInt),
  astab: transform(["stats", "attack", "stab"], parseInt),
  aslash: transform(["stats", "attack", "slash"], parseInt),
  acrush: transform(["stats", "attack", "crush"], parseInt),
  amagic: transform(["stats", "attack", "magic"], parseInt),
  arange: transform(["stats", "defence", "range"], parseInt),
  dstab: transform(["stats", "defence", "stab"], parseInt),
  dslash: transform(["stats", "defence", "slash"], parseInt),
  dcrush: transform(["stats", "defence", "crush"], parseInt),
  dmagic: transform(["stats", "defence", "magic"], parseInt),
  drange: transform(["stats", "defence", "range"], parseInt),
  aspeed: transform(["attack_speed"], parseInt),
  str: transform(["stats", "bonus", "strength"], parseInt),
  rstr: transform(["stats", "bonus", "range_strength"], parseInt),
  mdmg: transform(["stats", "bonus", "magic_strength"], parseInt),
  prayer: transform(["stats", "bonus", "prayer"], parseInt),
  slot: transform(["slot"], lowerString)
};

async function scrapeItem(id, items) {
  const item = items[id];
  const name = getCleanedName(item.name);
  
  let data = await getArticle(name);
  
  const matches = data.match(INFOBOX_REGEX);
  if (matches) {
    matches.forEach(function(match) {
      const infobox = wikiTextParser.parseTemplate(match);
      const template = infobox.template.trim();
      
      for (let key in infobox.namedParts) {
        key = key.trim();
        let value = infobox.namedParts[key].toLowerCase().trim();
        
        if (key in WIKI_TRANSFORMS) {
          const t = WIKI_TRANSFORMS[key];
          _.set(item, t.index, t.transform(value));
        }
      }
    });
    
    item.wiki_mapped = true;
    return true;
  } else if (item.wiki_mapped) {
    item.wiki_mapped = false;
    return true;
  } else {
    return false;
  }
}

async function loadItems() {
  const itemData = await fs.readFile(ITEMS_JSON_LOCATION);
  return JSON.parse(itemData);
}

async function saveItems(itemsRaw) {
  return await fs.writeFile(ITEMS_JSON_LOCATION, JSON.stringify(itemsRaw, null, 2));
}

async function main(id) {
  const itemsRaw = await loadItems();
  const items = itemsRaw.item;
  
  if (typeof items[id] != "undefined") {
    console.log("Scraping item: " + items[id].name);
    await scrapeItem(id, items);
    await saveItems(itemsRaw);
    console.log("Successfully saved to file");
  } else {
    console.log("Item not found.");
  }
}

(async () => {
  if (process.argv.length > 2) {
    let id = process.argv[2];
    if (id === "all") {
      const itemsRaw = await loadItems();
      const items = itemsRaw.item;
      const bar = new ProgressBar(':bar :current/:total', { total: Object.keys(items).length });
      for (let item_id in items) {
        try {
          if(await scrapeItem(item_id, items)) {
            await saveItems(itemsRaw);
          }
        } catch (e) {
          console.log(e);
        }
        bar.tick();
      }
      await saveItems(itemsRaw);
    } else {
      main(id);
    }
  } else if (require.main === module) {
    console.log(`Usage: ${__filename} <id>`);
    process.exit(-1);
  }
})();

module.exports = main;