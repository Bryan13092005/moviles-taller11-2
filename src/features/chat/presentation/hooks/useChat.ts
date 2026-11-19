import { useState, useCallback, useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import { Message } from '../../domain/entities/Message';
import { SendMessageUseCase } from '../../domain/usecases/SendMessageUseCase';
import { ChatRepositoryImpl } from '../../data/repositories/ChatRepositoryImpl';

// Inyección de dependencias: el hook construye el grafo de objetos
const sendMessageUseCase = new SendMessageUseCase(new ChatRepositoryImpl());

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechEnabledRef = useRef(true);
  const speechIdRef = useRef(0);
  const chatIdRef = useRef(0);
  const mountedRef = useRef(true);
  const stopQueueRef = useRef<Promise<void>>(Promise.resolve());

  const queueStop = useCallback(() => {
    const stop = stopQueueRef.current.then(() => Speech.stop()).then(
      () => true,
      (err: unknown) => {
        console.error('Error al detener la voz:', err);
        if (mountedRef.current) setError('No se pudo detener la voz.');
        return false;
      },
    );
    stopQueueRef.current = stop.then(() => undefined);
    return stop;
  }, []);

  const stopSpeaking = useCallback(() => {
    speechIdRef.current += 1;
    setIsSpeaking(false);
    return queueStop();
  }, [queueStop]);

  const speakText = useCallback((text: string) => {
    const cleanedText = text.replace(/[*#`_]/g, '').trim();
    const stop = stopSpeaking();
    const speechId = speechIdRef.current;

    void stop.then(stopped => {
      if (!stopped || !mountedRef.current || speechId !== speechIdRef.current || !cleanedText) return;

      setIsSpeaking(true);
      const speakChunk = (offset: number) => {
        if (!mountedRef.current || speechId !== speechIdRef.current) return;
        if (offset >= cleanedText.length) {
          setIsSpeaking(false);
          return;
        }

        let end = Math.min(offset + Speech.maxSpeechInputLength, cleanedText.length);
        if (end < cleanedText.length) {
          const space = cleanedText.lastIndexOf(' ', end - 1);
          if (space > offset) end = space + 1;
          else if (/[\uD800-\uDBFF]/.test(cleanedText[end - 1])) end -= 1;
        }

        try {
          Speech.speak(cleanedText.slice(offset, end), {
            language: 'es-ES',
            onDone: () => speakChunk(end),
            onStopped: () => {
              if (mountedRef.current && speechId === speechIdRef.current) setIsSpeaking(false);
            },
            onError: err => {
              console.error('Error al reproducir la voz:', err);
              if (mountedRef.current && speechId === speechIdRef.current) {
                setIsSpeaking(false);
                setError('No se pudo reproducir la voz.');
              }
            },
          });
        } catch (err) {
          console.error('Error al reproducir la voz:', err);
          setIsSpeaking(false);
          setError('No se pudo reproducir la voz.');
        }
      };
      speakChunk(0);
    });
  }, [stopSpeaking]);

  const toggleSpeech = useCallback(() => {
    const enabled = !speechEnabledRef.current;
    speechEnabledRef.current = enabled;
    setIsSpeechEnabled(enabled);
    if (!enabled) void stopSpeaking();
  }, [stopSpeaking]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      speechIdRef.current += 1;
      void queueStop();
    };
  }, [queueStop]);

  const sendMessage = useCallback(async (userInput: string) => {
    void stopSpeaking();
    const chatId = chatIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const { userMessage, assistantMessage } =
        await sendMessageUseCase.execute(userInput, messages);
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      if (mountedRef.current && chatId === chatIdRef.current && speechEnabledRef.current) {
        speakText(assistantMessage.content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [messages, speakText, stopSpeaking]);

  const clearChat = useCallback(() => {
    chatIdRef.current += 1;
    void stopSpeaking();
    setMessages([]);
    setError(null);
  }, [stopSpeaking]);

  return {
    messages, isLoading, error, sendMessage, clearChat,
    isSpeechEnabled, isSpeaking, speakText, toggleSpeech, stopSpeaking,
  };
};
