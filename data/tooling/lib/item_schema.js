"use strict";

const _ = require("lodash");
const fs = require("fs-promise");

async function loadItems(path) {
  const itemData = await fs.readFile(path);
  return JSON.parse(itemData);
}

async function saveItems(itemsRaw, path) {
  return await fs.writeFile(path, JSON.stringify(itemsRaw, null, 2));
}

module.exports = {loadItems, saveItems};