// src/data/tweets/harvest.ts
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
function makeTweetFileEntry(name) {
  const ext = extname(name);
  if (ext.toLowerCase() !== ".json")
    return void 0;
  const base = basename(name, ext);
  const matches = /^(\d+)\.(\d{4})(\d{2})(\d{2})$/.exec(base);
  if (matches === null)
    return void 0;
  const id = matches[1];
  const year = Number(matches[2]);
  const monthIndex = Number(matches[3]) - 1;
  const date = Number(matches[4]);
  const captured = new Date(Date.UTC(year, monthIndex, date));
  if (captured.getUTCFullYear() !== year || captured.getUTCMonth() !== monthIndex || captured.getUTCDate() !== date)
    return void 0;
  return [id, captured.toISOString(), name];
}
function keepTweetFiles(entries, dirent) {
  if (!dirent.isFile())
    return entries;
  const entry = makeTweetFileEntry(dirent.name);
  if (typeof entry === "undefined")
    return entries;
  entries.push(entry);
  return entries;
}
async function readdirTweets(dataPath) {
  const dirents = await readdir(dataPath, { withFileTypes: true });
  return dirents.reduce(keepTweetFiles, []);
}
async function readTweetData(dataPath, [key, captured, name]) {
  try {
    const fullpath = join(dataPath, name);
    const json = await readFile(fullpath, { encoding: "utf8" });
    return [key, captured, JSON.parse(json)];
  } catch (e) {
    console.error(name);
    throw e;
  }
}
async function writeInfo(targetPath, info) {
  return writeFile(join(targetPath, "tweet-info.data.json"), JSON.stringify(info));
}
function byDateDesc([idA, dateA], [idB, dateB]) {
  if (idA.length < idB.length)
    return 1;
  if (idA.length > idB.length)
    return -1;
  if (idA < idB)
    return 1;
  if (idA > idB)
    return -1;
  if (dateA < dateB)
    return 1;
  if (dateA > dateB)
    return -1;
  return 0;
}
function mostRecentEntries(entries) {
  let lastId = "0";
  const keepOnlyRecentEntry = ([id, ,]) => {
    if (id === lastId)
      return false;
    lastId = id;
    return true;
  };
  entries.sort(byDateDesc);
  return entries.filter(keepOnlyRecentEntry);
}
function makeTweetHref(user, id) {
  return `https://twitter.com/${user ? user.username : "twitter"}/status/${id}`;
}
function makeMedia(href, tinyHref, alt) {
  return {
    href,
    tinyHref,
    alt
  };
}
function keepMedia(photoHrefMap, media, rawMedia) {
  const href = photoHrefMap[rawMedia.expanded_url];
  if (!href)
    return media;
  media.push(makeMedia(href, rawMedia.url, "unknown tweet media content"));
  return media;
}
function extractMedia(photoHrefMap, rawMedia) {
  if (!Array.isArray(rawMedia))
    return [];
  return rawMedia.reduce((media, rawEntry) => keepMedia(photoHrefMap, media, rawEntry), []);
}
function makeLink(tinyHref, content) {
  return {
    tinyHref,
    content
  };
}
function pushLink(links, entry) {
  links.push(makeLink(entry.url, entry.display_url));
  return links;
}
function extractLinks(tweetUrls) {
  if (!Array.isArray(tweetUrls))
    return [];
  return tweetUrls.reduce(pushLink, []);
}
function makeUser(id, username, name, imageHref) {
  const user = {
    id,
    username,
    name,
    tag: `@${username}`,
    href: `https://twitter.com/${username}`
  };
  if (imageHref)
    user.imageHref = imageHref;
  return user;
}
function extractMentions(users, userMentions) {
  const mentions = [];
  if (!Array.isArray(userMentions))
    return mentions;
  for (const m of userMentions) {
    const id = m.id_str;
    if (!(id in users)) {
      users[id] = makeUser(id, m.screen_name, m.name);
    }
    mentions.push(id);
  }
  return mentions;
}
function makeHashtag(name) {
  return {
    name,
    tag: `#${name}`,
    href: `https://twitter.com/hashtag/${name}`
  };
}
function pushHashtag(hashtags, entry) {
  const hashtag = makeHashtag(entry.text);
  hashtags.push(hashtag);
  return hashtags;
}
function extractHashtags(tweetHashtags) {
  if (!Array.isArray(tweetHashtags))
    return [];
  return tweetHashtags.reduce(pushHashtag, []);
}
function extractInfo([id, captured, data]) {
  const users = {};
  const text = data.text;
  const userId = data.user.id_str;
  const user = makeUser(userId, data.user.screen_name, data.user.name, data.user.profile_image_url_https);
  users[userId] = user;
  const href = makeTweetHref(user, data.id_str);
  const created = data.created_at;
  const mentions = extractMentions(users, data.entities?.user_mentions);
  const links = extractLinks(data.entities?.urls);
  const hashtags = extractHashtags(data.entities?.hashtags);
  const tweetInfo = {
    id,
    href,
    created,
    captured,
    text,
    userId,
    users
  };
  if (mentions.length > 0)
    tweetInfo.mentions = mentions;
  if (links.length > 0)
    tweetInfo.links = links;
  if (hashtags.length > 0)
    tweetInfo.hashtags = hashtags;
  if (data.photos && data.photos.length > 0) {
    const photoHrefMap = data.photos.reduce((acc, { expandedUrl, url }) => {
      acc[expandedUrl] = url;
      return acc;
    }, {});
    tweetInfo.media = extractMedia(photoHrefMap, data.entities?.media);
  }
  if (data.in_reply_to_user_id_str)
    tweetInfo.replyToUserId = data.in_reply_to_user_id_str;
  return [id, tweetInfo];
}
try {
  const dataPath = dirname(process.argv[1]);
  const pathEntries = await readdirTweets(dataPath);
  const recentEntries = mostRecentEntries(pathEntries);
  const dataEntries = await Promise.all(recentEntries.map((entry) => readTweetData(dataPath, entry)));
  const infoEntries = dataEntries.map(extractInfo);
  const infoData = Object.fromEntries(infoEntries);
  const targetPath = join(dataPath, "..");
  await writeInfo(targetPath, infoData);
} catch (err) {
  console.error(err);
}
