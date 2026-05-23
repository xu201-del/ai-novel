const ENDPOINTS: Record<string, string> = {
  'deepseek-v3': 'https://api.deepseek.com/v1/chat/completions',
  'deepseek-r1': 'https://api.deepseek.com/v1/chat/completions',
  'gpt-4o': 'https://api.openai.com/v1/chat/completions',
  'claude-sonnet': 'https://api.anthropic.com/v1/messages',
  'claude-opus': 'https://api.anthropic.com/v1/messages',
  'qwen-max': 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  'kimi': 'https://api.moonshot.cn/v1/chat/completions',
};

const MODEL_NAMES: Record<string, string> = {
  'deepseek-v3': 'deepseek-chat',
  'deepseek-r1': 'deepseek-reasoner',
  'gpt-4o': 'gpt-4o',
  'claude-sonnet': 'claude-sonnet-4-6-20250514',
  'claude-opus': 'claude-opus-4-7-20250514',
  'qwen-max': 'qwen-max',
  'kimi': 'moonshot-v1-128k',
};

export interface ApiConfig {
  key: string;
  endpoint?: string;
  model: string;
}

export async function fetchAI({
  prompt,
  maxTokens = 4096,
  apiConfig,
  signal,
}: {
  prompt: string;
  maxTokens?: number;
  apiConfig: ApiConfig;
  signal?: AbortSignal;
}): Promise<string> {
  const key = apiConfig.key;
  if (!key) throw new Error('请先配置 API Key');

  const endpoint = apiConfig.endpoint || ENDPOINTS[apiConfig.model] || ENDPOINTS['deepseek-v3'];
  const model = MODEL_NAMES[apiConfig.model] || apiConfig.model;

  const isAnthropic = endpoint.includes('anthropic.com');

  let body: Record<string, unknown>;
  let headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (isAnthropic) {
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
    body = { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] };
  } else {
    headers['Authorization'] = `Bearer ${key}`;
    body = { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] };
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`API ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  if (isAnthropic) {
    return data.content?.[0]?.text || '';
  }
  return data.choices?.[0]?.message?.content || '';
}

export async function fetchAIStream({
  prompt,
  maxTokens = 4096,
  apiConfig,
  signal,
  onToken,
}: {
  prompt: string;
  maxTokens?: number;
  apiConfig: ApiConfig;
  signal?: AbortSignal;
  onToken: (fullText: string) => void;
}): Promise<string> {
  const key = apiConfig.key;
  if (!key) throw new Error('请先配置 API Key');

  const endpoint = apiConfig.endpoint || ENDPOINTS[apiConfig.model] || ENDPOINTS['deepseek-v3'];
  const model = MODEL_NAMES[apiConfig.model] || apiConfig.model;
  const isAnthropic = endpoint.includes('anthropic.com');

  let body: Record<string, unknown>;
  let headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (isAnthropic) {
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
    body = { model, max_tokens: maxTokens, stream: true, messages: [{ role: 'user', content: prompt }] };
  } else {
    headers['Authorization'] = `Bearer ${key}`;
    body = { model, max_tokens: maxTokens, stream: true, messages: [{ role: 'user', content: prompt }] };
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`API ${resp.status}: ${errText.slice(0, 150)}`);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        let token = '';
        if (isAnthropic) {
          if (parsed.type === 'content_block_delta') {
            token = parsed.delta?.text || '';
          }
        } else {
          token = parsed.choices?.[0]?.delta?.content || '';
        }
        if (token) {
          fullText += token;
          onToken(fullText);
        }
      } catch { /* skip malformed */ }
    }
  }

  return fullText;
}

export function parseJSONFromText(text: string): unknown | null {
  try {
    let cleaned = text;
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) cleaned = m[1];

    // Try to find JSON array first, then object
    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if (arrStart >= 0 && arrEnd > arrStart) {
      return JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
    }

    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart >= 0 && objEnd > objStart) {
      return JSON.parse(cleaned.slice(objStart, objEnd + 1));
    }
  } catch { /* fall through */ }
  return null;
}
