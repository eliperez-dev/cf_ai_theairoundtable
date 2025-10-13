/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Ai } from '@cloudflare/ai';

export interface Env {
  // If you set another name in the Wrangler config file as the value for 'binding',
  // replace "AI" with the variable name you defined.
  AI: Ai;
}

export default {
  async fetch(request, env): Promise<Response> {
    const response = await env.AI.run(
      // @ts-ignore
      "@cf/meta/llama-3.1-8b-instruct-fast",
      {
        prompt: "\
        Generate a simple podcast script with 2 hosts,\
        Alex (Knowlegeble and calm) and Jamie (inquisitive, upbeat), on the topic of 'The future of AI'.\
        Generate 5 lines from each host, starting with Alex introducing the topic, the hosts are allowes to ask questions, but replace all question marks with periods \
        then bouncing back and forth from alex and jamie.Do not greet me, only output as I tell you. Output exacly like this, with a line break between each line, and a colon after each speaker. Example:\
        [Alex]:Wonderful Day We're having!\n\n[Jamie]:It sure is!",
        max_tokens: 3000,
      }
    );

    console.log("Recived response from AI\n");


    // @ts-ignore
    let lines: string[] = response.response.split("\n\n");
    let alexLines = [];
    let jamieLines = [];
    for(let i=0; i < lines.length; i++){
      if (lines[i].startsWith("[Alex]:")){
        alexLines.push(lines[i].split(":")[1]);
      } else {
        jamieLines.push(lines[i].split(":")[1]);
      }
    }

    for (let i=0;i<alexLines.length;i++) {
      console.log(alexLines[i]);
    }
    for (let i=0;i<jamieLines.length;i++) {
      console.log(jamieLines[i]);
    }

    let alexAudios = [];
    for (let i=0;i<alexLines.length;i++) {
      // @ts-ignore
      const resp = await env.AI.run("@cf/deepgram/aura-1", {
        "text": alexLines[i],
        "speaker": "arcas" // This guy sounds good
      });
      alexAudios.push(resp);
    }

    let jamieAudios = [];
    for (let i=0;i<jamieLines.length;i++) {
      // @ts-ignore
      const resp = await env.AI.run("@cf/deepgram/aura-1", {
        "text": jamieLines[i],
        "speaker": "asteria" // Luna voice is also good
      });
      jamieAudios.push(resp);
    }

    // @ts-ignore
    return new Response(jamieAudios[0]);
  },
} satisfies ExportedHandler<Env>;