import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { IMessage } from '../store/slices/chatSlice';
import { Ionicons } from '@expo/vector-icons';

interface ChatBubbleProps {
    message: IMessage;
    isCurrentUser: boolean;
}

const ChatBubble = ({ message, isCurrentUser }: ChatBubbleProps) => {
    return (
        <View style={[styles.container, isCurrentUser ? styles.right : styles.left]}>
            {/* Avatar could go here for left messages */}
            <View style={[styles.bubble, isCurrentUser ? styles.bubbleRight : styles.bubbleLeft]}>
                {message.image && (
                    <Image source={{ uri: message.image }} style={styles.image} resizeMode="cover" />
                )}
                {message.text ? <Text style={styles.text}>{message.text}</Text> : null}

                <View style={styles.footer}>
                    <Text style={styles.time}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isCurrentUser && (
                        <Ionicons
                            name={message.received ? "checkmark-done" : "checkmark"}
                            size={14}
                            color={message.sent ? "#4DB6AC" : "#ccc"}
                            style={{ marginLeft: 4 }}
                        />
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 10,
        flexDirection: 'row',
    },
    left: {
        justifyContent: 'flex-start',
    },
    right: {
        justifyContent: 'flex-end',
    },
    bubble: {
        maxWidth: '80%',
        borderRadius: 16,
        padding: 12,
    },
    bubbleLeft: {
        backgroundColor: '#2C2C2C',
        borderTopLeftRadius: 0,
    },
    bubbleRight: {
        backgroundColor: '#6C63FF',
        borderTopRightRadius: 0,
    },
    text: {
        color: '#fff',
        fontSize: 16,
    },
    image: {
        width: 200,
        height: 150,
        borderRadius: 8,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 4
    },
    time: {
        fontSize: 10,
        color: '#rgba(255,255,255,0.7)'
    }
});

export default ChatBubble;
