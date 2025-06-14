import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import Toast from 'react-native-toast-message';

// Import types and utilities
import { CalendarEvent } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

interface CalendarExporterProps {
  visible: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  selectedDate: string;
}

type ExportFormat = 'pdf' | 'csv' | 'ics';
type ExportRange = 'day' | 'week' | 'month' | 'all';

const CalendarExporter: React.FC<CalendarExporterProps> = ({
  visible,
  onClose,
  events,
  selectedDate,
}) => {
  const { t, i18n } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [selectedRange, setSelectedRange] = useState<ExportRange>('month');
  const [isExporting, setIsExporting] = useState(false);
  
  const isRtl = isRTL(i18n.language);

  const getFilteredEvents = (): CalendarEvent[] => {
    const currentDate = new Date(selectedDate);
    
    switch (selectedRange) {
      case 'day':
        return events.filter(event => {
          const eventDate = format(parseISO(event.start_date), 'yyyy-MM-dd');
          return eventDate === selectedDate;
        });
      
      case 'week':
        // Get events for current week
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        return events.filter(event => {
          const eventDate = parseISO(event.start_date);
          return eventDate >= weekStart && eventDate <= weekEnd;
        });
      
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        
        return events.filter(event => {
          const eventDate = parseISO(event.start_date);
          return eventDate >= monthStart && eventDate <= monthEnd;
        });
      
      case 'all':
      default:
        return events;
    }
  };

  const generateCSV = (filteredEvents: CalendarEvent[]): string => {
    const headers = [
      t('calendar.event'),
      t('common.description'),
      t('calendar.startDate'),
      t('calendar.endDate'),
      t('common.location'),
      t('calendar.type'),
      t('calendar.attendees')
    ];

    const csvContent = [
      headers.join(','),
      ...filteredEvents.map(event => [
        `"${event.title}"`,
        `"${event.description || ''}"`,
        `"${format(parseISO(event.start_date), 'yyyy-MM-dd HH:mm')}"`,
        `"${format(parseISO(event.end_date), 'yyyy-MM-dd HH:mm')}"`,
        `"${event.location || ''}"`,
        `"${t(`calendar.types.${event.type}`)}"`,
        `"${event.attendees?.length || 0}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  };

  const generateICS = (filteredEvents: CalendarEvent[]): string => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Life Makers Pirates//Calendar//EN',
      'CALSCALE:GREGORIAN',
      ...filteredEvents.flatMap(event => [
        'BEGIN:VEVENT',
        `UID:${event.id}@lifemakerspirates.com`,
        `DTSTART:${format(parseISO(event.start_date), "yyyyMMdd'T'HHmmss'Z'")}`,
        `DTEND:${format(parseISO(event.end_date), "yyyyMMdd'T'HHmmss'Z'")}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description || ''}`,
        `LOCATION:${event.location || ''}`,
        `CREATED:${format(parseISO(event.created_at), "yyyyMMdd'T'HHmmss'Z'")}`,
        'END:VEVENT'
      ]),
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  };

  const exportCalendar = async () => {
    try {
      setIsExporting(true);
      
      const filteredEvents = getFilteredEvents();
      
      if (filteredEvents.length === 0) {
        Alert.alert(
          t('calendar.export.noEvents'),
          t('calendar.export.noEventsMessage')
        );
        return;
      }

      let content: string;
      let fileName: string;
      let mimeType: string;

      const dateRange = selectedRange === 'day' ? selectedDate : 
                       selectedRange === 'month' ? format(new Date(selectedDate), 'yyyy-MM') :
                       format(new Date(), 'yyyy-MM-dd');

      switch (selectedFormat) {
        case 'csv':
          content = generateCSV(filteredEvents);
          fileName = `calendar-${dateRange}.csv`;
          mimeType = 'text/csv';
          break;
        
        case 'ics':
          content = generateICS(filteredEvents);
          fileName = `calendar-${dateRange}.ics`;
          mimeType = 'text/calendar';
          break;
        
        case 'pdf':
          // For PDF, we'll create a simple HTML content and convert it
          // This is a simplified version - in production, you'd use a proper PDF library
          Alert.alert(
            t('calendar.export.pdfNotSupported'),
            t('calendar.export.pdfNotSupportedMessage')
          );
          return;
        
        default:
          throw new Error('Unsupported format');
      }

      // Save file to device
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: t('calendar.export.shareCalendar'),
        });
      } else {
        Alert.alert(
          t('calendar.export.success'),
          t('calendar.export.savedTo', { path: fileUri })
        );
      }

      Toast.show({
        type: 'success',
        text1: t('calendar.export.success'),
        text2: t('calendar.export.exported', { count: filteredEvents.length }),
      });

      onClose();

    } catch (error) {
      console.error('Export error:', error);
      Toast.show({
        type: 'error',
        text1: t('calendar.export.failed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderFormatOption = (format: ExportFormat, icon: string, label: string) => (
    <TouchableOpacity
      key={format}
      style={[
        styles.optionButton,
        selectedFormat === format && styles.optionButtonSelected,
        isRtl && styles.optionButtonRtl
      ]}
      onPress={() => setSelectedFormat(format)}
    >
      <Ionicons 
        name={icon as any} 
        size={24} 
        color={selectedFormat === format ? '#ffffff' : '#667eea'} 
      />
      <Text style={[
        styles.optionText,
        selectedFormat === format && styles.optionTextSelected,
        { textAlign: getTextAlign(i18n.language) }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRangeOption = (range: ExportRange, label: string) => (
    <TouchableOpacity
      key={range}
      style={[
        styles.rangeButton,
        selectedRange === range && styles.rangeButtonSelected,
      ]}
      onPress={() => setSelectedRange(range)}
    >
      <Text style={[
        styles.rangeText,
        selectedRange === range && styles.rangeTextSelected,
        { textAlign: getTextAlign(i18n.language) }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={[styles.modalHeader, isRtl && styles.modalHeaderRtl]}>
            <Ionicons name="download-outline" size={24} color="#667eea" />
            <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('calendar.export.title')}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Export Format Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('calendar.export.format')}
            </Text>
            <View style={[styles.optionsContainer, isRtl && styles.optionsContainerRtl]}>
              {renderFormatOption('csv', 'document-text-outline', 'CSV')}
              {renderFormatOption('ics', 'calendar-outline', 'ICS')}
              {renderFormatOption('pdf', 'document-outline', 'PDF')}
            </View>
          </View>

          {/* Date Range Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('calendar.export.range')}
            </Text>
            <View style={[styles.rangeContainer, isRtl && styles.rangeContainerRtl]}>
              {renderRangeOption('day', t('calendar.day'))}
              {renderRangeOption('week', t('calendar.week'))}
              {renderRangeOption('month', t('calendar.month'))}
              {renderRangeOption('all', t('common.all'))}
            </View>
          </View>

          {/* Export Info */}
          <View style={styles.infoSection}>
            <Text style={[styles.infoText, { textAlign: getTextAlign(i18n.language) }]}>
              {t('calendar.export.eventsCount', { count: getFilteredEvents().length })}
            </Text>
          </View>

          {/* Export Button */}
          <TouchableOpacity
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            onPress={exportCalendar}
            disabled={isExporting}
          >
            <Ionicons 
              name={isExporting ? "hourglass-outline" : "download-outline"} 
              size={20} 
              color="#ffffff" 
            />
            <Text style={styles.exportButtonText}>
              {isExporting ? t('calendar.export.exporting') : t('calendar.export.export')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionsContainerRtl: {
    flexDirection: 'row-reverse',
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#667eea',
    backgroundColor: '#f8f9fa',
  },
  optionButtonSelected: {
    backgroundColor: '#667eea',
  },
  optionButtonRtl: {
    flexDirection: 'row-reverse',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 8,
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  rangeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rangeContainerRtl: {
    flexDirection: 'row-reverse',
  },
  rangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  rangeButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  rangeText: {
    fontSize: 14,
    color: '#666',
  },
  rangeTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 8,
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CalendarExporter;
