import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../config/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const LeaderboardScreen = () => {
  const [filter, setFilter] = useState('Global'); // Global, Philosophy, Politics
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = collection(db, 'users');
    // Order by wins descending, limit to top 50
    const q = query(usersRef, orderBy('wins', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Calculate dynamic win rate
        const totalGames = (data.wins || 0) + (data.losses || 0);
        const winRate = totalGames > 0 ? Math.round((data.wins / totalGames) * 100) : 0;

        list.push({
          id: doc.id,
          ...data,
          winRate: `${winRate}%`
        });
      });
      setUsersData(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item, index }) => (
    <View style={styles.boardItem}>
      <Text style={styles.rankNumber}>#{index + 1}</Text>

      {item.photoURL ? (
        <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={20} color="#1E1E2C" />
        </View>
      )}

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userRank}>{item.rank || 'Bronze'}</Text>
      </View>
      <View style={styles.statsInfo}>
        <Text style={styles.winsText}>{item.wins || 0} Wins</Text>
        <Text style={styles.pointsText}>{item.coins || 0} Coins</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hall of Fame</Text>
      </View>

      <View style={styles.filterContainer}>
        {['Global', 'Philosophy', 'Politics'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.activeFilter]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={usersData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Cinzel_Bold',
    color: '#FFD700',
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2D2D44',
    marginHorizontal: 5,
  },
  activeFilter: {
    backgroundColor: '#FF6B6B',
  },
  filterText: {
    color: '#A0A0A0',
    fontFamily: 'Inter_Bold',
  },
  activeFilterText: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  boardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D44',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3D3D5C',
  },
  rankNumber: {
    color: '#FFD700',
    fontSize: 18,
    fontFamily: 'Inter_Black',
    width: 35,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A0A0A0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_Bold',
  },
  userRank: {
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: 'Inter_Bold',
    marginTop: 2,
  },
  statsInfo: {
    alignItems: 'flex-end',
  },
  winsText: {
    color: '#4CAF50',
    fontFamily: 'Inter_Bold',
    marginBottom: 2,
  },
  pointsText: {
    color: '#FFD700',
    fontSize: 12,
    fontFamily: 'Inter_Bold',
  },
});

export default LeaderboardScreen;
