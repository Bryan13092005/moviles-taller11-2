import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, spacing } from '../../../../theme/tokens';
import { Message } from '../../domain/entities/Message';
import { MarkdownText } from './MarkdownText';

interface Props { message: Message; onSpeak?: (text: string) => void; }

export const MessageBubble: React.FC<Props> = ({ message, onSpeak }) => {
  const isUser = message.role === 'user';
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(reduceMotion ? 0 : 10);
  const [copyStatus, setCopyStatus] = useState('');
  useEffect(() => {
    offset.value = withSpring(0, { damping: 20, stiffness: 180, overshootClamping: true });
  }, [offset]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  const copyMessage = async () => {
    try {
      const copied = await Clipboard.setStringAsync(message.content);
      setCopyStatus(copied ? 'Copiado' : 'No se pudo copiar');
    } catch (error) {
      console.error('Error al copiar el mensaje:', error);
      setCopyStatus('No se pudo copiar');
    }
  };

  return (
    <Animated.View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer, animatedStyle]}>
      <Text style={styles.sender}>{isUser ? 'TÚ' : 'ASISTENTE'}</Text>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <MarkdownText style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {message.content}
        </MarkdownText>
      </View>
      <View style={styles.metadata}>
        <Text style={styles.timestamp}>
          {message.timestamp.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {!isUser && (
          <>
            <TouchableOpacity onPress={copyMessage} style={styles.action} accessibilityRole='button' accessibilityLabel='Copiar mensaje'>
              <Text style={styles.actionText} accessibilityLiveRegion='polite'>{copyStatus || 'Copiar'}</Text>
            </TouchableOpacity>
            {onSpeak && (
              <TouchableOpacity onPress={() => onSpeak(message.content)} style={styles.action} accessibilityRole='button' accessibilityLabel='Escuchar mensaje'>
                <Text style={styles.actionText}>Escuchar</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { maxWidth: '90%' },
  userContainer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  aiContainer: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: { color: colors.plumSoft, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: spacing.sm, marginHorizontal: 4 },
  bubble: { maxWidth: '100%', borderRadius: 18, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  userBubble: { backgroundColor: colors.plum, borderBottomRightRadius: 5 },
  aiBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 5 },
  text: { fontSize: 16, lineHeight: 24 },
  userText: { color: colors.mineral },
  aiText: { color: colors.plum },
  metadata: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginHorizontal: 4 },
  timestamp: { fontSize: 11, color: colors.plumSoft },
  action: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 4 },
  actionText: { fontSize: 12, fontWeight: '600', color: colors.plum },
});
