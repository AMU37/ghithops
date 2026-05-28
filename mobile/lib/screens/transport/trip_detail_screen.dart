import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../models/trip.dart';
import '../../providers/transport_provider.dart';
import '../../config/theme.dart';

class TripDetailScreen extends StatelessWidget {
  final Trip trip;
  const TripDetailScreen({super.key, required this.trip});

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<TransportProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('تفاصيل الرحلة')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _row('خط السير', trip.routeName ?? '-'),
                  _row('المركبة', trip.vehiclePlate ?? '-'),
                  _row('السائق', trip.driverName ?? '-'),
                  _row('التاريخ', trip.tripDate),
                  _row('وقت الانطلاق', trip.departureTime?.substring(0, 5) ?? '-'),
                  _row('وقت العودة', trip.returnTime?.substring(0, 5) ?? '-'),
                  _row('الركاب', '${trip.riderCount}'),
                  const SizedBox(height: 12),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: _statusColor(trip.status).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(_statusLabel(trip.status), style: TextStyle(color: _statusColor(trip.status), fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (trip.status == 'scheduled')
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () async {
                  try {
                    await prov.startTrip(trip.id);
                    if (context.mounted) Navigator.pop(context);
                  } catch (e) {
                    if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                  }
                },
                icon: const Icon(Icons.play_arrow),
                label: const Text('بدء الرحلة'),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success, foregroundColor: Colors.white),
              ),
            ),
          if (trip.status == 'in_progress') ...[
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () async {
                  try {
                    await prov.completeTrip(trip.id);
                    if (context.mounted) Navigator.pop(context);
                  } catch (e) {
                    if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                  }
                },
                icon: const Icon(Icons.check_circle),
                label: const Text('إنهاء الرحلة'),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success, foregroundColor: Colors.white),
              ),
            ),
            const SizedBox(height: 8),
          ],
          if (trip.status == 'scheduled' || trip.status == 'in_progress')
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('تأكيد الإلغاء'),
                      content: const Text('هل أنت متأكد من إلغاء الرحلة؟'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إلغاء')),
                        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('تأكيد')),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    await prov.cancelTrip(trip.id);
                    if (context.mounted) Navigator.pop(context);
                  }
                },
                icon: const Icon(Icons.cancel),
                label: const Text('إلغاء الرحلة'),
                style: OutlinedButton.styleFrom(foregroundColor: AppTheme.error),
              ),
            ),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Text('$label: ', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
          Text(value, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
        ],
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'scheduled': return Colors.blue;
      case 'in_progress': return AppTheme.gold;
      case 'completed': return AppTheme.success;
      case 'cancelled': return AppTheme.error;
      default: return AppTheme.textSecondary;
    }
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'scheduled': return 'مجدولة';
      case 'in_progress': return 'قيد التنفيذ';
      case 'completed': return 'مكتملة';
      case 'cancelled': return 'ملغية';
      default: return s;
    }
  }
}
