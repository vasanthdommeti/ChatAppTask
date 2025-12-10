import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Make sure @expo/vector-icons is available (standard in Expo)

interface InputToolbarProps {
    onSend: (text: string) => void;
    onPickImage: () => void;
    onTyping: (text: string) => void;
}

const InputToolbar = ({ onSend, onPickImage, onTyping }: InputToolbarProps) => {
    const [text, setText] = useState('');

    const handleSend = () => {
        if (text.trim()) {
            onSend(text);
            setText('');
            onTyping('');
        }
    };

    const handleChange = (val: string) => {
        setText(val);
        onTyping(val);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={onPickImage} style={styles.iconButton}>
                <Ionicons name="image-outline" size={24} color="#6C63FF" />
            </TouchableOpacity>

            <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#888"
                value={text}
                onChangeText={handleChange}
                multiline
            />

            <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 8,
        backgroundColor: '#1E1E1E',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    iconButton: {
        padding: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#2C2C2C',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        color: '#fff',
        maxHeight: 100,
        marginHorizontal: 8,
    },
    sendButton: {
        backgroundColor: '#6C63FF',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default InputToolbar;
