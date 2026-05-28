import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';

class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key});

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final _api = ApiService();
  List<Map<String, String>> _messages = [];
  bool _loading = false;
  String? _chatId;

  Future<void> _sendMessage() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    _msgCtrl.clear();
    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _loading = true;
    });

    try {
      final res = await _api.post('/ai/chats/chat/', body: {
        'message': text,
        if (_chatId != null) 'chat_id': _chatId,
      });
      setState(() {
        _chatId = res['chat_id'];
        _messages.add({'role': 'assistant', 'content': res['reply'] ?? ''});
      });
    } catch (e) {
      setState(() => _messages.add({'role': 'assistant', 'content': 'حدث خطأ: $e'}));
    }
    setState(() => _loading = false);
    _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('المساعد الذكي')),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.smart_toy, size: 64, color: AppTheme.textSecondary),
                        SizedBox(height: 16),
                        Text('مرحباً بك في المساعد الذكي', style: TextStyle(color: AppTheme.textPrimary, fontSize: 18)),
                        SizedBox(height: 8),
                        Text('اسألني عن أي شيء', style: TextStyle(color: AppTheme.textSecondary)),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) {
                      final m = _messages[i];
                      final isUser = m['role'] == 'user';
                      return Align(
                        alignment: isUser ? Alignment.centerLeft : Alignment.centerRight,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: isUser ? AppTheme.gold.withOpacity(0.2) : AppTheme.card,
                            borderRadius: BorderRadius.circular(16).copyWith(
                              bottomLeft: isUser ? const Radius.circular(4) : const Radius.circular(16),
                              bottomRight: isUser ? const Radius.circular(16) : const Radius.circular(4),
                            ),
                          ),
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                          child: Text(m['content'] ?? '', style: TextStyle(color: isUser ? AppTheme.textPrimary : AppTheme.textPrimary)),
                        ),
                      );
                    },
                  ),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(8),
              child: SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _msgCtrl,
                    decoration: const InputDecoration(
                      hintText: 'اكتب رسالتك...',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send, color: AppTheme.gold),
                  onPressed: _loading ? null : _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
