import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../config/firebase';
import { doc, onSnapshot, collection, query, where, updateDoc } from 'firebase/firestore';
import { registerForPushNotificationsAsync } from '../utils/notifications';

const HomeScreen = ({ navigation }) => {
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeMatches, setActiveMatches] = useState([]);
  const [pastMatches, setPastMatches] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Register Push Notifications
    const setupNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { pushToken: token });
        }
      } catch (error) {
        console.error("Push Notification Setup Error:", error);
      }
    };
    setupNotifications();

    const docRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCoins(docSnap.data().coins || 0);
      }
      setLoading(false);
    });

    // Listen for live active matches
    const matchesRef = collection(db, 'matches');
    const qLive = query(matchesRef, where('status', '==', 'active'));
    const unsubscribeLive = onSnapshot(qLive, (querySnapshot) => {
      const matches = [];
      querySnapshot.forEach((doc) => {
        matches.push({ id: doc.id, ...doc.data() });
      });
      setActiveMatches(matches);
    });

    // Listen for past finished matches
    const qPast = query(matchesRef, where('status', '==', 'finished'));
    const unsubscribePast = onSnapshot(qPast, (querySnapshot) => {
      const matches = [];
      querySnapshot.forEach((doc) => {
        matches.push({ id: doc.id, ...doc.data() });
      });
      setPastMatches(matches);
    });

    return () => {
      unsubscribeUser();
      unsubscribeLive();
      unsubscribePast();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome Warrior!</Text>
        <View style={styles.coinContainer}>
          <Ionicons name="cash" size={20} color="#FFD700" />
          {loading ? (
            <ActivityIndicator size="small" color="#FFD700" style={{ marginLeft: 5 }} />
          ) : (
            <Text style={styles.coinText}>{coins}</Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.navigate('Matchmaking')} activeOpacity={0.8}>
          <LinearGradient colors={['#FF6B6B', '#D93838']} style={styles.challengeCard}>
            <Ionicons name="flash" size={40} color="#FFF" />
            <Text style={styles.cardTitle}>Quick Match</Text>
            <Text style={styles.cardSubtitle}>Enter the arena and find a worthy opponent</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Live Debates ({activeMatches.length})</Text>

        {activeMatches.length === 0 ? (
          <View style={styles.noMatchContainer}>
            <Ionicons name="eye-off-outline" size={40} color="#555" />
            <Text style={styles.noMatchText}>No live debates right now.</Text>
            <Text style={styles.noMatchSub}>Start a quick match!</Text>
          </View>
        ) : (
          activeMatches.map((match) => (
            <View key={match.id} style={styles.liveCard}>
              <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
              <Text style={styles.topicText}>[{match.topicName}] {match.headline || `${match.topicName} Debate`}</Text>
              <View style={styles.vsContainer}>
                <Text style={styles.playerText}>{match.player1Name || 'Player 1'}</Text>
                <Text style={styles.vsText}> VS </Text>
                <Text style={styles.playerText}>{match.player2Name || 'Player 2'}</Text>
              </View>
              <TouchableOpacity
                style={styles.spectateButton}
                onPress={() => navigation.navigate('Spectator', { matchId: match.id, topicName: match.headline || match.topicName })}
              >
                <Text style={styles.spectateText}>Spectate & Vote</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Past Debates ({pastMatches.length})</Text>

        {pastMatches.length === 0 ? (
          <View style={styles.noMatchContainer}>
            <Ionicons name="time-outline" size={40} color="#555" />
            <Text style={styles.noMatchText}>No history yet.</Text>
          </View>
        ) : (
          pastMatches.slice().reverse().map((match) => (
            <View key={match.id} style={[styles.liveCard, styles.pastCard]}>
              <Text style={[styles.topicText, styles.pastTopicText]}>[{match.topicName}] {match.headline || `${match.topicName} Debate`}</Text>
              <View style={styles.vsContainer}>
                <Text style={styles.playerText}>{match.player1Name || 'Player 1'}</Text>
                <Text style={[styles.vsText, styles.pastVsText]}> VS </Text>
                <Text style={styles.playerText}>{match.player2Name || 'Player 2'}</Text>
              </View>
              <TouchableOpacity
                style={styles.viewResultsButton}
                onPress={() => navigation.navigate('Results', { matchData: match, bet: match.betAmount })}
              >
                <Text style={styles.spectateText}>View AI Verdict</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2C',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontFamily: 'Cinzel_Bold',
    color: '#FFF',
    letterSpacing: 1,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinText: {
    fontFamily: 'Inter_Bold',
    color: '#FFD700',
    fontSize: 16,
    marginLeft: 5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  challengeCard: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 26,
    fontFamily: 'Cinzel_Bold',
    marginTop: 10,
    letterSpacing: 1,
  },
  cardSubtitle: {
    color: '#FFE0E0',
    fontSize: 14,
    fontFamily: 'Inter_Regular',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Cinzel_Bold',
    color: '#FFF',
    marginBottom: 15,
    letterSpacing: 1,
  },
  liveCard: {
    backgroundColor: '#25253A',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3D3D5C',
  },
  liveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomLeftRadius: 15,
  },
  liveBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Inter_Black',
    letterSpacing: 1,
  },
  topicText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_Bold',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 5,
  },
  vsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  playerText: {
    color: '#A0A0A0',
    fontSize: 16,
    fontFamily: 'Inter_Bold',
    flex: 1,
    textAlign: 'center',
  },
  vsText: {
    color: '#FFD700',
    fontSize: 18,
    fontFamily: 'Cinzel_Bold',
    marginHorizontal: 10,
  },
  spectateButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  spectateText: {
    color: '#FFF',
    fontFamily: 'Inter_Bold',
    fontSize: 15,
  },
  viewResultsButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  pastCard: {
    opacity: 0.7,
    borderColor: '#3D3D5C',
    borderWidth: 1,
  },
  pastTopicText: {
    color: '#A0A0A0',
  },
  pastVsText: {
    color: '#555',
  },
  noMatchContainer: {
    backgroundColor: '#25253A',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D3D5C',
    borderStyle: 'dashed',
  },
  noMatchText: {
    color: '#A0A0A0',
    fontSize: 16,
    fontFamily: 'Inter_Bold',
    marginTop: 10,
  },
  noMatchSub: {
    color: '#777',
    fontSize: 14,
    fontFamily: 'Inter_Regular',
    marginTop: 5,
  }
});

export default HomeScreen;
