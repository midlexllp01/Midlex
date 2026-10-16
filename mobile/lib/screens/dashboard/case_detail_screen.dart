import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../models/case_model.dart';
import '../../models/case_timeline_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dashboard_provider.dart';
import '../../widgets/status_chip.dart';
import 'chat_screen.dart';
import 'notifications_screen.dart';

class CaseDetailScreen extends StatefulWidget {
  final CaseModel caseModel;

  const CaseDetailScreen({super.key, required this.caseModel});

  @override
  State<CaseDetailScreen> createState() => _CaseDetailScreenState();
}

class _CaseDetailScreenState extends State<CaseDetailScreen> {
  late String _currentTitle;
  late String _currentDescription;
  List<CaseTimelineModel> _timeline = [];
  bool _isLoadingTimeline = true;

  @override
  void initState() {
    super.initState();
    _currentTitle = widget.caseModel.title;
    _currentDescription = widget.caseModel.description;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchTimeline();
    });
  }

  Future<void> _fetchTimeline() async {
    if (!mounted) return;
    setState(() => _isLoadingTimeline = true);
    try {
      final list = await Provider.of<DashboardProvider>(context, listen: false)
          .fetchCaseTimeline(widget.caseModel.id);
      if (mounted) {
        setState(() {
          _timeline = list.map((e) => CaseTimelineModel.fromJson(e)).toList();
        });
      }
    } catch (e) {
      debugPrint('Error fetching timeline: $e');
    } finally {
      if (mounted) setState(() => _isLoadingTimeline = false);
    }
  }

  void _showAddTimelineDialog() {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    String selectedStatus = 'IN_PROGRESS';
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Row(
                children: [
                  Icon(Icons.timeline, color: AppTheme.secondary),
                  SizedBox(width: 8),
                  Text('Add Case Update', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Update Title *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: titleController,
                      decoration: InputDecoration(
                        hintText: 'e.g. Defense Motion Filed',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text('Status Milestone', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: selectedStatus,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'OPEN', child: Text('Case Matter Registered (Filing)')),
                        DropdownMenuItem(value: 'IN_PROGRESS', child: Text('In Progress')),
                        DropdownMenuItem(value: 'HEARING', child: Text('Court Hearing / Trial')),
                        DropdownMenuItem(value: 'PENDING', child: Text('Pending Review')),
                        DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
                        DropdownMenuItem(value: 'CLOSED', child: Text('Closed & Resolved')),
                      ],
                      onChanged: (val) {
                        if (val != null) setDialogState(() => selectedStatus = val);
                      },
                    ),
                    const SizedBox(height: 14),
                    const Text('Description & Notes', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: descController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: 'Details of what occurred during this milestone...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.pop(dialogContext),
                  child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.secondary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final title = titleController.text.trim();
                          if (title.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Update title cannot be empty.')),
                            );
                            return;
                          }
                          final messenger = ScaffoldMessenger.of(context);
                          final navigator = Navigator.of(dialogContext);
                          final provider = Provider.of<DashboardProvider>(context, listen: false);
                          setDialogState(() => isSubmitting = true);
                          try {
                            await provider.addTimelineEvent(
                              caseId: widget.caseModel.id,
                              title: title,
                              description: descController.text.trim(),
                              status: selectedStatus,
                            );
                            if (mounted) {
                              navigator.pop();
                              _fetchTimeline();
                              messenger.showSnackBar(
                                const SnackBar(
                                  content: Text('Timeline update added successfully!'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            }
                          } catch (e) {
                            setDialogState(() => isSubmitting = false);
                            messenger.showSnackBar(
                              SnackBar(content: Text('Failed to add timeline: $e')),
                            );
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Post Update'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showEditTitleDialog() {
    final titleController = TextEditingController(text: _currentTitle);
    final descController = TextEditingController(text: _currentDescription);
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Row(
                children: [
                  Icon(Icons.edit_note, color: AppTheme.primary),
                  SizedBox(width: 8),
                  Text('Edit Case Title', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Case Title *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: titleController,
                      decoration: InputDecoration(
                        hintText: 'Enter case title',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Case Summary / Description', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: descController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: 'Enter description...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.pop(dialogContext),
                  child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.secondary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final newTitle = titleController.text.trim();
                          final newDesc = descController.text.trim();
                          if (newTitle.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Case title cannot be empty.')),
                            );
                            return;
                          }
                          final messenger = ScaffoldMessenger.of(context);
                          final navigator = Navigator.of(dialogContext);
                          setDialogState(() => isSubmitting = true);
                          try {
                            await Provider.of<DashboardProvider>(context, listen: false).updateCaseTitle(
                              caseId: widget.caseModel.id,
                              title: newTitle,
                              description: newDesc,
                            );
                            if (mounted) {
                              setState(() {
                                _currentTitle = newTitle;
                                _currentDescription = newDesc;
                              });
                            }
                            navigator.pop();
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text('Case title updated successfully!'),
                                backgroundColor: Colors.green,
                              ),
                            );
                          } catch (e) {
                            setDialogState(() => isSubmitting = false);
                            messenger.showSnackBar(
                              SnackBar(content: Text('Failed to update title: $e')),
                            );
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Save Changes'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final isStaff = authProvider.user?.role == 'ADMIN' || authProvider.user?.role == 'LAWYER';

    return Scaffold(
      appBar: AppBar(
        title: Text(_currentTitle),
        actions: [
          Consumer<DashboardProvider>(
            builder: (context, db, child) {
              return IconButton(
                icon: Stack(
                  children: [
                    const Icon(Icons.notifications_outlined),
                    if (db.unreadNotificationCount > 0)
                      Positioned(
                        right: 0,
                        top: 0,
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                          constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                          child: Text(
                            '${db.unreadNotificationCount}',
                            style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                ),
                tooltip: 'Notifications',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const NotificationsScreen()),
                  );
                },
              );
            },
          ),
          if (isStaff)
            IconButton(
              icon: const Icon(Icons.edit),
              tooltip: 'Edit Case Title',
              onPressed: _showEditTitleDialog,
            ),
          IconButton(
            icon: const Icon(Icons.chat_bubble_outline),
            tooltip: 'Case Messages',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ChatScreen(caseModel: widget.caseModel),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                StatusChip(status: widget.caseModel.status),
                if (widget.caseModel.createdAt != null)
                  Text(
                    'Created: ${widget.caseModel.createdAt!.split('T').first}',
                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Text(
                    _currentTitle,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                  ),
                ),
                if (isStaff)
                  IconButton(
                    icon: const Icon(Icons.edit_note, color: AppTheme.secondary),
                    tooltip: 'Edit Case Title',
                    onPressed: _showEditTitleDialog,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Case Summary',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primary),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _currentDescription,
                      style: const TextStyle(fontSize: 14, color: AppTheme.textDark, height: 1.5),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Timeline Card Section
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.timeline, color: AppTheme.secondary, size: 22),
                            SizedBox(width: 8),
                            Text(
                              'Case Timeline',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primary),
                            ),
                          ],
                        ),
                        if (isStaff)
                          IconButton(
                            icon: const Icon(Icons.add_circle, color: AppTheme.secondary),
                            tooltip: 'Add Timeline Update',
                            onPressed: _showAddTimelineDialog,
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_isLoadingTimeline)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(16.0),
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        ),
                      )
                    else if (_timeline.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8.0),
                        child: Text(
                          'No progress updates posted yet.',
                          style: TextStyle(fontSize: 13, color: AppTheme.textMuted, fontStyle: FontStyle.italic),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _timeline.length,
                        separatorBuilder: (context, index) => const Divider(height: 20),
                        itemBuilder: (context, index) {
                          final event = _timeline[index];
                          final formattedDate = event.date.contains('T')
                              ? event.date.split('T').first
                              : event.date;
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                margin: const EdgeInsets.only(top: 4),
                                width: 12,
                                height: 12,
                                decoration: const BoxDecoration(
                                  color: AppTheme.secondary,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            event.title,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                              color: AppTheme.textDark,
                                            ),
                                          ),
                                        ),
                                        Text(
                                          formattedDate,
                                          style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                                        ),
                                      ],
                                    ),
                                    if (event.status != null) ...[
                                      const SizedBox(height: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppTheme.secondary.withAlpha(25),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          event.status!.replaceAll('_', ' '),
                                          style: const TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.secondary,
                                          ),
                                        ),
                                      ),
                                    ],
                                    if (event.description != null && event.description!.isNotEmpty) ...[
                                      const SizedBox(height: 6),
                                      Text(
                                        event.description!,
                                        style: const TextStyle(fontSize: 13, color: Colors.black87, height: 1.3),
                                      ),
                                    ],
                                    if (event.createdByName != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        'By ${event.createdByName}',
                                        style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.person, color: AppTheme.primary),
                      title: const Text('Client', style: TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text(widget.caseModel.client?.name ?? 'Assigned Client'),
                    ),
                    const Divider(),
                    ListTile(
                      leading: const Icon(Icons.shield_outlined, color: AppTheme.secondary),
                      title: const Text('Assigned Litigation Team', style: TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text(widget.caseModel.litigationTeam.isEmpty ? 'Awaiting Team Allocation' : widget.caseModel.litigationTeam),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Case Documents',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                    ),
                    Text(
                      '${widget.caseModel.documents.length} Files',
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    final shareUrl = 'https://midlex-llp-lawfirm.vercel.app/share/case/${widget.caseModel.id}';
                    Clipboard.setData(ClipboardData(text: shareUrl));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Shareable Case Link copied to clipboard!\n$shareUrl'),
                        backgroundColor: AppTheme.primary,
                        duration: const Duration(seconds: 4),
                      ),
                    );
                  },
                  icon: const Icon(Icons.share, size: 16),
                  label: const Text('Share Case Files'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.secondary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (widget.caseModel.documents.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: Text('No documents uploaded for this case.')),
                ),
              )
            else
              ...widget.caseModel.documents.asMap().entries.map((entry) {
                final idx = entry.key + 1;
                final doc = entry.value;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppTheme.primary.withAlpha(25),
                      child: Text(
                        '#$idx',
                        style: const TextStyle(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    title: Text(
                      doc.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    subtitle: Text(
                      '${doc.type.toUpperCase()} • Shared Case File #$idx',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                    ),
                    trailing: const Icon(Icons.file_download_outlined, color: AppTheme.secondary),
                  ),
                );
              }),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      final shareUrl = 'https://midlex-llp-lawfirm.vercel.app/share/case/${widget.caseModel.id}';
                      Clipboard.setData(ClipboardData(text: shareUrl));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Shareable Case Link copied to clipboard!\n$shareUrl'),
                          backgroundColor: AppTheme.primary,
                          duration: const Duration(seconds: 4),
                        ),
                      );
                    },
                    icon: const Icon(Icons.folder_shared_rounded),
                    label: const Text('Case Files'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.secondary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ChatScreen(caseModel: widget.caseModel),
                    ),
                  );
                },
                icon: const Icon(Icons.chat),
                label: const Text('Open Case Chat'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

