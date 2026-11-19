import { Message } from '../../domain/entities/Message';

export class GroqDataSource {
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

  async generateResponse(
    userMessage: string,
    history: Message[]
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Falta configurar EXPO_PUBLIC_GROQ_API_KEY en el archivo .env');
    }

    // Convertir el historial al formato estándar (user / assistant)
    const messages = [
      {
        role: 'system',
        content: 'Eres un asistente útil y amable. Responde de forma clara y concisa en español.',
      },
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b', // Modelo potente y gratuito en Groq
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });                             

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Error HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content ?? 'Sin respuesta del modelo.';
  }
}