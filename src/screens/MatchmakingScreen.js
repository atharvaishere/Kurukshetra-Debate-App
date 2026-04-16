import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, deleteDoc, getDoc, increment, limit } from 'firebase/firestore';
import { sendPushNotification } from '../utils/notifications';

const CATEGORIES = [
  { id: '1', name: 'Philosophy', icon: 'book' },
  { id: '2', name: 'Politics', icon: 'business' },
  { id: '3', name: 'Tech', icon: 'hardware-chip' },
  { id: '4', name: 'Sports', icon: 'football' },
  { id: '5', name: 'Movies', icon: 'film' },
];

const BET_AMOUNTS = [50, 100, 250, 500];

const MatchmakingScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [betAmount, setBetAmount] = useState(100);
  const [headline, setHeadline] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState(null);

  // Removed auto-cleanup to prevent accidental room deletion during navigation.
  // Users must explicitly press 'Cancel Search' to cancel.
  useEffect(() => {
    // Only cleanup Agora or other listeners if needed
  }, []);

  const handleSearch = async () => {
    if (!selectedCategory) {
      Alert.alert("Choose a topic", "Please select a topic category first!");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setIsSearching(true);

    try {
      // 1. Check if user has enough coins
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.data().coins < betAmount) {
        Alert.alert("Not enough coins", "You don't have enough coins for this bet.");
        setIsSearching(false);
        return;
      }

      // 2. Look for an existing waiting match (Simple query to avoid Firestore Index errors)
      const matchesRef = collection(db, 'matches');
      const q = query(matchesRef, where('status', '==', 'waiting'));

      const querySnapshot = await getDocs(q);
      let matchFound = false;

      // Try to join an existing match (filter in JS to avoid composite index error)
      for (const matchDoc of querySnapshot.docs) {
        const matchData = matchDoc.data();
        if (
          matchData.player1 !== user.uid &&
          matchData.topicId === selectedCategory.id &&
          matchData.betAmount === betAmount
        ) {
          matchFound = true;
          const matchId = matchDoc.id;

          // Deduct coins and Join Match
          await updateDoc(userRef, { coins: increment(-betAmount) });
          await updateDoc(doc(db, 'matches', matchId), {
            player2: user.uid,
            player2Name: userSnap.data().name || 'Challenger',
            status: 'active',
          });

          setIsSearching(false);
          navigation.replace('DebateRoom', { matchId, category: selectedCategory, bet: betAmount, headline: matchData.headline });
          break;
        }
      }

      // 3. If no match found, create a new one
      if (!matchFound) {
        // Deduct coins upfront
        await updateDoc(userRef, { coins: increment(-betAmount) });

        const customHeadline = headline.trim() ? headline.trim() : `${selectedCategory.name} Debate`;

        // Create room
        const newMatchRef = await addDoc(collection(db, 'matches'), {
          topicId: selectedCategory.id,
          topicName: selectedCategory.name,
          headline: customHeadline,
          betAmount: betAmount,
          status: 'waiting',
          player1: user.uid,
          player1Name: userSnap.data().name || 'Creator',
          createdAt: new Date().toISOString()
        });

        setCurrentMatchId(newMatchRef.id);

        // Send push notifications to other active users (MVP: limit to 20 users)
        try {
          const usersQuery = query(collection(db, 'users'), limit(20));
          const usersSnap = await getDocs(usersQuery);
          usersSnap.forEach((userDoc) => {
            const data = userDoc.data();
            if (userDoc.id !== user.uid && data.pushToken) {
              sendPushNotification(
                data.pushToken,
                "⚔️ A Warrior is waiting in the Arena!",
                `Topic: ${customHeadline}. Jump in and claim their bet of ${betAmount} Coins!`,
                { matchId: newMatchRef.id, screen: 'Matchmaking' }
              );
            }
          });
        } catch (pushError) {
          console.log("Error sending push notifications:", pushError);
        }

        // Listen for player 2 to join
        const unsubscribe = onSnapshot(doc(db, 'matches', newMatchRef.id), (docSnapshot) => {
          const data = docSnapshot.data();
          if (data && data.status === 'active') {
            unsubscribe(); // stop listening
            setIsSearching(false);
            navigation.replace('DebateRoom', { matchId: newMatchRef.id, category: selectedCategory, bet: betAmount, headline: customHeadline });
          }
        });
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong while matchmaking.");
      setIsSearching(false);
    }
  };

  const cancelSearch = async (matchId) => {
    try {
      // Delete the room
      if (matchId) {
        await deleteDoc(doc(db, 'matches', matchId));
      }
      // Refund coins
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { coins: increment(betAmount) });

      setIsSearching(false);
      setCurrentMatchId(null);
    } catch (error) {
      console.error("Cancel error: ", error);
    }
  };

  if (isSearching) {
    return (
      <View style={styles.searchingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.searchingText}>Waiting for a worthy opponent...</Text>
        <Text style={styles.searchingSubtext}>Topic: {selectedCategory?.name}</Text>
        <Text style={styles.searchingSubtext}>Bet: {betAmount} Coins</Text>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => cancelSearch(currentMatchId)}
        >
          <Text style={styles.cancelButtonText}>Cancel Search</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Match</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>1. Choose Topic Category</Text>
        <View style={styles.grid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                selectedCategory?.id === cat.id && styles.selectedCard
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Ionicons
                name={cat.icon}
                size={32}
                color={selectedCategory?.id === cat.id ? '#FFF' : '#FF6B6B'}
              />
              <Text style={[
                styles.categoryText,
                selectedCategory?.id === cat.id && styles.selectedText
              ]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>2. Specific Topic / Stance (Optional)</Text>
        <TextInput
          style={styles.headlineInput}
          placeholder="e.g. AI will destroy software jobs"
          placeholderTextColor="#888"
          value={headline}
          onChangeText={setHeadline}
          maxLength={50}
        />

        <Text style={styles.sectionTitle}>3. Place Your Bet</Text>
        <View style={styles.betContainer}>
          {BET_AMOUNTS.map(amount => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.betButton,
                betAmount === amount && styles.selectedBetButton
              ]}
              onPress={() => setBetAmount(amount)}
            >
              <Ionicons name="cash" size={18} color={betAmount === amount ? '#FFF' : '#FFD700'} />
              <Text style={[
                styles.betText,
                betAmount === amount && styles.selectedText
              ]}>{amount}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={handleSearch} activeOpacity={0.8}>
          <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Find Opponent</Text>
            <Ionicons name="search" size={20} color="#FFF" style={{ marginLeft: 10 }} />
          </LinearGradient>
        </TouchableOpacity>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#2D2D44',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  categoryText: {
    color: '#A0A0A0',
    marginTop: 10,
    fontWeight: 'bold',
  },
  selectedText: {
    color: '#FFF',
  },
  headlineInput: {
    backgroundColor: '#2D2D44',
    color: '#FFF',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  betContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  betButton: {
    flexDirection: 'row',
    backgroundColor: '#2D2D44',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectedBetButton: {
    backgroundColor: '#FF6B6B',
  },
  betText: {
    color: '#A0A0A0',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
    marginTop: 20,
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchingContainer: {
    flex: 1,
    backgroundColor: '#1E1E2C',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  searchingText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  searchingSubtext: {
    color: '#A0A0A0',
    fontSize: 16,
    marginTop: 10,
  },
  cancelButton: {
    marginTop: 40,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 10,
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
});

export default MatchmakingScreen;
