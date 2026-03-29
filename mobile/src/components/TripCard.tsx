import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Calendar, Clock, MapPin, Truck, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

interface TripCardProps {
  trip: any;
  onPress: () => void;
}

export default function TripCard({ trip, onPress }: TripCardProps) {
  const isSent = trip.status === 'SENT';
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.idContainer}>
          <Text style={styles.idText}>#{trip.firmTripNumber || trip.id.slice(0, 6)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isSent ? COLORS.success + '20' : COLORS.warning + '20' }]}>
          {isSent ? <CheckCircle2 size={12} color={COLORS.success} /> : <AlertCircle size={12} color={COLORS.warning} />}
          <Text style={[styles.statusText, { color: isSent ? COLORS.success : COLORS.warning }]}>
            {isSent ? 'UETDS GÖNDERİLDİ' : 'TASLAK'}
          </Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.dot} />
        <View style={styles.line} />
        <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
        
        <View style={styles.locations}>
          <Text style={styles.locationText} numberOfLines={1}>
            {trip.groups?.[0]?.originPlace || 'Başlangıç Noktası'}
          </Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {trip.groups?.[0]?.destPlace || 'Varış Noktası'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.infoItem}>
          <Calendar size={14} color={COLORS.textMuted} />
          <Text style={styles.infoText}>{new Date(trip.departureDate).toLocaleDateString('tr-TR')}</Text>
        </View>
        <View style={styles.infoItem}>
          <Clock size={14} color={COLORS.textMuted} />
          <Text style={styles.infoText}>{trip.departureTime}</Text>
        </View>
        <View style={styles.infoItem}>
          <Truck size={14} color={COLORS.textMuted} />
          <Text style={styles.infoText}>{trip.vehiclePlate || 'Plaka Belirtilmedi'}</Text>
        </View>
        <ChevronRight size={18} color={COLORS.border} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  idContainer: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  idText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  routeContainer: {
    flexDirection: 'row',
    height: 60,
    marginBottom: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    zIndex: 1,
  },
  line: {
    position: 'absolute',
    left: 3.5,
    top: 8,
    bottom: 8,
    width: 1,
    backgroundColor: COLORS.border,
    borderStyle: 'dashed',
  },
  locations: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  locationText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    opacity: 0.9,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
});
