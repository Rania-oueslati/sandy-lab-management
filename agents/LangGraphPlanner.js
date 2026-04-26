require('dotenv').config();
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatOpenAI } = require('@langchain/openai');
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { search, SafeSearchType } = require('duck-duck-scrape');
const DatabaseAgent = require('./DatabaseAgent');


function getLLM(modelName) {
  if (modelName.startsWith('openrouter:')) {
    const actualModelName = modelName.replace('openrouter:', '');
    return new ChatOpenAI({
      model: actualModelName,
      apiKey: process.env.OPENROUTER_API_KEY,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
      temperature: 0
    });
  } else if (modelName.startsWith('gemini')) {
    return new ChatGoogleGenerativeAI({
      model: modelName,
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0
    });
  } else {
    throw new Error(`Model ${modelName} not supported. Please use a Gemini or OpenRouter model.`);
  }
}


const routerLlm = getLLM(process.env.ROUTER_MODEL );
const inventoryLlm = getLLM(process.env.INVENTORY_MODEL);
const researchLlm = getLLM(process.env.RESEARCH_MODEL );


const checkInventoryTool = tool(
  async ({ query }) => {
    console.log(`[Tool] Checking inventory...`);
    const inventory = await DatabaseAgent.getInventory();
    return JSON.stringify(inventory.map(item => `${item.name}: ${item.quantity} ${item.unit}`));
  },
  {
    name: 'check_inventory',
    description: 'Check available items in the lab inventory',
    schema: z.object({ query: z.string() }),
  }
);

const updateInventoryTool = tool(
  async ({ item, changeAmount }) => {
    console.log(`[Tool] Updating inventory for ${item} by ${changeAmount}...`);
    const result = await DatabaseAgent.updateInventoryQuantity(item, changeAmount, 'Agent Update');
    return result.message;
  },
  {
    name: 'update_inventory',
    description: 'Add (positive) or remove (negative) items from inventory.',
    schema: z.object({
      item: z.string(),
      changeAmount: z.number(),
    }),
  }
);

