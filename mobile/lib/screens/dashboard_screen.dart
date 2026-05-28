import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../config/theme.dart';
import 'transport/transport_screen.dart';
import 'ai_assistant/ai_chat_screen.dart';
import 'notifications/notifications_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _overview;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService().get('/ai/analytics/overview/');
      if (mounted) setState(() => _overview = data);
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      appBar: AppBar(
        title: const Text('GhithOps'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
          ),
          PopupMenuButton(
            itemBuilder: (_) => [
              PopupMenuItem(
                child: const Text('تسجيل خروج'),
                onTap: () {
                  context.read<AuthProvider>().logout();
                  Navigator.pushReplacementNamed(context, '/login');
                },
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('مرحباً ${user?['full_name'] ?? ''}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
            const SizedBox(height: 4),
            Text('نظرة عامة على النظام', style: const TextStyle(color: AppTheme.textSecondary)),
            const SizedBox(height: 20),
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else
              ..._buildStats(),
            const SizedBox(height: 24),
            const Text('الأقسام', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
            const SizedBox(height: 12),
            _buildSectionCard('المواصلات', Icons.local_shipping, AppTheme.gold, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TransportScreen()))),
            _buildSectionCard('المساعد الذكي', Icons.smart_toy, AppTheme.success, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AiChatScreen()))),
            _buildSectionCard('الإشعارات', Icons.notifications, AppTheme.warning, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()))),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildStats() {
    if (_overview == null) return [];
    final stats = [
      {'label': 'المستخدمين', 'value': '${_overview!['users'] ?? 0}', 'icon': Icons.people, 'color': Colors.blue},
      {'label': 'رحلات اليوم', 'value': '${_overview!['trips_today'] ?? 0}', 'icon': Icons.route, 'color': AppTheme.gold},
      {'label': 'المركبات النشطة', 'value': '${_overview!['active_vehicles'] ?? 0}', 'icon': Icons.local_shipping, 'color': Colors.green},
      {'label': 'السائقين', 'value': '${_overview!['active_drivers'] ?? 0}', 'icon': Icons.person, 'color': Colors.purple},
    ];
    return [
      GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 1.6,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: stats.length,
        itemBuilder: (_, i) => Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(stats[i]['icon'] as IconData, color: stats[i]['color'] as Color, size: 20),
                const Spacer(),
                Text(stats[i]['value'] as String, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                Text(stats[i]['label'] as String, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              ],
            ),
          ),
        ),
      ),
    ];
  }

  Widget _buildSectionCard(String title, IconData icon, Color color, VoidCallback onTap) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(title, style: const TextStyle(color: AppTheme.textPrimary)),
        trailing: const Icon(Icons.chevron_left, color: AppTheme.textSecondary),
        onTap: onTap,
      ),
    );
  }
}
