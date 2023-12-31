import { readFileSync } from 'node:fs';

import { createRestAPIClient } from 'masto';

import ATProto from '@atproto/api';
const { BskyAgent } = ATProto;

import { default as chunk } from 'chunk-text';

import dotenv from 'dotenv';

import { Command } from 'commander';

dotenv.config();

const cli = new Command();

cli
  .argument('<filename>', 'input file to process')
  .action(async (filename) => {
    
    const masto = createRestAPIClient({
      url: process.env.MASTODON_URL,
      accessToken: process.env.MASTODON_ACCESS_TOKEN,
    });
    
    const bsky = new BskyAgent({ service: "https://bsky.social" });
    await bsky.login({
      identifier: process.env.BLUESKY_IDENTIFIER,
      password: process.env.BLUESKY_APP_PASSWORD,
    });
    
    const txt = readFileSync(filename, { encoding: 'utf8' });
    const mastoPosts = chunk(txt, 500);
    
    console.info("Posting 🧵 to 🐘 Mastodon…")

    var mastoStatus = {}
    
    for (const postTxt of mastoPosts) {
      if (mastoStatus.id) {
        mastoStatus = await masto.v1.statuses.create({
          status: postTxt,
          inReplyToId: mastoStatus.id,
          visibility: "public",
        });
      } else {
        mastoStatus = await masto.v1.statuses.create({
          status: postTxt,
          visibility: "public",
        })
      }
    }
    
    console.info("Posting 🧵 to 🦋 Bluesky…")

    const bskyPosts = chunk(txt, 300);
    
    var bskyStatus = {}
    
    for (const postTxt of bskyPosts) {
      if (bskyStatus.uri) {
        bskyStatus = await bsky.post({
          text: postTxt,
          reply: {
            root: bskyStatus,
            parent: bskyStatus
          }
        });
      } else {
        bskyStatus = await bsky.post({
          text: postTxt
        });
      }
    }
    
  });

cli.parse(process.argv);