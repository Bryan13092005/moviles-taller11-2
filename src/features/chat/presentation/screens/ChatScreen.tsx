import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../../../theme/tokens';
import { Message } from '../../domain/entities/Message';
import { MessageBubble } from '../components/MessageBubble';
import { useChat } from '../hooks/useChat';

const suggestions = [
  'Explícame algo nuevo',
  'Ayúdame a escribir',
  'Dame ideas para un proyecto',
];

function lightHaptic() {
  if (Platform.OS === 'web') return;
  const feedback = Platform.OS === 'android'
    ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Keyboard_Tap)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  void feedback.catch(error => console.warn('No se pudo reproducir la respuesta háptica:', error));
}

function PulseDot() {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) opacity.value = withRepeat(withTiming(0.45, { duration: 900 }), -1, true);
  }, [opacity, reduceMotion]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.statusDot, animatedStyle]} />;
}

function ThinkingIndicator() {
  return (
    <View style={styles.thinking} accessibilityRole='status' accessibilityLabel='El asistente está escribiendo'>
      <View style={styles.thinkingDots}><PulseDot /><View style={styles.thinkingDot} /><PulseDot /></View>
      <Text style={styles.thinkingText}>El asistente está escribiendo</Text>
    </View>
  );
}

export const ChatScreen: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);
  const previousMessages = useRef(0);
  const {
    messages, isLoading, error, sendMessage, clearChat,
    isSpeechEnabled, isSpeaking, speakText, toggleSpeech, stopSpeaking,
  } = useChat();
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  useEffect(() => {
    if (messages.length > previousMessages.current && messages[messages.length - 1]?.role === 'assistant') {
      lightHaptic();
    }
    previousMessages.current = messages.length;
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    lightHaptic();
    await sendMessage(text);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <View style={styles.avatar} accessible={false}>
              <View style={styles.avatarLine} /><View style={styles.avatarLineCross} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Chat con IA</Text>
              <View style={styles.headerStatus}>
                <PulseDot />
                <Text style={styles.statusText}>{isLoading ? 'Pensando' : 'Tu asistente IA'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={clearChat} style={styles.headerButton} accessibilityRole='button' accessibilityLabel='Limpiar conversación'>
              <Text style={styles.headerButtonText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.voiceControl} onPress={toggleSpeech} accessibilityRole='switch'
              accessibilityLabel='Voz automática' accessibilityState={{ checked: isSpeechEnabled }} aria-checked={isSpeechEnabled}>
              <Text style={styles.voiceText}>Voz {isSpeechEnabled ? 'ON' : 'OFF'}</Text>
              <View style={[styles.switchTrack, isSpeechEnabled && styles.switchTrackOn]}>
                <View style={[styles.switchThumb, isSpeechEnabled && styles.switchThumbOn]} />
              </View>
            </TouchableOpacity>
            {isSpeaking && (
              <TouchableOpacity onPress={stopSpeaking} style={styles.stopButton} accessibilityRole='button'>
                <Text style={styles.headerButtonText}>Detener</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.modelBadge}>GPT-OSS</Text>
          </View>
        </View>

        {messages.length === 0 && !isLoading ? (
          <ScrollView style={styles.emptyScroll} contentContainerStyle={styles.empty} keyboardShouldPersistTaps='handled'>
            <View style={styles.emptyMark}><View style={styles.emptyMarkLine} /><View style={styles.emptyMarkCross} /></View>
            <Text style={styles.emptyTitle}>Una conversación,{'\n'}muchas ideas.</Text>
            <Text style={styles.emptyDescription}>Pregunta, explora o empieza por una idea. Estoy aquí para ayudarte.</Text>
            <Text style={styles.suggestionsLabel}>PRUEBA PREGUNTAR</Text>
            <ScrollView horizontal style={styles.suggestionScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
              {suggestions.map(suggestion => (
                <TouchableOpacity key={suggestion} style={styles.suggestion} onPress={() => setInputText(suggestion)} accessibilityRole='button'>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={reversedMessages}
            inverted
            keyExtractor={item => item.id}
            renderItem={({ item }) => <MessageBubble message={item} onSpeak={speakText} />}
            contentContainerStyle={styles.messagesList}
            keyboardShouldPersistTaps='handled'
          />
        )}
        {isLoading && <ThinkingIndicator />}
        {error && <View style={styles.errorContainer} accessibilityRole='alert'><Text style={styles.errorText}>{error}</Text></View>}
        <View style={styles.composerArea}>
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder='Escribe un mensaje...'
              placeholderTextColor={colors.plumSoft}
              selectionColor={colors.plum}
              multiline
              accessibilityLabel='Escribe un mensaje'
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              accessibilityRole='button'
              accessibilityLabel='Enviar mensaje'
              accessibilityState={{ disabled: !inputText.trim() || isLoading }}
            >
              <View style={styles.sendArrow} /><View style={styles.sendArrowHead} />
            </TouchableOpacity>
          </View>
          <Text style={styles.composerHint}>La IA puede cometer errores. Verifica la información importante.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.plum },
  flex: { flex: 1, backgroundColor: colors.mineral },
  header: { backgroundColor: colors.plum, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md },
  headerMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  avatarLine: { width: 20, height: 2, backgroundColor: colors.plum, transform: [{ rotate: '45deg' }] },
  avatarLineCross: { position: 'absolute', width: 20, height: 2, backgroundColor: colors.plum, transform: [{ rotate: '-45deg' }] },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: colors.mineral, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lime },
  statusText: { color: colors.onPlumMuted, fontSize: 12 },
  headerButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  headerButtonText: { color: colors.mineral, fontSize: 13, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginTop: 6 },
  voiceControl: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  voiceText: { color: colors.mineral, fontSize: 12, fontWeight: '600' },
  switchTrack: { width: 40, height: 24, borderRadius: 12, backgroundColor: colors.onPlumMuted, justifyContent: 'center', paddingHorizontal: 3 },
  switchTrackOn: { backgroundColor: colors.lime },
  switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.plum },
  switchThumbOn: { alignSelf: 'flex-end' },
  stopButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  modelBadge: { overflow: 'hidden', marginLeft: 'auto', backgroundColor: colors.lime, color: colors.plum, borderRadius: 5, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  emptyScroll: { flex: 1 },
  empty: { flexGrow: 1, justifyContent: 'center', paddingLeft: spacing.xl, paddingVertical: spacing.xl },
  emptyMark: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  emptyMarkLine: { width: 24, height: 2, backgroundColor: colors.lime, transform: [{ rotate: '45deg' }] },
  emptyMarkCross: { position: 'absolute', width: 24, height: 2, backgroundColor: colors.lime, transform: [{ rotate: '-45deg' }] },
  emptyTitle: { color: colors.plum, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8, paddingRight: spacing.xl },
  emptyDescription: { color: colors.plumSoft, fontSize: 16, lineHeight: 24, marginTop: spacing.md, maxWidth: 320, paddingRight: spacing.xl },
  suggestionsLabel: { color: colors.plumSoft, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: spacing.xxl, marginBottom: spacing.md },
  suggestionScroll: { flexGrow: 0 },
  suggestions: { gap: spacing.sm, paddingRight: spacing.xl },
  suggestion: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.plumBorder, justifyContent: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.surface },
  suggestionText: { color: colors.plum, fontSize: 13, fontWeight: '600' },
  messagesList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: spacing.lg },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  thinkingDots: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.plum, borderRadius: 14, padding: 10 },
  thinkingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.mineral },
  thinkingText: { color: colors.plumSoft, fontSize: 13 },
  errorContainer: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, padding: spacing.md, backgroundColor: colors.plum, borderRadius: 12 },
  errorText: { color: colors.mineral, fontSize: 14 },
  composerArea: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  composer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.surface, borderRadius: 24, padding: 6, paddingLeft: spacing.lg, borderWidth: 1, borderColor: colors.plumBorder },
  input: { flex: 1, minHeight: 44, maxHeight: 120, color: colors.plum, fontSize: 16, lineHeight: 22, paddingVertical: 10, paddingRight: spacing.sm },
  sendButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lime },
  sendButtonDisabled: { backgroundColor: colors.surfaceMuted },
  sendArrow: { height: 17, width: 2, backgroundColor: colors.plum },
  sendArrowHead: { position: 'absolute', top: 15, width: 9, height: 9, borderTopWidth: 2, borderLeftWidth: 2, borderColor: colors.plum, transform: [{ rotate: '45deg' }] },
  composerHint: { color: colors.plumSoft, fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: spacing.sm },
});
