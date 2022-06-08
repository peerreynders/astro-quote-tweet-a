type RawMedia = {
  expanded_url: string; // full href
  url: string; // minified href
};

type RawLink = {
  url: string; // minified href
  display_url: string; // mangled href
};

type RawHashtag = {
  text: string; // name of the hashtag without the leading #
};

type RawUser = {
  id_str: string;
  screen_name: string; // twitter handle without leading @
  name: string; // displayed name
  profile_image_url_https?: string; // href to profile image
};

type RawEntities = {
  user_mentions?: RawUser[];
  urls?: RawLink[];
  hashtags?: RawHashtag[];
  media?: RawMedia[];
};

type RawPhotos = {
  expandedUrl: string; // NOTE: deviation from expected expanded_url
  url: string; // href used to access image for inside tweet
};

type RawData = {
  id_str: string; // tweet ID
  text: string; // full text of the tweet
  user: RawUser;
  created_at: string; // ISO date of tweet creation
  entities?: RawEntities;
  photos?: RawPhotos[];
  in_reply_to_user_id_str?: string; // user ID being replied to
};

export type {
  RawData,
  RawEntities,
  RawHashtag,
  RawLink,
  RawMedia,
  RawPhotos,
  RawUser,
};
