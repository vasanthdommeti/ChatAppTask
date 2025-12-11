import React from 'react';
import { View, StyleSheet } from 'react-native';

const Row = () => (
    <View style={styles.row}>
        <View style={styles.avatar} />
        <View style={styles.textBlock}>
            <View style={styles.lineLong} />
            <View style={styles.lineShort} />
        </View>
    </View>
);

const ChatListSkeleton = () => {
    return (
        <View style={styles.container}>
            <Row />
            <Row />
            <Row />
            <Row />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2A2A2A',
    },
    textBlock: {
        flex: 1,
        gap: 8,
    },
    lineLong: {
        height: 12,
        width: '80%',
        backgroundColor: '#2A2A2A',
        borderRadius: 8,
    },
    lineShort: {
        height: 10,
        width: '60%',
        backgroundColor: '#2A2A2A',
        borderRadius: 8,
    },
});

export default ChatListSkeleton;
