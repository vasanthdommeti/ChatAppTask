import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface InputToolbarProps {
    onSend: (text: string) => void;
    onPickImage: () => void;
    onTyping: (text: string) => void;
    keyboardOpen?: boolean;
}

const InputToolbar = ({ onSend, onPickImage, onTyping, keyboardOpen = false }: InputToolbarProps) => {
    const [text, setText] = useState('');
    const hasText = text.trim().length > 0;

    const handleSend = () => {
        if (!hasText) return;
        onSend(text);
        setText('');
        onTyping('');
    };

    const handleChange = (val: string) => {
        setText(val);
        onTyping(val);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={onPickImage} style={styles.iconButton}>
                <Ionicons name="image-outline" size={22} color="#8696A0" />
            </TouchableOpacity>

            <View style={styles.inputContainer}>
                <TextInput
                    style={[styles.input]}
                    placeholder="Type a message..."
                    placeholderTextColor="#8696A0"
                    value={text}
                    onChangeText={handleChange}
                    multiline
                    selectionColor="#25D366"
                    keyboardAppearance="dark"
                    textAlignVertical="center"
                />
            </View>

            <TouchableOpacity
                onPress={handleSend}
                style={[styles.sendButton, !hasText && styles.sendButtonDisabled]}
                disabled={!hasText}
                activeOpacity={hasText ? 0.8 : 1}
            >
                <Ionicons name="send" size={20} color={hasText ? '#0B141A' : '#6B7A86'} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 6,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1F2C34',
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1F2C34',
        borderRadius: 22,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginHorizontal: 8,
    },
    input: {
        flex: 1,
        color: '#E9EDEF',
        fontSize: 16,
        paddingVertical: 6,
        maxHeight: 120,
    },
    sendButton: {
        backgroundColor: '#25D366',
        borderRadius: 22,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#2A3942',
    },
});

export default InputToolbar;
