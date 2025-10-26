
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
            let style: 'brief' | 'deep' = 'brief'; // Default style
            
            if (request.method === 'POST') {
                const body = await request.json() as { topic?: string; transcript?: boolean; script?: string; style?: 'brief' | 'deep' };
                if (body.topic && body.topic.trim()) {
                    topic = body.topic.trim();
                }
                if (body.transcript !== undefined) {
                    returnTranscript = body.transcript;
                }
                if (body.script) {
                    providedScript = body.script;
                }
                if (body.style) {
                    style = body.style;
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
                const linesPerHost = style === 'deep' ? 10 : 8;
                
                const response = await env.AI.run(
                    // @ts-ignore
                    "@cf/openai/gpt-oss-120b",
                    {
                        input: getPrompt(topic, linesPerHost, style),
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

            // Generate TTS for each line with retry logic and rate limiting
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const text = line.trim().split(/\]:\s*/)[1]?.trim(); 

                if (!text) continue; 
                
                console.log(`Generating audio for line ${i + 1}/${lines.length}`);
                
                const speaker = line.startsWith("[Alex]:") ? "arcas" : "helios"; 
                // Angus is good, easy to listen to but robotic.
                // Luna is best female voice but hard to hear.
                // Orion sounds good but very similar to host.
                // Orpheus sounds extremly robotic
                // Athena is female is easy to hear but robotic and monotone.
                // Zeus sounds good easy to hear but male like the host
                // Perseus sounds good but hard to hear
                // Helios sounds good. Easy to hear, funny.
                
                // Generate audio with retry logic
                const audioStream = await generateAudioWithRetry(
                    env.AI,
                    text,
                    speaker,
                    3, // max retries
                    i + 1,
                    lines.length
                );
                
                if (audioStream) {
                    podcastSegmentsInOrder.push(audioStream);
                } else {
                    console.warn(`Failed to generate audio for line ${i + 1}, skipping...`);
                }
                
                // No artificial delay - only retry delays when errors occur
                // This makes the process much faster when everything works
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

// Helper function to sleep for a specified duration
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to generate audio with retry logic
async function generateAudioWithRetry(
    ai: Ai,
    text: string,
    speaker: string,
    maxRetries: number,
    lineNumber: number,
    totalLines: number
): Promise<ReadableStream | null> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // @ts-ignore
            const audioStream = await ai.run("@cf/deepgram/aura-1", {
                "text": text,
                "speaker": speaker
            });
            
            // Success!
            if (attempt > 1) {
                console.log(`Successfully generated audio for line ${lineNumber}/${totalLines} on attempt ${attempt}`);
            }
            // @ts-ignore
            return audioStream;
            
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`Attempt ${attempt}/${maxRetries} failed for line ${lineNumber}/${totalLines}:`, lastError.message);
            
            // If this isn't the last attempt, wait before retrying with exponential backoff
            if (attempt < maxRetries) {
                const backoffMs = Math.min(500 * Math.pow(2, attempt - 1), 2000); // Reduced: 500ms, 1s, 2s max
                console.log(`Waiting ${backoffMs}ms before retry...`);
                await sleep(backoffMs);
            }
        }
    }
    
    // All retries failed
    console.error(`Failed to generate audio for line ${lineNumber}/${totalLines} after ${maxRetries} attempts:`, lastError?.message);
    return null;
}

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

function getPrompt(context: string, linesPerHost: number, style: 'brief' | 'deep'): string {
    // Brief: 2-3 sentences per line, Deep: 6-10 sentences per line with extensive detail
    const sentenceGuidance = style === 'deep' 
        ? 'Each line should be 2-4 sentences long , providing detailed explanations, examples, and deep insights. Every response should be substantial and thorough, however Jamies lines may be shorter than alex\'s'
        : 'Each line should be 2-3 sentences long, keeping the conversation concise and engaging.';
    
    const styleGuidance = style === 'deep'
        ? 'This is a DEEP DIVE podcast - go into detail, explore nuances, provide multiple examples, discuss implications, and have a thorough, in-depth discussion.'
        : 'This is a BRIEF TALK podcast - keep it concise, hit the key points, and maintain a brisk pace.';

    return `
    Generate a simple podcast script with 2 hosts:
    - Alex (knowledgeable and calm, presenting the topic, reacting to Jamie's comments)
    - Jamie (upbeat, intrigued, funny, not so knowledgeable of the topic and should be relateable to the viewer, adding value to the discussion)

    User submitted context / topic: "${context}"

    STYLE: ${styleGuidance}

    REQUIREMENTS:
    1. Generate exactly ${linesPerHost} lines from each host (${linesPerHost*2} lines total)
    2. ${sentenceGuidance}
    3. Start with Alex introducing the topic. Make sure both hosts are in conversation with each other and refer to each other. Alex should speak most of the podcast duration, since he is introducing the topic.
    4. Expand all acronyms. Example: U.S to United States.
    5. Alex's first line MUST include:
        - A greeting
        - Introduction of both hosts by name, dont explicitly describe their personalities.
        - Introduction to "The Roundtable"
        - A short summary of the topic before diving into the subject / context the user submitted, and mention what was the user submitted. Refer to the users submition as "the user".
        - Alex's initial line must be at least ${style === 'deep' ? '5' : '4'} sentences long
    6. Jamie's and Alex's final line should close out the podcast with a closing statement that includes their names and thanks the listener.
    7. Alternate between Alex and Jamie (bouncing back and forth). 
    8. Make sure to keep the conversation light and fun, with the occasional use of humor and jokes. However, make sure not to go overboard with jokes, and refrain from using them if the topic is serious / heavy.
    ${style === 'deep' ? '9. IMPORTANT FOR DEEP DIVE: Make each response substantial and detailed. Alex should elaborate on their points, provide context, share examples, and explore different angles. Avoid brief responses from alex - this is meant to be an in-depth discussion. Jamie should also share valuebale insites, but make sure Alex is taking most of the talking time.' : ''}

    FORMAT:
    - A line is simply what the speaker says during their turn. It can be arbitrarily long or short, but the turns should flow naturally like in real conversation. Each line can be multiple sentences or even a single word.
    - Each line must start with the speaker's name in brackets followed by a colon
    - Each line must be separated by one newline (\n)
    - Example format:
    [Alex]:Wonderful Day We're having!\n[Jamie]:It sure is![Alex]:I'm excited to dive into this topic today.\n[Jamie]:Me too! Let's begin.\n[Alex]:Great!
    DO NOT include any additional text, greetings, or explanations.
    `
}