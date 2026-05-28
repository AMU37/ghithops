import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/transport_provider.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';

class BoardScanScreen extends StatefulWidget {
  const BoardScanScreen({super.key});

  @override
  State<BoardScanScreen> createState() => _BoardScanScreenState();
}

class _BoardScanScreenState extends State<BoardScanScreen> {
  final _scannerCtrl = MobileScannerController();
  final _codeCtrl = TextEditingController();
  String? _selectedTripId;
  List<Map<String, dynamic>> _trips = [];
  String? _lastResult;
  bool _scanning = true;

  @override
  void initState() {
    super.initState();
    _loadTrips();
  }

  Future<void> _loadTrips() async {
    try {
      final data = await ApiService().get('/transport/trips/?date=${DateFormat('yyyy-MM-dd').format(DateTime.now())}');
      final list = data['results'] ?? data;
      if (mounted) setState(() => _trips = (list is List ? list : []).cast<Map<String, dynamic>>());
      if (_trips.isNotEmpty) _selectedTripId = _trips.first['id'];
    } catch (_) {}
  }

  Future<void> _boardByCode(String code) async {
    if (_selectedTripId == null || code.isEmpty) return;
    setState(() => _lastResult = 'جاري المعالجة...');
    try {
      final res = await context.read<TransportProvider>().boardByCode(_selectedTripId!, code);
      if (mounted) {
        setState(() => _lastResult = res['message'] ?? res['error'] ?? 'تم');
        if (res['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(res['message'] ?? 'تم التسجيل'), backgroundColor: AppTheme.success),
          );
        }
      }
    } catch (e) {
      if (mounted) setState(() => _lastResult = 'خطأ: $e');
    }
  }

  @override
  void dispose() {
    _scannerCtrl.dispose();
    _codeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('تسجيل الركوب')),
      body: Column(
        children: [
          if (_trips.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: DropdownButtonFormField<String>(
                value: _selectedTripId,
                decoration: const InputDecoration(labelText: 'الرحلة'),
                dropdownColor: AppTheme.surface,
                items: _trips.map<DropdownMenuItem<String>>((t) => DropdownMenuItem<String>(
                  value: t['id'],
                  child: Text(t['route_name'] ?? t['id'], style: const TextStyle(color: AppTheme.textPrimary)),
                )).toList(),
                onChanged: (v) => setState(() => _selectedTripId = v),
              ),
            ),
          Expanded(
            child: _scanning
                ? Stack(
                    children: [
                      MobileScanner(
                        controller: _scannerCtrl,
                        onDetect: (capture) {
                          final code = capture.barcodes.first.rawValue;
                          if (code != null) {
                            _boardByCode(code);
                            setState(() => _scanning = false);
                          }
                        },
                      ),
                      Container(
                        margin: const EdgeInsets.all(40),
                        decoration: BoxDecoration(
                          border: Border.all(color: AppTheme.gold, width: 2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ],
                  )
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (_lastResult != null) Text(_lastResult!, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () => setState(() { _scanning = true; _lastResult = null; }),
                          icon: const Icon(Icons.qr_code_scanner),
                          label: const Text('مسح مرة أخرى'),
                        ),
                      ],
                    ),
                  ),
          ),
          if (!_scanning)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _codeCtrl,
                      decoration: const InputDecoration(labelText: 'أو أدخل الكود يدوياً', hintText: 'كود الموظف'),
                      style: const TextStyle(color: AppTheme.textPrimary),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () => _boardByCode(_codeCtrl.text.trim()),
                    child: const Text('تسجيل'),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
