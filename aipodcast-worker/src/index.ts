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
        prompt: `
          Generate a simple podcast script with 2 hosts:
          - Alex (knowledgeable and calm)
          - Jamie (inquisitive, upbeat)

          Topic: 'The incredible engineering of the human brain'

          REQUIREMENTS:
          1. Generate exactly 5 lines from each host (10 lines total)
          2. Start with Alex introducing the topic
          3. Hosts can ask questions, but REPLACE ALL QUESTION MARKS WITH PERIODS
          4. Alex's first line MUST include:
            - A greeting
            - Introduction of both hosts by name
            - Introduction to "The Breakdown AI Podcast"
            - A short summary of the topic before diving into the subject
            - This initial line must be at least 4 sentences long
          5. Jamie's final line MUST close out the podcast with a closing statement that includes their names and thanks the listener
          6. Alternate between Alex and Jamie (bouncing back and forth)

          FORMAT:
          - Each line must start with the speaker's name in brackets followed by a colon
          - Each line must be separated by TWO newlines
          - Example format:
          [Alex]:Wonderful Day We're having!

          [Jamie]:It sure is!

          DO NOT include any additional text, greetings, or explanations.
          OUTPUT EXACTLY 10 LINES TOTAL (5 from Alex, 5 from Jamie) in the specified format.
          `,
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
    return new Response(alexAudios[0]);
  },
} satisfies ExportedHandler<Env>;