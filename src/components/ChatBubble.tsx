import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { IMessage } from '../store/slices/chatSlice';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface ChatBubbleProps {
    message: IMessage;
    isCurrentUser: boolean;
}

const ChatBubble = ({ message, isCurrentUser }: ChatBubbleProps) => {
    const hasImage = Boolean(message.image);
    const timeLabel = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const statusColor = message.seen
        ? '#53BDEB'
        : message.received || message.sent
            ? '#A8B3BA'
            : '#8696A0';

    return (
        <View style={[styles.row, isCurrentUser ? styles.rowRight : styles.rowLeft]}>
            <View
                style={[
                    styles.bubble,
                    isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
                    hasImage && styles.bubbleWithImage,
                ]}
            >
                {message.image && (
                    <Image source={{ uri: message.image }} style={styles.image} resizeMode="cover" />
                )}
                {message.text ? <Text style={styles.text}>{message.text}</Text> : null}

                <View style={styles.metaRow}>
                    <Text style={[styles.time, isCurrentUser ? styles.timeRight : styles.timeLeft]}>
                        {timeLabel}
                    </Text>
                    {isCurrentUser && (
                        <Ionicons
                            name={message.seen || message.received ? 'checkmark-done' : 'checkmark'}
                            size={14}
                            color={statusColor}
                            style={styles.statusIcon}
                        />
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    rowLeft: {
        justifyContent: 'flex-start',
    },
    rowRight: {
        justifyContent: 'flex-end',
    },
    bubble: {
        maxWidth: '78%',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    bubbleLeft: {
        backgroundColor: '#1F2C34',
        borderTopLeftRadius: 6,
    },
    bubbleRight: {
        backgroundColor: '#005C4B',
        borderTopRightRadius: 6,
    },
    bubbleWithImage: {
        padding: 6,
    },
    text: {
        color: '#E9EDEF',
        fontSize: 16,
        lineHeight: 22,
    },
    image: {
        width: 220,
        height: 160,
        borderRadius: 10,
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    time: {
        fontSize: 11,
    },
    timeLeft: {
        color: '#8696A0',
    },
    timeRight: {
        color: 'rgba(233, 237, 239, 0.75)',
    },
    statusIcon: {
        marginLeft: 4,
    },
});

export default ChatBubble;
