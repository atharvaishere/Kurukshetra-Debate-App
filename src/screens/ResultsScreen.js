import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../config/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

const ResultsScreen = ({ navigation, route }) => {
  const { matchData, bet } = route.params;
  const [scaleAnim] = useState(new Animated.Value(0));
  const [processed, setProcessed] = useState(false);

  const currentUser = auth.currentUser;
  const isWinner = matchData.results.winnerUid === currentUser.uid;
  const isTie = matchData.results.winnerUid === 'tie';

  const prizePool = bet * 2;
  const myScore = currentUser.uid === matchData.player1 ? matchData.results.score1 : matchData.results.score2;
  const oppScore = currentUser.uid === matchData.player1 ? matchData.results.score2 : matchData.results.score1;

  useEffect(() => {
    // Process coins only once
    const processRewards = async () => {
      if (processed) return;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        if (isWinner) {
          await updateDoc(userRef, {
            coins: increment(prizePool),
            wins: increment(1)
          });
        } else if (isTie) {
          // Refund the bet
          await updateDoc(userRef, {
            coins: increment(bet)
          });
        } else {
          // Loser just gets a loss added
          await updateDoc(userRef, {
            losses: increment(1)
          });
        }
        setProcessed(true);
      } catch (error) {
        console.error("Error updating rewards:", error);
      }
    };

    processRewards();

    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.winnerCard, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={isWinner ? ['#FFD700', '#FF8C00'] : (isTie ? ['#A0A0A0', '#555'] : ['#FF6B6B', '#D93838'])}
          style={styles.gradientCard}
        >
          <Ionicons name={isWinner ? "trophy" : (isTie ? "hand-left" : "sad-outline")} size={80} color="#FFF" />
          <Text style={styles.winnerText}>
            {isWinner ? "Victory!" : (isTie ? "It's a Tie!" : "Defeated")}
          </Text>
          <Text style={styles.coinsText}>
            {isWinner ? `+${prizePool} Coins` : (isTie ? `Refunded ${bet} Coins` : `Lost ${bet} Coins`)}
          </Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.breakdownContainer}>
        <Text style={styles.breakdownTitle}>AI Judge's Verdict</Text>

        <View style={styles.reasoningBox}>
          <Text style={styles.reasoningText}>"{matchData.results.reasoning}"</Text>
        </View>

        {/* AI Score */}
        <View style={styles.scoreRow}>
          <View style={styles.scoreBars}>
            <View style={styles.scoreBarGroup}>
              <Text style={styles.scoreNumber}>{myScore}</Text>
              <View style={[styles.bar, { width: `${myScore}%`, backgroundColor: '#4CAF50' }]} />
              <Text style={styles.playerName}>You</Text>
            </View>
            <View style={styles.scoreBarGroup}>
              <Text style={styles.scoreNumber}>{oppScore}</Text>
              <View style={[styles.bar, { width: `${oppScore}%`, backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.playerName}>Opp</Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation.replace('MainApp')}
      >
        <Text style={styles.homeButtonText}>Return to Arena</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2C',
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  winnerCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  gradientCard: {
    width: '90%',
    paddingVertical: 40,
    borderRadius: 20,
    alignItems: 'center',
  },
  winnerText: {
    color: '#FFF',
    fontSize: 42,
    fontFamily: 'Cinzel_Bold',
    marginTop: 15,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  coinsText: {
    color: '#FFF',
    fontSize: 24,
    fontFamily: 'Inter_Black',
    marginTop: 10,
  },
  breakdownContainer: {
    width: '100%',
    backgroundColor: '#25253A',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: '#3D3D5C',
  },
  breakdownTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontFamily: 'Cinzel_Bold',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 1,
  },
  reasoningBox: {
    backgroundColor: '#1E1E2C',
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderColor: '#FFD700',
  },
  reasoningText: {
    color: '#E0E0E0',
    fontSize: 15,
    fontFamily: 'Inter_Regular',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  scoreRow: {
    marginBottom: 10,
  },
  scoreBars: {
    width: '100%',
  },
  scoreBarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  playerName: {
    color: '#A0A0A0',
    width: 50,
    textAlign: 'right',
    fontFamily: 'Inter_Bold',
  },
  scoreNumber: {
    color: '#FFF',
    width: 40,
    fontFamily: 'Inter_Black',
    fontSize: 16,
  },
  bar: {
    height: 14,
    borderRadius: 7,
    flex: 1,
    marginHorizontal: 12,
  },
  homeButton: {
    backgroundColor: '#4CAF50',
    width: '100%',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  homeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Inter_Bold',
    letterSpacing: 1,
  },
});

export default ResultsScreen;
