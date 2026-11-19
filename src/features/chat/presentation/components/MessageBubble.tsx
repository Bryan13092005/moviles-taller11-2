import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Message } from '../../domain/entities/Message';
import { MarkdownText } from './MarkdownText';

interface Props { message: Message; onSpeak?: (text: string) => void; }

export const MessageBubble: React.FC<Props> = ({ message, onSpeak }) => {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <MarkdownText style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {message.content}
        </MarkdownText>
      </View>
      <View style={styles.metadata}>
        <Text style={styles.timestamp}>
          {message.timestamp.toLocaleTimeString('es-EC', {
            hour: '2-digit', minute: '2-digit',
          })}
        </Text>
        {!isUser && onSpeak && (
          <TouchableOpacity onPress={() => onSpeak(message.content)} accessibilityRole='button'
            accessibilityLabel='Escuchar mensaje'>
            <Text style={styles.speakText}>🔊 Escuchar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 4, marginHorizontal: 12, maxWidth: '80%' },
  userContainer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  aiContainer:  { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble:       { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble:   { backgroundColor: '#2563EB', borderBottomRightRadius: 4 },
  aiBubble:     { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  text:         { fontSize: 15, lineHeight: 21 },
  userText:     { color: '#FFFFFF' },
  aiText:       { color: '#1E293B' },
  metadata:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  timestamp:    { fontSize: 10, color: '#94A3B8' },
  speakText:    { fontSize: 12, color: '#2563EB', paddingVertical: 6 },
});
