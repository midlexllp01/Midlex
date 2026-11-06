import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../models/case_model.dart';
import '../../models/message_model.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../config/api_config.dart';

class ChatScreen extends StatefulWidget {
  final CaseModel caseModel;

  const ChatScreen({super.key, required this.caseModel});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  List<MessageModel> _messages = [];
  bool _isLoading = true;
  bool _aiMode = true;

  @override
  void initState() {
    super.initState();
    _fetchMessages();
  }

  Future<void> _fetchMessages() async {
    try {
      final data = await ApiService.get('${ApiConfig.messages}?caseId=${widget.caseModel.id}');
      if (data is List) {
        setState(() {
          _messages = data.map((e) => MessageModel.fromJson(e)).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleTakeover(dynamic user) async {
    setState(() {
      _aiMode = false;
    });
    final takeoverNotice = '👨‍⚖️ ${user?.name ?? 'Legal Counsel'} (${user?.role ?? 'LAWYER'}) has officially taken over this chat. Midlex AI Assistant is now paused.';
    try {
      await ApiService.post(ApiConfig.messages, {
        'caseId': widget.caseModel.id,
        'content': takeoverNotice,
      });
      await _fetchMessages();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('You have taken over this chat. Midlex AI Assistant paused.'),
            backgroundColor: AppTheme.primary,
          ),
        );
      }
    } catch (e) {
      // Ignore network fallback
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    try {
      await ApiService.post(ApiConfig.messages, {
        'caseId': widget.caseModel.id,
        'content': text,
      });
      await _fetchMessages();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send message: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = Provider.of<AuthProvider>(context).user;
    final isStaff = currentUser?.isAdmin == true || currentUser?.isLawyer == true;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.caseModel.client?.name ?? 'Client matter', style: const TextStyle(fontSize: 16)),
            Text('${widget.caseModel.title} · Client + Litigation Team', style: const TextStyle(fontSize: 12, color: AppTheme.secondary)),
          ],
        ),
      ),
      body: Column(
        children: [
          // AI Status Banner & Takeover Action
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: _aiMode ? const Color(0xFFEFF6FF) : const Color(0xFFF3F4F6),
            child: Row(
              children: [
                Icon(
                  _aiMode ? Icons.smart_toy : Icons.gavel,
                  color: _aiMode ? Colors.blue.shade700 : AppTheme.primary,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _aiMode
                        ? '🤖 AI Legal Assistant active (Auto-responding)'
                        : '👨‍⚖️ Lawyer Human Takeover Active (AI Paused)',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: _aiMode ? Colors.blue.shade900 : AppTheme.textDark,
                    ),
                  ),
                ),
                if (isStaff && _aiMode)
                  ElevatedButton(
                    onPressed: () => _handleTakeover(currentUser),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.secondary,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text('Take Over', style: TextStyle(fontSize: 12, color: Colors.white)),
                  ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? const Center(child: Text('No messages in this case discussion yet.'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg.senderId == currentUser?.id;
                          final isSystem = msg.senderId == 'system' || (msg.content ?? '').contains('taken over');
                          
                          if (isSystem) {
                            return Container(
                              margin: const EdgeInsets.symmetric(vertical: 8),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.amber.shade50,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: Colors.amber.shade300),
                              ),
                              child: Text(
                                msg.content ?? '',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                              ),
                            );
                          }

                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: isMe ? AppTheme.primary : AppTheme.accentLight,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Column(
                                crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                children: [
                                  if (!isMe && msg.sender?.name != null)
                                    Text(
                                      '${msg.sender!.name}${msg.sender!.role.isNotEmpty ? ' · ${msg.sender!.role.toLowerCase()}' : ''}',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.secondary),
                                    ),
                                  Text(
                                    msg.content ?? '',
                                    style: TextStyle(color: isMe ? Colors.white : AppTheme.textDark, fontSize: 14),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    style: const TextStyle(color: AppTheme.textDark, fontSize: 14),
                    decoration: const InputDecoration(
                      hintText: 'Type your message...',
                      hintStyle: TextStyle(color: AppTheme.textMuted),
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send, color: AppTheme.primary),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
