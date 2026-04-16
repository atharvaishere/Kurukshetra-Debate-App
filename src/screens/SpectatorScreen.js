import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { doc, onSnapshot, collection, addDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from 'react-native-agora';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID;

const SpectatorScreen = ({ navigation, route }) => {
  const { matchId, topicName } = route.params;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [matchData, setMatchData] = useState(null);

  const agoraEngineRef = useRef(null);
  const flatListRef = useRef(null);

  const currentUser = auth.currentUser;

  useEffect(() => {
    setupAgora();
    setupFirestoreListeners();

    return () => {
      if (agoraEngineRef.current) {
        agoraEngineRef.current.leaveChannel();
        agoraEngineRef.current.release();
      }
    };
  }, []);

  const setupAgora = () => {
    try {
      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;

      agoraEngine.registerEventHandler({
        onJoinChannelSuccess: () => {
          console.log('Spectator joined the channel successfully');
        },
        onUserJoined: (_connection, Uid) => {
          console.log('Speaker joined: ', Uid);
          setRemoteUsers(prev => {
            if (!prev.includes(Uid)) return [...prev, Uid];
            return prev;
          });
        },
        onUserOffline: (_connection, Uid) => {
          console.log('Speaker left: ', Uid);
          setRemoteUsers(prev => prev.filter(id => id !== Uid));
        },
      });

      agoraEngine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      // Join as AUDIENCE (No camera/mic needed)
      agoraEngine.joinChannel('', matchId, 0, {
        clientRoleType: ClientRoleType.ClientRoleAudience,
      });

    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Could not connect to live stream.");
    }
  };

  const setupFirestoreListeners = () => {
    // 1. Listen to Match Data (To check if match ends)
    const matchUnsub = onSnapshot(doc(db, 'matches', matchId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMatchData(data);
        if (data.results) {
          Alert.alert("Debate Finished!", "The AI Judge has delivered the verdict.", [
            { text: "Leave", onPress: () => navigation.goBack() }
          ]);
        }
      } else {
        // Match was deleted or aborted
        Alert.alert("Match Aborted", "The debate has ended abruptly.", [
          { text: "Leave", onPress: () => navigation.goBack() }
        ]);
      }
    });

    // 2. Listen to Live Chat
    const chatRef = collection(db, 'matches', matchId, 'chat');
    const q = query(chatRef, orderBy('timestamp', 'asc'));
    const chatUnsub = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      // Auto-scroll to bottom
      if (flatListRef.current && msgs.length > 0) {
        setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 200);
      }
    });

    return () => {
      matchUnsub();
      chatUnsub();
    };
  };

  const sendMessage = async () => {
    if (inputText.trim().length === 0) return;
    const text = inputText.trim();
    setInputText('');

    try {
      const chatRef = collection(db, 'matches', matchId, 'chat');
      await addDoc(chatRef, {
        userId: currentUser.uid,
        userName: currentUser.email?.split('@')[0] || 'Spectator',
        text: text,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Chat error:", error);
    }
  };

  const castVote = async (playerKey) => {
    if (hasVoted) return;

    setHasVoted(true);
    try {
      const matchRef = doc(db, 'matches', matchId);
      // We will record the vote directly in the match document
      await updateDoc(matchRef, {
        [`spectatorVotes.${currentUser.uid}`]: playerKey
      });
      Alert.alert("Vote Cast!", "You earned +5 Coins for participating.");

      // Reward the spectator
      const userRef = doc(db, 'users', currentUser.uid);
      // Ideally, use increment(5) here
    } catch (error) {
      console.error("Voting error:", error);
      setHasVoted(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live: {topicName}</Text>
        <Ionicons name="eye" size={24} color="#FF6B6B" />
        <Text style={styles.viewerCount}> {remoteUsers.length > 0 ? remoteUsers.length * 3 : 0} </Text>
      </View>

      {/* Video Streams */}
      <View style={styles.videoSection}>
        {/* Player 1 Slot */}
        <View style={styles.videoBox}>
          {remoteUsers[0] ? (
            <RtcSurfaceView canvas={{ uid: remoteUsers[0] }} style={styles.videoStream} />
          ) : (
            <View style={styles.placeholderVideo}>
              <ActivityIndicator color="#FF6B6B" />
              <Text style={styles.playerName}>Waiting...</Text>
            </View>
          )}
          <View style={styles.liveIndicator}><Text style={styles.liveText}>LIVE</Text></View>
        </View>

        <View style={styles.vsBadge}><Text style={styles.vsText}>VS</Text></View>

        {/* Player 2 Slot */}
        <View style={styles.videoBox}>
          {remoteUsers[1] ? (
            <RtcSurfaceView canvas={{ uid: remoteUsers[1] }} style={styles.videoStream} />
          ) : (
            <View style={styles.placeholderVideo}>
              <ActivityIndicator color="#FF6B6B" />
              <Text style={styles.playerName}>Waiting...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Voting Section */}
      <View style={styles.votingSection}>
        <Text style={styles.votingTitle}>Who is winning?</Text>
        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={[styles.voteBtn, hasVoted && styles.voteBtnDisabled]}
            onPress={() => castVote('player1')}
            disabled={hasVoted}
          >
            <Text style={styles.voteText}>{hasVoted ? "Voted!" : "Vote Player 1"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.voteBtn, hasVoted && styles.voteBtnDisabled]}
            onPress={() => castVote('player2')}
            disabled={hasVoted}
          >
            <Text style={styles.voteText}>{hasVoted ? "Voted!" : "Vote Player 2"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Chat */}
      <View style={styles.chatSection}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.chatMessage}>
              <Text style={[styles.chatUser, item.userId === currentUser.uid && { color: '#FF6B6B' }]}>
                {item.userId === currentUser.uid ? 'You' : item.userName}:
              </Text>
              <Text style={styles.chatText}> {item.text}</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
        <View style={styles.inputArea}>
          <TextInput
            style={styles.chatInput}
            placeholder="Cheer for your side..."
            placeholderTextColor="#888"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  headerTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  viewerCount: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  videoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 250,
  },
  videoBox: {
    width: '48%',
    backgroundColor: '#1E1E2C',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  videoStream: {
    flex: 1,
  },
  placeholderVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerName: {
    color: '#A0A0A0',
    marginTop: 10,
    fontWeight: 'bold',
  },
  liveIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    zIndex: 10,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  vsBadge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -15,
    marginTop: -15,
    backgroundColor: '#FFD700',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  vsText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  votingSection: {
    padding: 15,
    backgroundColor: '#1E1E2C',
    marginVertical: 10,
  },
  votingTitle: {
    color: '#FFF',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  voteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  voteBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  voteBtnDisabled: {
    backgroundColor: '#555',
  },
  voteText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  chatSection: {
    flex: 1,
    backgroundColor: '#2D2D44',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 15,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  chatUser: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  chatText: {
    color: '#FFF',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1E1E2C',
    color: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#FF6B6B',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SpectatorScreen;