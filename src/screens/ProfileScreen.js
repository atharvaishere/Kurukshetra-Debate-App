import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../config/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [bioText, setBioText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const docRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        if (!isEditing) setBioText(data.bio || '');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      Alert.alert("Error", "Error signing out!");
    }
  };

  const handlePickImage = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow camera roll permissions to change your avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    setUploadingImage(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `avatars/${currentUser.uid}`);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress can be tracked here if needed
        },
        (error) => {
          console.error("Upload error:", error);
          setUploadingImage(false);
          Alert.alert("Upload Failed", "Could not upload image.");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await updateDoc(doc(db, 'users', currentUser.uid), {
            photoURL: downloadURL
          });
          setUploadingImage(false);
        }
      );
    } catch (error) {
      console.error(error);
      setUploadingImage(false);
      Alert.alert("Error", "Something went wrong.");
    }
  };

  const saveBio = async () => {
    if (bioText.length > 800) {
      Alert.alert("Too Long", "Bio must be less than 800 characters.");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        bio: bioText.trim()
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not save bio.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Avatar & Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePickImage} disabled={uploadingImage}>
            {userData?.photoURL ? (
              <Image source={{ uri: userData.photoURL }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={50} color="#1E1E2C" />
              </View>
            )}
            {uploadingImage ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#FFF" />
              </View>
            ) : (
              <View style={styles.editIconBadge}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.name}>{userData?.name || 'Warrior Name'}</Text>
          <Text style={styles.rank}>Rank: {userData?.rank || 'Bronze'}</Text>
        </View>

        {/* Bio Section */}
        <View style={styles.bioContainer}>
          <View style={styles.bioHeader}>
            <Text style={styles.bioTitle}>About Me</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => { setBioText(userData?.bio || ''); setIsEditing(true); }}>
                <Ionicons name="pencil" size={20} color="#FFD700" />
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View>
              <TextInput
                style={styles.bioInput}
                multiline
                maxLength={800}
                placeholder="Write your warrior code here... (Max 800 chars)"
                placeholderTextColor="#888"
                value={bioText}
                onChangeText={setBioText}
                autoFocus
              />
              <Text style={styles.charCount}>{bioText.length}/800</Text>
              <View style={styles.bioActionRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveBio}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.bioText}>
              {userData?.bio ? userData.bio : "No bio added yet. Tap the pencil icon to add one!"}
            </Text>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{userData?.wins || 0}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{userData?.losses || 0}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {userData ? Math.round((userData.wins / ((userData.wins + userData.losses) || 1)) * 100) : 0}%
            </Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>

        {/* Wallet Section */}
        <View style={styles.walletContainer}>
          <View style={styles.walletHeader}>
            <Ionicons name="wallet" size={24} color="#FFF" />
            <Text style={styles.walletTitle}>Your Treasury</Text>
          </View>
          <View style={styles.coinBalance}>
            <Ionicons name="cash" size={30} color="#FFD700" />
            <Text style={styles.coinAmount}>{userData?.coins || 0} Coins</Text>
          </View>
          <TouchableOpacity style={styles.topupButton}>
            <Text style={styles.topupText}>Get More Coins</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2C',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#A0A0A0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 15,
    borderRadius: 55,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 15,
    right: 0,
    backgroundColor: '#FF6B6B',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E1E2C',
  },
  name: {
    fontSize: 26,
    fontFamily: 'Cinzel_Bold',
    color: '#FFF',
  },
  rank: {
    fontSize: 16,
    color: '#FF6B6B',
    fontFamily: 'Inter_Bold',
    marginTop: 5,
  },
  bioContainer: {
    backgroundColor: '#25253A',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#3D3D5C',
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bioTitle: {
    fontSize: 16,
    color: '#FFD700',
    fontFamily: 'Inter_Bold',
  },
  bioText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontFamily: 'Inter_Regular',
    lineHeight: 22,
  },
  bioInput: {
    backgroundColor: '#1E1E2C',
    color: '#FFF',
    borderRadius: 10,
    padding: 15,
    minHeight: 100,
    fontFamily: 'Inter_Regular',
    fontSize: 14,
  },
  charCount: {
    color: '#A0A0A0',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 5,
  },
  bioActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  cancelText: {
    color: '#A0A0A0',
    fontFamily: 'Inter_Bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveText: {
    color: '#FFF',
    fontFamily: 'Inter_Bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2D2D44',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter_Black',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 5,
    fontFamily: 'Inter_Regular',
  },
  walletContainer: {
    backgroundColor: '#2D2D44',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  walletTitle: {
    fontSize: 18,
    fontFamily: 'Inter_Bold',
    color: '#FFF',
    marginLeft: 10,
  },
  coinBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  coinAmount: {
    fontSize: 32,
    fontFamily: 'Inter_Black',
    color: '#FFD700',
    marginLeft: 10,
  },
  topupButton: {
    backgroundColor: '#3D3D5C',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  topupText: {
    color: '#FFF',
    fontFamily: 'Inter_Bold',
  },
  logoutButton: {
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 10,
    marginBottom: 20,
  },
  logoutText: {
    color: '#FF6B6B',
    fontFamily: 'Inter_Bold',
    fontSize: 16,
  },
});

export default ProfileScreen;
