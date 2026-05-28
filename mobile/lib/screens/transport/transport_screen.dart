import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/transport_provider.dart';
import '../../config/theme.dart';
import 'trip_detail_screen.dart';
import 'board_scan_screen.dart';

class TransportScreen extends StatefulWidget {
  const TransportScreen({super.key});

  @override
  State<TransportScreen> createState() => _TransportScreenState();
}

class _TransportScreenState extends State<TransportScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  String _selectedDate = DateFormat('yyyy-MM-dd').format(DateTime.now());

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _loadData();
  }

  void _loadData() {
    context.read<TransportProvider>().loadTrips(date: _selectedDate);
    context.read<TransportProvider>().loadVehicles();
    context.read<TransportProvider>().loadDrivers();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<TransportProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('المواصلات'),
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: AppTheme.gold,
          labelColor: AppTheme.gold,
          unselectedLabelColor: AppTheme.textSecondary,
          tabs: const [
            Tab(text: 'الرحلات'),
            Tab(text: 'المركبات'),
            Tab(text: 'السائقين'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _buildTripsTab(prov),
          _buildVehiclesTab(prov),
          _buildDriversTab(prov),
        ],
      ),
    );
  }

  Widget _buildTripsTab(TransportProvider prov) {
    return RefreshIndicator(
      onRefresh: () async => _loadData(),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime.now().subtract(const Duration(days: 30)),
                        lastDate: DateTime.now().add(const Duration(days: 30)),
                      );
                      if (picked != null) {
                        setState(() => _selectedDate = DateFormat('yyyy-MM-dd').format(picked));
                        _loadData();
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today, size: 16, color: AppTheme.textSecondary),
                          const SizedBox(width: 8),
                          Text(_selectedDate, style: const TextStyle(color: AppTheme.textPrimary)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.qr_code_scanner, color: AppTheme.gold),
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BoardScanScreen())),
                ),
              ],
            ),
          ),
          Expanded(
            child: prov.loading
                ? const Center(child: CircularProgressIndicator())
                : prov.trips.isEmpty
                    ? const Center(child: Text('لا توجد رحلات', style: TextStyle(color: AppTheme.textSecondary)))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: prov.trips.length,
                        itemBuilder: (_, i) {
                          final t = prov.trips[i];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              title: Text(t.routeName ?? 'بدون خط', style: const TextStyle(color: AppTheme.textPrimary)),
                              subtitle: Text('${t.departureTime?.substring(0, 5) ?? "-"} → ${t.returnTime?.substring(0, 5) ?? "-"} | ${t.riderCount} راكب', style: const TextStyle(color: AppTheme.textSecondary)),
                              trailing: _statusBadge(t.status),
                              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => TripDetailScreen(trip: t))),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildVehiclesTab(TransportProvider prov) {
    if (prov.vehicles.isEmpty) return const Center(child: Text('لا توجد مركبات', style: TextStyle(color: AppTheme.textSecondary)));
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: prov.vehicles.length,
      itemBuilder: (_, i) {
        final v = prov.vehicles[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: const Icon(Icons.local_shipping, color: AppTheme.gold),
            title: Text(v.plateNumber, style: const TextStyle(color: AppTheme.textPrimary)),
            subtitle: Text('${v.model} | ${v.capacity} مقعد', style: const TextStyle(color: AppTheme.textSecondary)),
            trailing: _statusBadge(v.status),
          ),
        );
      },
    );
  }

  Widget _buildDriversTab(TransportProvider prov) {
    if (prov.drivers.isEmpty) return const Center(child: Text('لا توجد سائقين', style: TextStyle(color: AppTheme.textSecondary)));
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: prov.drivers.length,
      itemBuilder: (_, i) {
        final d = prov.drivers[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: const Icon(Icons.person, color: AppTheme.gold),
            title: Text(d.name, style: const TextStyle(color: AppTheme.textPrimary)),
            subtitle: Text(d.phone, style: const TextStyle(color: AppTheme.textSecondary)),
            trailing: _statusBadge(d.status),
          ),
        );
      },
    );
  }

  Widget _statusBadge(String status) {
    Color c;
    String label;
    switch (status) {
      case 'scheduled':
        c = Colors.blue; label = 'مجدولة'; break;
      case 'in_progress':
        c = AppTheme.gold; label = 'قيد التنفيذ'; break;
      case 'completed':
        c = AppTheme.success; label = 'مكتملة'; break;
      case 'cancelled':
        c = AppTheme.error; label = 'ملغية'; break;
      case 'active':
        c = AppTheme.success; label = 'نشط'; break;
      case 'available':
        c = AppTheme.success; label = 'متاح'; break;
      case 'on_trip':
        c = AppTheme.gold; label = 'في رحلة'; break;
      case 'off_duty':
        c = AppTheme.textSecondary; label = 'خارج الدوام'; break;
      default:
        c = AppTheme.textSecondary; label = status; break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: c.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
      child: Text(label, style: TextStyle(color: c, fontSize: 11)),
    );
  }
}
