import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _api = ApiService();
  List<dynamic> _notifications = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await _api.get('/notifications/');
      final list = data['results'] ?? data;
      if (mounted) setState(() => _notifications = list is List ? list : []);
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _markRead(String id) async {
    try {
      await _api.post('/notifications/$id/mark_read/');
      _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الإشعارات'),
        actions: [
          TextButton(
            onPressed: () async {
              try {
                await _api.post('/notifications/mark_all_read/');
                _load();
              } catch (_) {}
            },
            child: const Text('تحديد الكل مقروء', style: TextStyle(color: AppTheme.gold)),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _notifications.isEmpty
                ? const Center(child: Text('لا توجد إشعارات', style: TextStyle(color: AppTheme.textSecondary)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _notifications.length,
                    itemBuilder: (_, i) {
                      final n = _notifications[i];
                      final isUnread = n['status'] == 'unread';
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        color: isUnread ? AppTheme.gold.withOpacity(0.05) : null,
                        child: ListTile(
                          leading: Icon(
                            isUnread ? Icons.circle : Icons.check_circle_outline,
                            color: isUnread ? AppTheme.gold : AppTheme.textSecondary,
                            size: 20,
                          ),
                          title: Text(n['title'] ?? '', style: TextStyle(color: AppTheme.textPrimary, fontWeight: isUnread ? FontWeight.bold : FontWeight.normal)),
                          subtitle: n['body'] != null ? Text(n['body'], style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)) : null,
                          trailing: isUnread
                              ? TextButton(
                                  onPressed: () => _markRead(n['id']),
                                  child: const Text('قراءة', style: TextStyle(color: AppTheme.gold, fontSize: 12)),
                                )
                              : null,
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
