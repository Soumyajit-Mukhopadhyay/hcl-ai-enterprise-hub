import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, searchType = 'general', options = {} } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Perplexity search:', query, 'Type:', searchType);

    // Build system prompt based on search type
    let systemPrompt = 'Be precise and concise. Provide accurate, up-to-date information.';
    
    if (searchType === 'social_profile') {
      systemPrompt = `You are a professional researcher. Find public information about the person or profile mentioned.
        Include: name, current role/company, location, professional background, public social links.
        Only provide publicly available information. If information is not found, say so clearly.`;
    } else if (searchType === 'company') {
      systemPrompt = 'Provide detailed company information including industry, size, headquarters, key products/services, and recent news.';
    } else if (searchType === 'technical') {
      systemPrompt = 'Provide technical, accurate information with code examples if relevant. Focus on best practices and current standards.';
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.2,
        search_domain_filter: options.domainFilter || undefined,
        search_recency_filter: options.recencyFilter || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Perplexity API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error?.message || 'Search failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Perplexity search successful');
    return new Response(
      JSON.stringify({
        success: true,
        result: data.choices?.[0]?.message?.content || '',
        citations: data.citations || [],
        model: data.model,
        usage: data.usage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in perplexity search:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
