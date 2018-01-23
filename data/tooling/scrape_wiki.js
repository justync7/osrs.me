"use strict";

const _ = require("lodash");
const ProgressBar = require('progress');
const fs = require("fs-promise");
const WikiTextParser = require("parse-wikitext");
const WIKI_URL = "oldschoolrunescape.wikia.com";
const wikiTextParser = new WikiTextParser(WIKI_URL);
const itemSchema = require("./lib/item_schema.js");

async function loadItems() {
  return await itemSchema.loadItems(ITEMS_JSON_LOCATION);
}

async function saveItems(itemsRaw) {
  return await itemSchema.saveItems(itemsRaw, ITEMS_JSON_LOCATION);
}

const wikiCache = {};
function getArticle(name) {
  return new Promise((resolve, reject) => {
    if (!wikiCache[name]) {
      wikiTextParser.getArticle(name, (err, data) => {
        wikiCache[name] = {err, data};
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } else {
      const cached = wikiCache[name];
      if (cached.err) {
        reject(cached.err);
      } else {
        resolve(cached.data);
      }
    }
  });
}
const INFOBOX_REGEX = /{{Infobox (Item|Bonuses)\s*(\|(.*)\s*)*}}/g
const ITEMS_JSON_LOCATION = "../raw/items.json";

const getCleanedName = v => encodeURI(v.replace(/\s/g, "_"));
const transform = (i, t) => { return {index: i, transform: t}; };
const identity = v => v;
const isYes = v => v.toLowerCase() === "yes";
const parseNumber = v => parseInt(v) || -1;
const percentage = v => (parseInt(v) || 0) / 100;
const lowerString = v => v.toLowerCase();
const trim = v => v.trim();

const WIKI_TRANSFORMS = {
  tradeable: transform(["tradeable"], isYes),
  equipable: transform(["equipable"], isYes),
  stackable: transform(["stackable"], isYes),
  quest: transform(["quest_item"], isYes),
  members: transform(["members"], isYes),
  examine: transform(["description"], identity),
  weight: transform(["weight"], parseNumber),
  high: transform(["high_alch"], parseNumber),
  low: transform(["low_alch"], parseNumber),
  store: transform(["store_value"], parseNumber),
  astab: transform(["stats", "attack", "stab"], parseNumber),
  aslash: transform(["stats", "attack", "slash"], parseNumber),
  acrush: transform(["stats", "attack", "crush"], parseNumber),
  amagic: transform(["stats", "attack", "magic"], parseNumber),
  arange: transform(["stats", "defence", "range"], parseNumber),
  dstab: transform(["stats", "defence", "stab"], parseNumber),
  dslash: transform(["stats", "defence", "slash"], parseNumber),
  dcrush: transform(["stats", "defence", "crush"], parseNumber),
  dmagic: transform(["stats", "defence", "magic"], parseNumber),
  drange: transform(["stats", "defence", "range"], parseNumber),
  aspeed: transform(["attack_speed"], parseNumber),
  str: transform(["stats", "bonus", "strength"], parseNumber),
  rstr: transform(["stats", "bonus", "range_strength"], parseNumber),
  mdmg: transform(["stats", "bonus", "magic_strength"], percentage),
  prayer: transform(["stats", "bonus", "prayer"], parseNumber),
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
    console.log(`Usage: ${__filename} <id | all>`);
    process.exit(-1);
  }
})();

module.exports = main;