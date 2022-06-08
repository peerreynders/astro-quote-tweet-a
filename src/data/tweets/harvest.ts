import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';

import type { Dirent } from 'node:fs';
import type {
  Hashtag,
  Link,
  Media,
  TweetInfo,
  User,
  Users,
} from '../../lib/tweet-types';

import type { RawData, RawHashtag, RawLink, RawMedia, RawUser } from './types';

type TweetFileEntry = [id: string, capturedDate: string, path: string];

type DataEntry = [id: string, capturedDate: string, data: RawData];

function makeTweetFileEntry(name: string): TweetFileEntry | undefined {
  // name: ID.YYYYMMDD.json
  const ext = extname(name);
  if (ext.toLowerCase() !== '.json') return undefined;

  const base = basename(name, ext);
  const matches = /^(\d+)\.(\d{4})(\d{2})(\d{2})$/.exec(base);
  if (matches === null) return undefined;

  const id = matches[1];
  const year = Number(matches[2]);
  const monthIndex = Number(matches[3]) - 1;
  const date = Number(matches[4]);
  const captured = new Date(Date.UTC(year, monthIndex, date));
  if (
    captured.getUTCFullYear() !== year ||
    captured.getUTCMonth() !== monthIndex ||
    captured.getUTCDate() !== date
  )
    return undefined;

  return [id, captured.toISOString(), name];
}

function keepTweetFiles(
  entries: TweetFileEntry[],
  dirent: Dirent
): TweetFileEntry[] {
  if (!dirent.isFile()) return entries;

  const entry = makeTweetFileEntry(dirent.name);
  if (typeof entry === 'undefined') return entries;

  entries.push(entry);
  return entries;
}

async function readdirTweets(dataPath: string): Promise<TweetFileEntry[]> {
  const dirents = await readdir(dataPath, { withFileTypes: true });
  return dirents.reduce(keepTweetFiles, []);
}

async function readTweetData(
  dataPath: string,
  [key, captured, name]: TweetFileEntry
): Promise<DataEntry> {
  try {
    const fullpath = join(dataPath, name);
    const json = await readFile(fullpath, { encoding: 'utf8' });
    return [key, captured, JSON.parse(json)];
  } catch (e) {
    console.error(name);
    throw e;
  }
}

async function writeInfo(
  targetPath: string,
  info: Record<string, TweetInfo>
): Promise<void> {
  return writeFile(
    join(targetPath, 'tweet-info.data.json'),
    JSON.stringify(info)
  );
}

function byDateDesc(
  [idA, dateA]: TweetFileEntry,
  [idB, dateB]: TweetFileEntry
): number {
  if (idA.length < idB.length) return 1;
  if (idA.length > idB.length) return -1;
  if (idA < idB) return 1;
  if (idA > idB) return -1;
  if (dateA < dateB) return 1;
  if (dateA > dateB) return -1;
  return 0;
}

function mostRecentEntries(entries: TweetFileEntry[]): TweetFileEntry[] {
  let lastId = '0';
  const keepOnlyRecentEntry: (t: TweetFileEntry) => boolean = ([id, ,]) => {
    if (id === lastId) return false;

    lastId = id;
    return true;
  };
  entries.sort(byDateDesc);
  return entries.filter(keepOnlyRecentEntry);
}

function makeTweetHref(user: User, id: string): string {
  return `https://twitter.com/${user ? user.username : 'twitter'}/status/${id}`;
}

function makeMedia(href: string, tinyHref: string, alt: string): Media {
  return {
    href,
    tinyHref,
    alt,
  };
}

function keepMedia(
  photoHrefMap: Record<string, string>,
  media: Media[],
  rawMedia: RawMedia
): Media[] {
  const href = photoHrefMap[rawMedia.expanded_url];
  if (!href) return media;

  media.push(makeMedia(href, rawMedia.url, 'unknown tweet media content'));

  return media;
}

function extractMedia(
  photoHrefMap: Record<string, string>,
  rawMedia?: RawMedia[]
): Media[] {
  if (!Array.isArray(rawMedia)) return [];

  return rawMedia.reduce<Media[]>(
    (media, rawEntry) => keepMedia(photoHrefMap, media, rawEntry),
    []
  );
}

function makeLink(tinyHref: string, content: string): Link {
  return {
    tinyHref,
    content,
  };
}

function pushLink(links: Link[], entry: RawLink): Link[] {
  links.push(makeLink(entry.url, entry.display_url));
  return links;
}

function extractLinks(tweetUrls?: RawLink[]): Link[] {
  if (!Array.isArray(tweetUrls)) return [];

  return tweetUrls.reduce<Link[]>(pushLink, []);
}

function makeUser(
  id: string,
  username: string,
  name: string,
  imageHref?: string
): User {
  const user: User = {
    id,
    username,
    name,
    tag: `@${username}`,
    href: `https://twitter.com/${username}`,
  };

  if (imageHref) user.imageHref = imageHref;
  return user;
}

function extractMentions(users: Users, userMentions?: RawUser[]): string[] {
  const mentions: string[] = [];
  if (!Array.isArray(userMentions)) return mentions;

  for (const m of userMentions) {
    const id = m.id_str;
    if (!(id in users)) {
      users[id] = makeUser(id, m.screen_name, m.name);
    }
    mentions.push(id);
  }

  return mentions;
}

function makeHashtag(name: string): Hashtag {
  return {
    name,
    tag: `#${name}`,
    href: `https://twitter.com/hashtag/${name}`,
  };
}

function pushHashtag(hashtags: Hashtag[], entry: RawHashtag): Hashtag[] {
  const hashtag = makeHashtag(entry.text);
  hashtags.push(hashtag);
  return hashtags;
}

function extractHashtags(tweetHashtags?: RawHashtag[]): Hashtag[] {
  if (!Array.isArray(tweetHashtags)) return [];

  return tweetHashtags.reduce<Hashtag[]>(pushHashtag, []);
}

function extractInfo([id, captured, data]: DataEntry): [string, TweetInfo] {
  const users: Users = {};

  const text = data.text;
  const userId = data.user.id_str;
  const user = makeUser(
    userId,
    data.user.screen_name,
    data.user.name,
    data.user.profile_image_url_https
  );
  users[userId] = user;
  const href = makeTweetHref(user, data.id_str);
  const created = data.created_at;
  const mentions = extractMentions(users, data.entities?.user_mentions);
  const links = extractLinks(data.entities?.urls);
  const hashtags = extractHashtags(data.entities?.hashtags);

  const tweetInfo: TweetInfo = {
    id,
    href,
    created,
    captured,
    text,
    userId,
    users,
  };

  if (mentions.length > 0) tweetInfo.mentions = mentions;
  if (links.length > 0) tweetInfo.links = links;
  if (hashtags.length > 0) tweetInfo.hashtags = hashtags;

  if (data.photos && data.photos.length > 0) {
    const photoHrefMap = data.photos.reduce<Record<string, string>>(
      (acc, { expandedUrl, url }) => {
        acc[expandedUrl] = url;
        return acc;
      },
      {}
    );

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
  const dataEntries = await Promise.all(
    recentEntries.map((entry) => readTweetData(dataPath, entry))
  );
  const infoEntries = dataEntries.map(extractInfo);

  const infoData = Object.fromEntries(infoEntries);
  const targetPath = join(dataPath, '..');
  await writeInfo(targetPath, infoData);
} catch (err) {
  console.error(err);
}
