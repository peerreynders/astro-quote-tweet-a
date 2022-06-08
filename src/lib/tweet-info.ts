import tweets from '../data/tweet-info.data.json';
import type {
  Actions,
  Datetime,
  Hashtag,
  Link,
  Media,
  TweetInfo,
  User,
  Users,
} from '../lib/tweet-types';

function replaceAll(
  content: string,
  subString: string,
  newSubString: string
): string {
  let result = '';
  for (let from = 0; ; ) {
    const next = content.indexOf(subString, from);
    result += content.slice(from, next > -1 ? next : content.length);
    if (next < 0) break;

    result += newSubString;
    from = next + subString.length;
  }
  return result;
}

function removeMedia(content: string, { tinyHref }: Media): string {
  return replaceAll(content, tinyHref, '');
}

function removeAllMedia(media: Media[], content: string): string {
  return media.reduce(removeMedia, content);
}

function replaceLink(source: string, { tinyHref, content }: Link): string {
  return replaceAll(
    source,
    tinyHref,
    `<a rel="noreferrer noopener" target="_blank" href="${tinyHref}">${content}</a>`
  );
}

function replaceAllLinks(links: Link[], content: string): string {
  return links.reduce(replaceLink, content);
}

function replaceMention(content: string, { tag, href }: User): string {
  return replaceAll(
    content,
    tag,
    `<a rel="noreferrer noopener" target="_blank" href=${href}>${tag}</a>`
  );
}

function replaceAllMentions(
  users: Users,
  mentions: string[],
  content: string
): string {
  const replaceUserMention: (c: string, i: string) => string = (
    content,
    id
  ) => {
    const user = users[id];
    if (!user) return content;

    return replaceMention(content, user);
  };

  return mentions.reduce(replaceUserMention, content);
}

function replaceHashtag(content: string, { tag, href }: Hashtag): string {
  return replaceAll(
    content,
    tag,
    `<a rel="noreferrer noopener" target="_blank" href="${href}">${tag}</a>`
  );
}

function replaceAllHashtags(hashtags: Hashtag[], content: string): string {
  return hashtags.reduce(replaceHashtag, content);
}

function trimStartReplyTo(content: string, tag: string): string {
  const next = content.indexOf(tag);
  if (next !== 0) return content;

  return content.slice(tag.length);
}

function prepareContent({
  text,
  replyToUserId,
  links,
  mentions,
  hashtags,
  media,
  users,
}: TweetInfo): string {
  let content = text;
  if (typeof replyToUserId === 'string') {
    const user = users[replyToUserId];
    content = trimStartReplyTo(content, user.tag);
  }

  if (links && links.length) content = replaceAllLinks(links, content);
  if (mentions && mentions.length)
    content = replaceAllMentions(users, mentions, content);
  if (hashtags && hashtags.length)
    content = replaceAllHashtags(hashtags, content);
  if (media && media.length) content = removeAllMedia(media, content);

  return content.trim();
}

const formatter = (function () {
  const options: Intl.DateTimeFormatOptions = {
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'UTC',
    timeZoneName: 'short',
  };

  return new Intl.DateTimeFormat('en-US', options);
})();

function makeDatetime(datetime: string): Datetime {
  const content = formatter.format(new Date(datetime));
  return {
    datetime,
    content,
  };
}

function makeActions(id: string): Actions {
  const likeHref = `https://twitter.com/intent/like?tweet_id=${id}`;
  const retweetHref = `https://twitter.com/intent/retweet?tweet_id=${id}`;
  const replyHref = `https://twitter.com/intent/tweet?in_reply_to=${id}`;

  return {
    likeHref,
    retweetHref,
    replyHref,
  };
}

function tweetInfo(id: string): TweetInfo | undefined {
  return (tweets as Record<string, TweetInfo>)[id];
}

export { tweetInfo, prepareContent, makeActions, makeDatetime };
