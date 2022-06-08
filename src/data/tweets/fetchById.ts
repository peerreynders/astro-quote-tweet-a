import { dirname, join } from 'node:path';
import { writeFile } from 'node:fs/promises';

import type { RawData } from './types';

/*
  BEGIN node native fetch workaround
  REMOVE when fetch is added to @types/node
  From https://github.com/microsoft/TypeScript/blob/main/src/lib/dom.generated.d.ts
*/

type RequestInfo = string;

type HeadersInit = string[][] | Record<string, string>;
type ReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';
type RequestMode = 'cors' | 'navigate' | 'no-cors' | 'same-origin';
type RequestCredentials = 'include' | 'omit' | 'same-origin';
interface RequestInit {
  headers?: HeadersInit;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  body: null;
  method?: string;
  mode?: RequestMode;
  credentials?: RequestCredentials;
}

interface Body {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json(): Promise<any>;
}
interface Response extends Body {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
}

type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

declare const fetch: Fetch;

/* END node native fetch workaround */

// Update these as needed
const HEADERS: HeadersInit = {
  accept: '*/*',
  'accept-language': 'en-GB,en;q=0.9',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="102"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Linux"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'cross-site',
};

const INIT: RequestInit = {
  headers: HEADERS,
  referrer: 'https://platform.twitter.com/',
  referrerPolicy: 'strict-origin-when-cross-origin',
  body: null,
  method: 'GET',
  mode: 'cors',
  credentials: 'omit',
};

const toResource: (id: string) => string = (id) =>
  `https://cdn.syndication.twimg.com/tweet?id=${id}&lang=en`;

function exitWithError(error: unknown): never {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : undefined;
  if (message) console.error(message);
  console.log('Usage example: $ node fetchById.mjs 463440424141459456');
  process.exit(1);
}

function makeDatePart() {
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const date = now.getUTCDate().toString().padStart(2, '0');

  return year + month + date;
}

function writeData(targetPath: string, data: RawData) {
  const filename = join(
    targetPath,
    data.id_str + '.' + makeDatePart() + '.json'
  );

  return writeFile(filename, JSON.stringify(data));
}

// --- start script ---

if (!Object.prototype.hasOwnProperty.call(global, 'fetch'))
  exitWithError('Needs a node version that supports fetch (i.e. $ nvm use 18)');

if (process.argv.length < 3) exitWithError('Missing tweet id argument');

const id = process.argv[2];
if (!/^\d+$/.test(id)) exitWithError('Tweet ID has to be numeric');

const targetPath = dirname(process.argv[1]);

(async function (id) {
  try {
    const response = await fetch(toResource(id), INIT);
    if (!response.ok) {
      throw new Error(
        `HTTP error status (${response.status}): ${response.statusText}`
      );
    }
    const data: RawData = await response.json();
    await writeData(targetPath, data);
  } catch (e) {
    exitWithError(e);
  }
})(id);