const webSearchTool = tool(
  async ({ query }) => {
    console.log(`[Tool] Web searching for: ${query}`);
    try {
      const searchResults = await search(query, { safeSearch: SafeSearchType.STRICT });
      if (!searchResults.results || searchResults.results.length === 0) return "No results found.";
      return searchResults.results.slice(0, 3).map(res => `Title: ${res.title}\nSnippet: ${res.description}`).join('\n\n');
    } catch (e) {
      console.log(`[Tool] DDG search blocked. Falling back to Wikipedia API for: ${query}`);
      try {
        const response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`);
        const data = await response.json();
        if (!data.query || !data.query.search || data.query.search.length === 0) {
          return "Web search and Wikipedia fallback failed. No results found.";
        }
        return data.query.search.slice(0, 3).map(res => `Title: ${res.title}\nSnippet: ${res.snippet.replace(/<\/?[^>]+(>|$)/g, "")}`).join('\n\n');
      } catch (wikiErr) {
        return "Web search failed completely due to rate limiting and fallback failure.";
      }
    }
  },
  {
    name: 'web_search',
    description: 'Search the internet for scientific research or information.',
    schema: z.object({ query: z.string() }),
  }
);


const inventoryAgent = createReactAgent({
  llm: inventoryLlm,
  tools: [checkInventoryTool, updateInventoryTool],
  messageModifier: "You are Sandy Cheeks, the brilliant squirrel scientist from Texas. This is YOUR Treedome Lab and YOUR inventory! Use your tools to manage your stock. Always respond directly to the user in your enthusiastic Texas cowgirl persona (e.g., 'Yeehaw!', 'Tarnation!', 'Howdy partner!'). Be very proud of your lab equipment and acorn stash."
});

const researchAgent = createReactAgent({
  llm: researchLlm,
  tools: [webSearchTool],
  messageModifier: "You are Sandy Cheeks, the brilliant squirrel scientist from Texas. This is YOUR Treedome Lab. You MUST ALWAYS use the 'web_search' tool to find scientific answers. Explain science with a confident Texas cowgirl persona, using phrases like 'Yeehaw', 'Hoo-wee', or 'partner'. Never break character. You love science, karate, and Texas!"
});


class SupervisorBot {
  async processRequest(userQuery) {
    console.log(`[Father Bot] Received query: "${userQuery}"`);
    await DatabaseAgent.logAction('USER_REQUEST', userQuery);

    
    const supervisorPrompt = `You are the Father Bot (Supervisor) of the Treedome Lab.
You must classify the user's prompt into exactly one of four categories:
- "INVENTORY": ONLY if the user asks about stock, items, acorns, adding, or removing things.
- "RESEARCH": ONLY if the user asks a scientific question requiring web search.
- "BOTH": ONLY if the user asks BOTH an inventory question AND a scientific/research question in the same prompt (e.g. "Do we have oxygen and what is it?").
- "CHAT": If the user says hello, hi, how are you, or makes a general greeting.

You must also provide an "enhanced_prompt" which is what you will send to the sub-agent. If the user just says "Hi", the enhanced prompt should just be "Hi".

Respond STRICTLY in valid JSON format with no markdown, no backticks, and no extra text:
{"selected_agent": "CHAT", "enhanced_prompt": "Hi"}

User Prompt: "${userQuery}"`;

    let decision;
    try {
      const response = await routerLlm.invoke([{ role: 'user', content: supervisorPrompt }]);
      
     
      const content = response.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        decision = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse JSON decision");
      }
    } catch (error) {
      console.error('[Father Bot] Decision Error:', error);
      return "Father Bot Error: Could not determine routing.";
    }

    console.log(`[Father Bot] Routing to: ${decision.selected_agent}`);
    console.log(`[Father Bot] Enhanced Prompt: "${decision.enhanced_prompt}"`);

    let finalResponse = "";

    try {
     
      if (decision.selected_agent === 'BOTH') {
        const invPromise = inventoryAgent.invoke({ messages: [['user', decision.enhanced_prompt]] });
        const resPromise = researchAgent.invoke({ messages: [['user', decision.enhanced_prompt]] });
        
        const [invResult, resResult] = await Promise.all([invPromise, resPromise]);
        const invContent = invResult.messages[invResult.messages.length - 1].content;
        const resContent = resResult.messages[resResult.messages.length - 1].content;
        
        const combinePrompt = `You are Sandy Cheeks. Combine these two pieces of information into a single, cohesive, and natural response for the user. Keep your cowgirl personality!\n\nInventory info: ${invContent}\n\nResearch info: ${resContent}`;
        const combinedResponse = await routerLlm.invoke([{ role: 'user', content: combinePrompt }]);
        finalResponse = combinedResponse.content;
      }
      else if (decision.selected_agent === 'INVENTORY') {
        const result = await inventoryAgent.invoke({ messages: [['user', decision.enhanced_prompt]] });
        finalResponse = result.messages[result.messages.length - 1].content;
      } 
      else if (decision.selected_agent === 'RESEARCH') {
        const result = await researchAgent.invoke({ messages: [['user', decision.enhanced_prompt]] });
        finalResponse = result.messages[result.messages.length - 1].content;
      } 
      else {
        
        const chatResponse = await routerLlm.invoke([
          { role: 'system', content: 'You are Sandy Cheeks, the brilliant squirrel scientist from Texas. This is YOUR Treedome Lab. Speak in a friendly, enthusiastic cowgirl persona (use words like "Yeehaw", "Tarnation", "partner"). Be proud of your science and karate skills.' },
          { role: 'user', content: decision.enhanced_prompt }
        ]);
        finalResponse = chatResponse.content;
      }
    } catch (error) {
      console.error(`[Father Bot] Sub-Agent Error:`, error);
      finalResponse = "Tarnation! The sub-agent ran into a problem executing the tools.";
    }

   
    await DatabaseAgent.logAction('AGENT_RESPONSE', finalResponse, { 
      agent: decision.selected_agent, 
      original_query: userQuery, 
      enhanced_prompt: decision.enhanced_prompt 
    });

    return finalResponse;
  }
}

module.exports = new SupervisorBot();
