import React from 'react';
import { View, StyleSheet } from 'react-native';

const BubbleSkeleton = ({ align }: { align: 'left' | 'right' }) => (
    <View style={[styles.row, align === 'right' ? styles.right : styles.left]}>
        <View style={[styles.bubble, align === 'right' ? styles.bubbleRight : styles.bubbleLeft]} />
    </View>
);

const ChatSkeleton = () => {
    return (
        <View style={styles.container}>
            <BubbleSkeleton align="left" />
            <BubbleSkeleton align="right" />
            <BubbleSkeleton align="left" />
            <BubbleSkeleton align="right" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
        flex: 1,
        justifyContent: 'flex-start',
    },
    row: {
        flexDirection: 'row',
    },
    left: {
        justifyContent: 'flex-start',
    },
    right: {
        justifyContent: 'flex-end',
    },
    bubble: {
        height: 60,
        width: '70%',
        borderRadius: 18,
        backgroundColor: '#1F1F1F',
    },
    bubbleLeft: {
        backgroundColor: '#1F1F1F',
    },
    bubbleRight: {
        backgroundColor: '#2B2B2B',
    },
});

export default ChatSkeleton;
