export type User = {
  id: string;
  username: string;
  name: string;
  tag: string;
  href: string;
  imageHref?: string;
};

export type Users = Record<string, User>;

export type Link = {
  tinyHref: string;
  content: string;
};

export type Media = {
  href: string;
  tinyHref: string;
  alt: string;
};

export type Hashtag = {
  name: string;
  tag: string;
  href: string;
};

export type TweetInfo = {
  id: string;
  href: string;
  created: string;
  captured: string;
  text: string;
  userId: string;
  users: Users;
  mentions?: string[];
  links?: Link[];
  hashtags?: Hashtag[];
  media?: Media[];
  replyToUserId?: string;
};

export type Actions = {
  likeHref: string;
  retweetHref: string;
  replyHref: string;
};

export type Datetime = {
  datetime: string;
  content: string;
};
