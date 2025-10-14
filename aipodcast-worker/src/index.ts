
import { Ai } from '@cloudflare/ai';

export interface Env {
  // If you set another name in the Wrangler config file as the value for 'binding',
  // replace "AI" with the variable name you defined.
  AI: Ai;
}



export default {
    async fetch(request, env): Promise<Response> {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });
        }

        try {
            const url = new URL(request.url);
            
            // Handle headlines endpoint - proxy to News API
            if (url.pathname === '/headlines') {
                const newsApiUrl = 'https://api.thenewsapi.com/v1/news/headlines?locale=us&language=en&api_token=gFRazLJ01XoJ5JDwBvrh56aSI1sGiRz2qh6qFZng';
                const newsResponse = await fetch(newsApiUrl);
                const newsData = await newsResponse.json();
                
                return new Response(JSON.stringify(newsData), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    }
                });
            }
            
            // Get topic from request
            let topic = "Cloudflare as a company"; // Default topic
            let returnTranscript = url.searchParams.get('transcript') === 'true';
            let providedScript: string | undefined;
            
            if (request.method === 'POST') {
                const body = await request.json() as { topic?: string; transcript?: boolean; script?: string };
                if (body.topic && body.topic.trim()) {
                    topic = body.topic.trim();
                }
                if (body.transcript !== undefined) {
                    returnTranscript = body.transcript;
                }
                if (body.script) {
                    providedScript = body.script;
                }
            }

            console.log(`Generating podcast for topic: ${topic}`);

            let lines: string[];

            // If a script is provided, use it directly instead of generating a new one
            if (providedScript) {
                console.log("Using provided script");
                lines = providedScript.split("\n");
                lines = lines.filter(line => {
                    const trimmed = line.trim();
                    return trimmed.length > 0 && (trimmed.startsWith("[Alex]:") || trimmed.startsWith("[Jamie]:"));
                });
            } else {
                // Generate script using AI
                const response = await env.AI.run(
                    // @ts-ignore
                    "@cf/openai/gpt-oss-120b",
                    {
                        input: getPrompt(topic, 12),
                    }
                );

                // @ts-ignore
                console.log("Received response from AI");

                console.log("\n\n---------------\n")
                
                // @ts-ignore
                let responseText = response.output[1].content[0].text; 

                // @ts-ignore
                lines = responseText.split("\n");
                
                lines = lines.filter(line => {
                    const trimmed = line.trim();
                    return trimmed.length > 0 && (trimmed.startsWith("[Alex]:") || trimmed.startsWith("[Jamie]:"));
                });
            }
            
            console.log(`Parsed ${lines.length} lines from script`);
            
            // If transcript is requested, return it as JSON
            if (returnTranscript) {
                return new Response(JSON.stringify({ 
                    transcript: lines.join('\n')
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    }
                });
            }
            
            let podcastSegmentsInOrder: ReadableStream<any>[] = [];

            // Generate TTS for each line
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const text = line.trim().split(/\]:\s*/)[1]?.trim(); 

                if (!text) continue; 
                
                console.log(`Generating audio for line ${i + 1}/${lines.length}`);
                let audioStream: ReadableStream;

                if (line.startsWith("[Alex]:")) {
                    // @ts-ignore
                    audioStream = await env.AI.run("@cf/deepgram/aura-1", {
                        "text": text,
                        "speaker": "arcas" 
                    });
                    podcastSegmentsInOrder.push(audioStream);
                } else if (line.startsWith("[Jamie]:")) {
                    // @ts-ignore
                    audioStream = await env.AI.run("@cf/deepgram/aura-1", {
                        "text": text,
                        "speaker": "orion" // helios is alright
                    });
                    podcastSegmentsInOrder.push(audioStream);
                }
            }
            
            console.log(`Combining ${podcastSegmentsInOrder.length} audio segments`);
            
            return new Response(await combineReadableStreams(podcastSegmentsInOrder), {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Access-Control-Allow-Origin': '*',
                }
            });
        } catch (error) {
            console.error('Error generating podcast:', error);
            return new Response(JSON.stringify({ 
                error: 'Failed to generate podcast',
                message: error instanceof Error ? error.message : 'Unknown error'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }
    },
} satisfies ExportedHandler<Env>;

async function combineReadableStreams(streams: ReadableStream[]): Promise<ReadableStream> {
  if (streams.length === 0) {
    throw new Error("No streams to combine");
  }
  
  if (streams.length === 1) {
    return streams[0];
  }
  
  // Create a new ReadableStream that will output all streams in sequence
  return new ReadableStream({
    async start(controller) {
      for (const stream of streams) {
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
        }
      }
      controller.close();
    }
  });
}

function getPrompt(context: string, linesPerHost: number): string {


 return `
    Generate a simple podcast script with 2 hosts:
    - Alex (knowledgeable and calm, presenting the topic)
    - Jamie (inquisitive, upbeat, intrigued, also knowledgeable of the topic, adding value to the discussion)

    User submitted context / topic: "${context}

    REQUIREMENTS:
    1. Generate exactly ${linesPerHost} lines from each host (${linesPerHost*2}} lines total)
    2. Start with Alex introducing the topic
    3. Expand all accronyms. Example: U.S to United States. Make sure the hosts are speaking to each other and refer to each other.
    4. Alex's first line MUST include:
        - A greeting
        - Introduction of both hosts by name
        - Introduction to "The Roundtable"
        - A short summary of the topic before diving into the subject / context the user submitted, and mention what is was the user submitted. Refer to the user as "the user".
        - Alex's initial line must be at least 5 sentences long
    5. Jamie's and Alex's final line should close out the podcast with a closing statement that includes their names and thanks the listener.
    6. Alternate between Alex and Jamie (bouncing back and forth)
    7. Make sure to keep the conversation light and fun, with the ocacional use of humor and joke. However, make sure not to go overboard with jokes, and refrain from using them if the topic is serious / heavy.

    FORMAT:
    - A line is simply what the speaker says during their turn. It can be arbitruarily long or short, but the turns should flow naturally like in real conversation. Each line can be multple sentences or even a single word.
    - Each line must start with the speaker's name in brackets followed by a colon
    - Each line must be separated by one newline (\n)
    - Example format:
    [Alex]:Wonderful Day We're having!\n[Jamie]:It sure is![Alex]:I'm excited to dive into this topic today.\n[Jamie]:Me too! Let's begin.\n[Alex]:Great!
    DO NOT include any additional text, greetings, or explanations.
    `
}