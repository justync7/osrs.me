"use strict";
if (process.argv.length <= 2) {
  console.log("Usage: " + __filename + " <id>");
  process.exit(-1);
}

const fs = require("fs");
const WikiTextParser = require("parse-wikitext");
const WIKI_URL = "oldschoolrunescape.wikia.com";
const wikiTextParser = new WikiTextParser(WIKI_URL);
const INFOBOX_REGEX = /{{Infobox (Item|Bonuses)\s*(\|(.*)\s*)*}}/g
const ITEMS_JSON_LOCATION = "../raw/items.json";

let itemsRaw;
let items;

function cleanName(name) {
  return name.replace(" ", "_");
}

function scrapeItem(id, cb) {
  let item = items[id];
  let name = cleanName(item.name);
  
  wikiTextParser.getArticle(name,function(err,data){
    if (err) {
      console.log(err);
      return;
    }
    
    let matches = data.match(INFOBOX_REGEX);
    matches.forEach(function(match) {
      let infobox = wikiTextParser.parseTemplate(match);
      let template = infobox.template.trim();
      for (let key in infobox.namedParts) {
        key = key.trim();
        let value = infobox.namedParts[key].trim();
        if (template === "Infobox Item") {
          switch(key) {
            case "tradeable":
              item["tradeable"] = value === "Yes";
              break;
            case "equipable":
              item["equipable"] = value === "Yes";
              break;
            case "stackable":
              item["stackable"] = value === "Yes";
              break;
            case "quest":
              item["quest_item"] = value === "Yes";
              break;
            case "members":
              item["members"] = value === "Yes";
              break;   
            case "examine":
              item["description"] = value;
              break;
            case "weight":
              item["weight"] = parseFloat(value);
              break;
            case "high":
              item["high_alch"] = parseInt(value);
              break;
            case "low":
              item["low_alch"] = parseInt(value);
              break;
            case "store":
              item["store_value"] = parseInt(value);
              break;              
            default:
              //console.log(key + ": " + value);
              break;
          }
        } else if (template === "Infobox Bonuses") {
          switch(key) {
            case "astab":
              item["stats"]["attack"]["stab"] = parseInt(value);
              break;
            case "aslash":
              item["stats"]["attack"]["slash"] = parseInt(value);
              break;
            case "acrush":
              item["stats"]["attack"]["crush"] = parseInt(value);
              break;
            case "amagic":
              item["stats"]["attack"]["magic"] = parseInt(value);
              break;
            case "arange":
              item["stats"]["attack"]["range"] = parseInt(value);
              break;
            case "dstab":
              item["stats"]["defence"]["stab"] = parseInt(value);
              break;
            case "dslash":
              item["stats"]["defence"]["slash"] = parseInt(value);
              break;
            case "dcrush":
              item["stats"]["defence"]["crush"] = parseInt(value);
              break;
            case "dmagic":
              item["stats"]["defence"]["magic"] = parseInt(value);
              break;
            case "drange":
              item["stats"]["defence"]["range"] = parseInt(value);
              break;  
            case "aspeed":
              item["attack_speed"] = parseInt(value);
              break;
            case "str":
              item["stats"]["bonus"]["strength"] = value;
              break;
            case "rstr":
              item["stats"]["bonus"]["range_strength"] = value;
              break;
            case "mdmg":
              item["stats"]["bonus"]["magic_strength"] = value;
              break;
            case "prayer":
              item["stats"]["bonus"]["prayer"] = value;
              break;
            case "slot":
              item["slot"] = value.toLowerCase();
              break;
            default:
              //console.log(key + ": " + value);
              break;
          }
        }
      }
    });
    
    return cb();
  });
}

function loadItems(cb) {
  try {
    itemsRaw = require(ITEMS_JSON_LOCATION);
    items = itemsRaw["item"];
    return cb();
  } catch (err) {
    return cb(err);
  }
}

function saveItems(cb) {
  fs.writeFile(ITEMS_JSON_LOCATION, JSON.stringify(itemsRaw, null, 2), function(err) {
    if(err) {
      cb(err);
      return;
    }
    
    return cb();
  });
}

function main(id) {
  loadItems(function(err) {
    if (typeof items[id] != "undefined") {
      console.log("Scraping item: " + items[id].name);
      scrapeItem(process.argv[2], function() {
        saveItems(function(err) {
          if(err) {
            console.log(err);
            return;
          }
          
          console.log("Successfully saved to file");
        });
      });
    } else {
      console.log("Item not found.");
    }
  });
}

if (process.argv.length > 2) {
  let id = process.argv[2];
  
  main(id);
}

module.exports = main;