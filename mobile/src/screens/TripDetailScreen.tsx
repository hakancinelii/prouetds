import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  FlatList,
  RefreshControl,
  Platform
} from 'react-native';
import { 
  ArrowLeft, 
  UserPlus, 
  Camera, 
  Send, 
  Download, 
  MapPin, 
  Users, 
  Truck,
  CheckCircle2,
  MoreVertical,
  ChevronDown
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';

export default function TripDetailScreen() {
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const navigation: any = useNavigation();
  const route: any = useRoute();
  const { tripId } = route.params;

  useEffect(() => {
    fetchTripDetails();
  }, []);

  const fetchTripDetails = async () => {
    try {
      const res = await api.getTripDetail(tripId);
      setTrip(res.data);
    } catch (err) {
      console.error('Trip detail fetch failed:', err);
      Alert.alert('Hata', 'Sefer detayları alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToUetds = async () => {
    Alert.alert(
      'UETDS Bildirimi',
      'Bu seferi UETDS sistemine göndermek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Gönder', 
          style: 'default',
          onPress: async () => {
            setSending(true);
            try {
              await api.sendToUetds(tripId);
              Alert.alert('Başarılı', 'Sefer UETDS sistemine başarıyla bildirildi!');
              fetchTripDetails();
            } catch (err: any) {
              Alert.alert('Hata', err.response?.data?.message || 'UETDS bildirimi başarısız oldu');
            } finally {
              setSending(false);
            }
          }
        }
      ]
    );
  };

  const renderPassenger = ({ item }: { item: any }) => (
    <View style={styles.passengerCard}>
      <View style={styles.passengerInfo}>
        <Text style={styles.passengerName}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.passengerId}>{item.tcPassportNo} • {item.nationalityCode}</Text>
      </View>
      <View style={styles.statusDot} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isSent = trip.status === 'SENT';

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Sefer Detayı</Text>
          <Text style={styles.headerSubtitle}>#{trip.firmTripNumber || tripId.slice(0, 8)}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <MoreVertical size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        stickyHeaderIndices={[1]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTripDetails} tintColor={COLORS.primary} />}
      >
        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.tripSummary}>
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Truck size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Araç Plakası</Text>
                <Text style={styles.infoValue}>{trip.vehiclePlate}</Text>
              </View>
            </View>
            <View style={[styles.infoRow, { marginTop: 15 }]}>
              <View style={[styles.iconBox, { backgroundColor: COLORS.secondary + '20' }]}>
                <MapPin size={20} color={COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Güzergah</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {trip.groups?.[0]?.originPlace} → {trip.groups?.[0]?.destPlace}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary + '20' }]}>
                <Camera size={24} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionText}>Pasaport Okut</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <UserPlus size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.actionText}>Yolcu Ekle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '20' }]}>
                <Download size={24} color={COLORS.warning} />
              </View>
              <Text style={styles.actionText}>Belge Al</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Passenger List Header */}
        <View style={styles.listHeader}>
          <View style={styles.listHeaderInner}>
            <Users size={18} color={COLORS.text} />
            <Text style={styles.listTitle}>Yolcu Listesi</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{trip.groups?.reduce((acc: any, g: any) => acc + (g.passengers?.length || 0), 0)}</Text>
            </View>
          </View>
        </View>

        {/* Passenger Cards */}
        <View style={styles.listContent}>
          {trip.groups?.map((group: any) => (
            <View key={group.id}>
              {group.passengers?.map((p: any) => renderPassenger({ item: p }))}
            </View>
          ))}
          {(!trip.groups || trip.groups.reduce((acc: any, g: any) => acc + (g.passengers?.length || 0), 0) === 0) && (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>Henüz yolcu eklenmemiş.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Action Button - Only if not sent */}
      {!isSent ? (
        <TouchableOpacity 
          style={styles.floatingButton} 
          onPress={handleSendToUetds}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.floatingButtonText}>UETDS BİLDİRİMİ YAP</Text>
              <Send size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={[styles.floatingButton, { backgroundColor: COLORS.success + '40', borderWidth: 0 }]}>
          <CheckCircle2 size={20} color={COLORS.success} />
          <Text style={[styles.floatingButtonText, { color: COLORS.success, marginLeft: 10 }]}>UETDS'YE BİLDİRİLDİ</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '700',
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: 20,
  },
  tripSummary: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.background,
  },
  listHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  badge: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  passengerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  passengerId: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  emptyList: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyListText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    height: 65,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  }
});
