# astro-quote-tweet-a

Originally inspired by [astro-static-tweet](https://github.com/rebelchris/astro-static-tweet). Until I got to this part:

> Now all that's left is for you to get some **Twitter credentials**, since this plugin uses the Twitter API to fetch the Tweet.

So I explored caching tweets in some way for the use inside an [Astro](https://docs.astro.build/en/getting-started/) site.

## Objective
* Explore Astro further using TypeScript and external SCSS while creating some POC tooling for caching tweets for use with the site.

## Notes
* [Twitter Publish](https://publish.twitter.com/) generates HTML/script for including a tweet in a simple HTML page. The script actually rebuilds that area of the DOM from the ground up after accessing a syndication endpoint for fresh data. This can be slow and jarring.
* `$ npm run fetchById TweetID` uses that syndication endpoint to grab the data and store it under `src/data/tweets/TweetID.YYYYMMDD.json` (`YYYYMMDD` being the capture date; [`fetchById.ts`](./src/data/tweets/fetchById.ts)).
  * **Caveat**: This is potentially fragile as Twitter controls both the the endpoint and the script which uses it. So the endpoint and it's data format can change without any advance notice. This risk is mitigated by the fact that old tweets are cached until the situation can be remedied in some way.
* `$ npm run harvest` then aggregates all the tweet data into `src/data/tweet-info.json` normalizing it to the [`TweetInfo`](./src/lib/tweet-types.ts) format ([`harvest.ts`](./src/data/tweets/harvest.ts)).
* [`tweetInfo(id: string): TweetInfo | undefined`](./src/lib/tweet-info.ts) can then be used to access the data for an individual tweet.
* [`QuoteTweet.astro`](./src/components/QuoteTweet.astro) is purely presentational to render a tweet quote from the supplied props.
  * The component's SCSS can be found [here](src/styles/components/_quote-tweet.scss). Once it's clear what stylng is [structure and skin](https://github.com/stubbornella/oocss/wiki#user-content-separate-structure-and-skin) it makes sense to move the structure styling back into the Astro component while keeping the skin styling external.
  * Keeping the SCSS entirely external was a simple matter of only including the top SCSS file in the [layout](src/layouts/BaseLayout.astro).
  * The organizaton of the SCSS files is largely informed by [ITCSS](https://www.creativebloq.com/web-design/manage-large-css-projects-itcss-101517528) ([video](https://youtu.be/1OKZOV-iLj4?t=409); [slides](https://speakerdeck.com/dafed/managing-css-projects-with-itcss)).
* [`QuoteTweetFallback.astro`](./src/components/QuoteTweetFallback.astro) is a minimal fallback component which only renders a link to the tweet of the passed `id`.
* [`InfoTweet.astro`](./src/components/InfoTweet.astro) grabs the tweet data from `tweetInfo(id)` and renders either `QuoteTweet` or `QuoteTweetFallback`.
* `$ npm run lint:types` type checks the components supporting functionality as [Vite](https://vitejs.dev/) ([esbuild](https://esbuild.github.io/)) won't.
* `$ npm run lint:es` lints the TypeScript code.
* `$ npm run scripts:types` type checks the data handling scripts `fetchById.ts` and `harvest.ts`.
* `$ npm run scripts:build` builds the `.mjs` data handling scripts from the TypeScript sources.
  * [`esb-script.mjs`](./esb-script.mjs) uses `esbuild` (already present on account of Vite) to transpile the data handling scripts (it's much faster that `tsc`). Tools like [`esbuild-runner`](https://github.com/folke/esbuild-runner) and [`typescript-run`](https://github.com/saurabhdaware/typescript-run) are available but adding another dependency seemed unnecessary.


---

Clone the repo:
  ```
$ cd astro-quote-tweet-a
$ npm i
$ npm run dev
```
