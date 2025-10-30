import { NextRequest, NextResponse } from 'next/server';

// OpenAI API endpoint
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface Transaction {
  description: string;
}

interface CategorizeRequest {
  categories: string[];
  transactions: Transaction[];
}

interface CategorizeResponse {
  categorizedTransactions: {
    description: string;
    category: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI Categorization API Called ===');
    const apiKey = process.env.GPT_KEY;

    console.log('API Key exists:', !!apiKey);
    console.log('API Key length:', apiKey?.length);
    console.log('API Key first 10 chars:', apiKey?.substring(0, 10));

    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body: CategorizeRequest = await request.json();
    const { categories, transactions } = body;

    console.log('Received categories:', categories);
    console.log('Received transactions count:', transactions.length);
    console.log('First 5 transactions:', transactions.slice(0, 5));

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { error: 'Categories array is required' },
        { status: 400 }
      );
    }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Transactions array is required' },
        { status: 400 }
      );
    }

    // Create the prompt for OpenAI
    const systemPrompt = `You are a financial transaction categorization assistant. Your task is to categorize transactions based on their descriptions.

Available categories: ${categories.join(', ')}

Rules:
1. Analyze each transaction description and assign it to the most appropriate category
2. Use context clues from the merchant name to determine the category
3. If you cannot determine the category with confidence, assign it to "Other"
4. Return a JSON object with a "results" array containing objects with "description" and "category" fields
5. The category MUST be exactly one of the available categories (case-sensitive)
6. Maintain the exact same order as the input transactions

Examples:
- "REWE" or "EDEKA" → "Groceries"
- "Spotify" or "Netflix" → "Media & Telecom"
- "Uber" or "RATP" → "Transport"
- "Burger King" or "Cafe" → "Bars & Restaurants"
- "BARMER" or "Insurance" → "Health & Insurance"
- "Studentenwerk" → "Rent"
- "Amazon" → "Shopping"

Response format:
{
  "results": [
    {"description": "REWE Supermarket", "category": "Groceries"},
    {"description": "Spotify Premium", "category": "Media & Telecom"}
  ]
}`;

    const userPrompt = `Categorize these transactions:
${transactions.map((t, idx) => `${idx + 1}. ${t.description}`).join('\n')}

Return the JSON object with categorized results.`;

    console.log('System prompt length:', systemPrompt.length);
    console.log('User prompt length:', userPrompt.length);

    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    };

    console.log('Calling OpenAI API...');
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Call OpenAI API with timeout and better error handling
    let response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log('OpenAI API response status:', response.status);
        console.log('OpenAI API response ok:', response.ok);
      } catch (abortError) {
        clearTimeout(timeoutId);
        if (abortError.name === 'AbortError') {
          console.error('Request timed out after 60 seconds');
          return NextResponse.json(
            {
              error: 'OpenAI API request timed out',
              details: 'The request took too long to complete. Please check your network connection and try again.'
            },
            { status: 504 }
          );
        }
        throw abortError;
      }
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      console.error('Fetch error message:', fetchError instanceof Error ? fetchError.message : 'Unknown error');
      console.error('Fetch error stack:', fetchError instanceof Error ? fetchError.stack : 'No stack');

      // Provide more helpful error message
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      if (errorMessage.includes('fetch failed') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ECONNREFUSED')) {
        return NextResponse.json(
          {
            error: 'Network connection failed',
            details: 'Cannot connect to OpenAI API. This might be due to:\n' +
                     '1. Firewall blocking the connection\n' +
                     '2. Proxy configuration needed\n' +
                     '3. Network restrictions\n' +
                     '4. No internet access\n\n' +
                     'Please check your network settings or contact your network administrator.'
          },
          { status: 503 }
        );
      }
      throw fetchError;
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error status:', response.status);
      console.error('OpenAI API error data:', errorData);
      return NextResponse.json(
        { error: 'Failed to categorize transactions', details: errorData },
        { status: response.status }
      );
    }

    console.log('Parsing OpenAI response...');
    const data = await response.json();
    console.log('OpenAI full response data:', JSON.stringify(data, null, 2));

    const content = data.choices[0]?.message?.content;
    console.log('OpenAI message content:', content);

    if (!content) {
      console.error('No content in OpenAI response');
      return NextResponse.json(
        { error: 'No response from OpenAI' },
        { status: 500 }
      );
    }

    console.log('OpenAI response:', content);

    // Parse the response
    let categorizedTransactions;
    try {
      const parsed = JSON.parse(content);
      console.log('Parsed response:', parsed);

      // Handle various response formats
      categorizedTransactions = parsed.results || parsed.transactions || parsed.categorizedTransactions || (Array.isArray(parsed) ? parsed : null);

      if (!Array.isArray(categorizedTransactions)) {
        console.error('Response is not an array. Parsed:', parsed);
        throw new Error('Response is not an array');
      }

      console.log(`Successfully parsed ${categorizedTransactions.length} categorized transactions`);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid response format from OpenAI', details: content },
        { status: 500 }
      );
    }

    // Validate and sanitize the response
    const validatedTransactions = categorizedTransactions.map((item, idx) => {
      const originalDescription = transactions[idx]?.description || item.description;
      const category = item.category;

      // Ensure the category is valid, default to "Other" if not
      const validCategory = categories.includes(category) ? category : 'Other';

      if (!categories.includes(category)) {
        console.warn(`Invalid category "${category}" for "${originalDescription}", defaulting to "Other"`);
      }

      return {
        description: originalDescription,
        category: validCategory,
      };
    });

    console.log(`Returning ${validatedTransactions.length} validated transactions`);

    const result: CategorizeResponse = {
      categorizedTransactions: validatedTransactions,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('=== CRITICAL ERROR in categorize API ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Full error object:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
