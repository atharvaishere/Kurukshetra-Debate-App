import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, PermissionsAndroid, Platform, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../config/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from 'react-native-agora';

// Replace with your actual Agora App ID from Agora Console or .env
const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID;

const DebateRoomScreen = ({ navigation, route }) => {
  const { matchId, bet, category } = route.params || { matchId: 'testChannel', bet: 100, category: { name: 'Test' } };

  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds per round for MVP testing
  const [currentRound, setCurrentRound] = useState(1);
  const [isMyTurn, setIsMyTurn] = useState(true);

  // Agora States
  const agoraEngineRef = useRef(null);
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const isDebateFinishedRef = useRef(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const chatRef = collection(db, 'matches', matchId, 'chat');
    const q = query(chatRef, orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Setup Agora and Permissions on mount
    setupVideoCall();

    return () => {
      // Cleanup on unmount
      if (agoraEngineRef.current) {
        agoraEngineRef.current.leaveChannel();
        agoraEngineRef.current.release();
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (!isJoined) return; // Only start timer when joined

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTurnSwitch();
          return 10; // reset to 10 secs
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isMyTurn, currentRound, isJoined]);

  const setupVideoCall = async () => {
    try {
      if (Platform.OS === 'android') {
        await getPermission();
      }

      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;

      agoraEngine.registerEventHandler({
        onJoinChannelSuccess: () => {
          console.log('Successfully joined the channel');
          setIsJoined(true);
        },
        onUserJoined: (_connection, Uid) => {
          console.log('Remote user joined with uid ' + Uid);
          setRemoteUid(Uid);
        },
        onUserOffline: (_connection, Uid) => {
          if (isDebateFinishedRef.current) return; // Prevent abort alert if debate is already finished
          console.log('Remote user left the channel. uid: ' + Uid);
          setRemoteUid(0);
          Alert.alert("Opponent Left", "Your opponent has disconnected from the arena. Match aborted.", [
            { text: "OK", onPress: () => navigation.replace('MainApp') }
          ]);
        },
      });

      agoraEngine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      agoraEngine.enableVideo();
      agoraEngine.startPreview();
      setIsEngineReady(true);

      // Join the channel using matchId
      agoraEngine.joinChannel('', matchId, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Could not connect to video server");
    }
  };

  const getPermission = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);
    }
  };

  const handleTurnSwitch = () => {
    setIsMyTurn(!isMyTurn);
    if (!isMyTurn) {
      if (currentRound < 3) {
        setCurrentRound(prev => prev + 1);
      } else {
        isDebateFinishedRef.current = true; // Mark as finished so we don't trigger the abort error
        Alert.alert("Video Debate Finished", "Time for the final closing statements!", [
          { text: "OK", onPress: () => {
              if (agoraEngineRef.current) {
                agoraEngineRef.current.leaveChannel();
              }
              navigation.replace('FinalArgument', { matchId, category, bet });
            }
          }
        ]);
      }
    }
  };

  const handleForfeit = () => {
    Alert.alert(
      "Surrender?",
      "If you leave, you will lose your bet coins. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Forfeit", style: "destructive", onPress: () => {
            if (agoraEngineRef.current) {
              agoraEngineRef.current.leaveChannel();
            }
            navigation.goBack();
          }
        }
      ]
    );
  };

  const toggleMic = () => {
    if (agoraEngineRef.current) {
      agoraEngineRef.current.muteLocalAudioStream(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (agoraEngineRef.current) {
      agoraEngineRef.current.muteLocalVideoStream(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.roundText}>Round {currentRound}/3: {currentRound === 1 ? 'Opening' : currentRound === 2 ? 'Rebuttal' : 'Closing'}</Text>
        <TouchableOpacity style={styles.forfeitButton} onPress={handleForfeit}>
          <Text style={styles.forfeitText}>Surrender</Text>
        </TouchableOpacity>
      </View>

      <LinearGradient colors={['#1E1E2C', '#0F0F1A']} style={styles.timerContainer}>
        <Ionicons name="time" size={24} color={timeLeft < 30 ? '#FF6B6B' : '#FFD700'} />
        <Text style={[styles.timerText, timeLeft < 30 && { color: '#FF6B6B' }]}>
          {formatTime(timeLeft)}
        </Text>
      </LinearGradient>

      <Text style={styles.turnIndicator}>
        {!isJoined ? "Connecting to Arena..." : (isMyTurn ? "Your Turn to Speak" : "Opponent is Speaking...")}
      </Text>

      {/* Opponent Video Feed */}
      <View style={[styles.videoContainer, !isMyTurn && styles.activeSpeaker]}>
        {remoteUid !== 0 ? (
          <React.Fragment>
            <RtcSurfaceView canvas={{ uid: remoteUid }} style={styles.videoStream} />
            <Text style={styles.floatingName}>Opponent</Text>
            {!isMyTurn && <Ionicons name="mic" size={20} color="#4CAF50" style={styles.micIcon} />}
          </React.Fragment>
        ) : (
          <View style={styles.placeholderVideo}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.playerName}>Waiting for Opponent...</Text>
          </View>
        )}
      </View>

      {/* My Video Feed */}
      <View style={[styles.videoContainer, isMyTurn && styles.activeSpeaker]}>
        {isEngineReady && isJoined && !isVideoOff ? (
          <React.Fragment>
            <RtcSurfaceView canvas={{ uid: 0 }} style={styles.videoStream} />
            <Text style={styles.floatingName}>You</Text>
            {isMyTurn && <Ionicons name="mic" size={20} color="#4CAF50" style={styles.micIcon} />}
          </React.Fragment>
        ) : (
          <View style={styles.placeholderVideo}>
            <Ionicons name={isVideoOff ? "videocam-off" : "person"} size={60} color="#555" />
            <Text style={styles.playerName}>{isVideoOff ? "Camera Off" : "Loading..."}</Text>
          </View>
        )}
      </View>

      {/* Live Chat Overlay for Debaters */}
      <View style={styles.chatOverlay}>
        <FlatList
          data={messages}
          inverted
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.chatMessage}>
              <Text style={styles.chatUser}>{item.userName}: </Text>
              <Text style={styles.chatText}>{item.text}</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlButton, isMuted && styles.controlButtonOff]} onPress={toggleMic}>
          <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, isVideoOff && styles.controlButtonOff]} onPress={toggleVideo}>
          <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={28} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.reportButton}>
          <Ionicons name="warning" size={24} color="#FFF" />
          <Text style={styles.reportText}>Report</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  roundText: {
    color: '#FFD700',
    fontSize: 20,
    fontFamily: 'Cinzel_Bold',
  },
  forfeitButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  forfeitText: {
    color: '#FF6B6B',
    fontFamily: 'Inter_Bold',
    fontSize: 14,
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 80,
    borderRadius: 25,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  timerText: {
    color: '#FFD700',
    fontSize: 28,
    fontFamily: 'Inter_Black',
    marginLeft: 10,
    letterSpacing: 2,
  },
  turnIndicator: {
    textAlign: 'center',
    color: '#A0A0A0',
    fontSize: 16,
    fontFamily: 'Inter_Bold',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  videoContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: '#1E1E2C',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#2D2D44',
  },
  activeSpeaker: {
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
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
    fontSize: 16,
    fontFamily: 'Inter_Bold',
  },
  floatingName: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Inter_Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  micIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#1E1E2C',
    paddingBottom: 40,
  },
  controlButton: {
    backgroundColor: '#3D3D5C',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonOff: {
    backgroundColor: '#FF6B6B',
  },
  reportButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 120, // Above the controls
    left: 20,
    right: 20,
    height: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 10,
    zIndex: 100,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  chatUser: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 14,
  },
  chatText: {
    color: '#FFF',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});

export default DebateRoomScreen;
