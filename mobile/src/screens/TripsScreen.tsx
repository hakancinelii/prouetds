import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { LogOut, RefreshCw, Bus } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import TripCard from '../components/TripCard';

export default function TripsScreen() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const navigation: any = useNavigation();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const userDataStr = await SecureStore.getItemAsync('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      setUserName(userData.firstName + ' ' + userData.lastName);
    }
    fetchTrips();
  };

  const fetchTrips = async () => {
    try {
      const res = await api.getTrips();
      setTrips(res.data.trips);
    } catch (err) {
      console.error('Trips fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('userData');
    navigation.replace('Login');
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Bus size={64} color={COLORS.border} strokeWidth={1} />
      <Text style={styles.emptyText}>Henüz size atanan aktif bir sefer bulunmuyor.</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchTrips}>
        <RefreshCw size={18} color="#fff" />
        <Text style={styles.retryText}>Güncelle</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba,</Text>
          <Text style={styles.nameText}>{userName || 'Şoför'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Aktif Seferlerim</Text>
          {!loading && <Text style={styles.countText}>{trips.length} Sefer</Text>}
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Seferler yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TripCard 
                trip={item} 
                onPress={() => navigation.navigate('TripDetail', { tripId: item.id })} 
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={() => {
                  setRefreshing(true);
                  fetchTrips();
                }} 
                tintColor={COLORS.primary}
              />
            }
            ListEmptyComponent={renderEmptyList}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  nameText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '700',
    marginTop: 2,
  },
  logoutButton: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  countText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  listContent: {
    paddingBottom: 30,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: COLORS.textMuted,
    marginTop: 15,
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    width: '70%',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 30,
    alignItems: 'center',
    gap: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  }
});
