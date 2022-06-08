// src/data/tweets/fetchById.ts
import { dirname, join } from "node:path";
import { writeFile } from "node:fs/promises";
var HEADERS = {
  accept: "*/*",
  "accept-language": "en-GB,en;q=0.9",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="102"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site"
};
var INIT = {
  headers: HEADERS,
  referrer: "https://platform.twitter.com/",
  referrerPolicy: "strict-origin-when-cross-origin",
  body: null,
  method: "GET",
  mode: "cors",
  credentials: "omit"
};
var toResource = (id2) => `https://cdn.syndication.twimg.com/tweet?id=${id2}&lang=en`;
function exitWithError(error) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : void 0;
  if (message)
    console.error(message);
  console.log("Usage example: $ node fetchById.mjs 463440424141459456");
  process.exit(1);
}
function makeDatePart() {
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const date = now.getUTCDate().toString().padStart(2, "0");
  return year + month + date;
}
function writeData(targetPath2, data) {
  const filename = join(targetPath2, data.id_str + "." + makeDatePart() + ".json");
  return writeFile(filename, JSON.stringify(data));
}
if (!Object.prototype.hasOwnProperty.call(global, "fetch"))
  exitWithError("Needs a node version that supports fetch (i.e. $ nvm use 18)");
if (process.argv.length < 3)
  exitWithError("Missing tweet id argument");
var id = process.argv[2];
if (!/^\d+$/.test(id))
  exitWithError("Tweet ID has to be numeric");
var targetPath = dirname(process.argv[1]);
(async function(id2) {
  try {
    const response = await fetch(toResource(id2), INIT);
    if (!response.ok) {
      throw new Error(`HTTP error status (${response.status}): ${response.statusText}`);
    }
    const data = await response.json();
    await writeData(targetPath, data);
  } catch (e) {
    exitWithError(e);
  }
})(id);
