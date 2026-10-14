import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../models/case_model.dart';
import '../../providers/dashboard_provider.dart';
import '../../services/directory_service.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedMonth = '';

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedMonth = "${now.year}-${now.month.toString().padLeft(2, '0')}";
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddCourtDateDialog(List<CaseModel> cases) async {
    if (cases.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No active cases available to schedule a court date.')),
      );
      return;
    }

    final courts = await DirectoryService.getCourts();
    String selectedCaseId = cases.first.id;
    final locationController = TextEditingController(text: courts.isNotEmpty ? courts.first : 'HIGH COURT BENIN CITY');
    final descController = TextEditingController();
    DateTime selectedDate = DateTime.now().add(const Duration(days: 1));
    TimeOfDay selectedTime = const TimeOfDay(hour: 9, minute: 0);

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Row(
              children: [
                Icon(Icons.event_available, color: AppTheme.secondary),
                SizedBox(width: 8),
                Text('Schedule Court Date', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Select Case *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 4),
                  DropdownButtonFormField<String>(
                    value: selectedCaseId,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    items: cases.map((c) {
                      return DropdownMenuItem(
                        value: c.id,
                        child: Text(c.title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setDialogState(() => selectedCaseId = val);
                    },
                  ),
                  const SizedBox(height: 14),

                  const Text('Court Location / Court Name *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 4),
                  TextField(
                    controller: locationController,
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'e.g. HIGH COURT BENIN CITY',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 14),

                  const Text('Scheduled Date & Time *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: selectedDate,
                              firstDate: DateTime.now(),
                              lastDate: DateTime(2030),
                            );
                            if (picked != null) {
                              setDialogState(() => selectedDate = picked);
                            }
                          },
                          icon: const Icon(Icons.calendar_today, size: 14),
                          label: Text("${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}"),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final picked = await showTimePicker(
                              context: context,
                              initialTime: selectedTime,
                            );
                            if (picked != null) {
                              setDialogState(() => selectedTime = picked);
                            }
                          },
                          icon: const Icon(Icons.access_time, size: 14),
                          label: Text(selectedTime.format(context)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  const Text('Activity / Presiding Judge / Notes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 4),
                  TextField(
                    controller: descController,
                    maxLines: 2,
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'e.g. Hearing of Defense Motion before Hon. Justice Igbinosa',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogCtx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () async {
                  final finalDateTime = DateTime(
                    selectedDate.year,
                    selectedDate.month,
                    selectedDate.day,
                    selectedTime.hour,
                    selectedTime.minute,
                  ).toIso8601String();

                  await Provider.of<DashboardProvider>(context, listen: false).addCourtDate(
                    caseId: selectedCaseId,
                    location: locationController.text.trim(),
                    date: finalDateTime,
                    description: descController.text.trim(),
                  );

                  if (context.mounted) Navigator.pop(dialogCtx);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Court date scheduled successfully!'), backgroundColor: Colors.green),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                child: const Text('Schedule Date'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = Provider.of<DashboardProvider>(context);

    final filteredDates = dashboard.courtDates.where((item) {
      if (_selectedMonth.isNotEmpty && _selectedMonth != 'ALL') {
        if (!item.date.startsWith(_selectedMonth)) return false;
      }
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final caseObj = dashboard.cases.firstWhere(
          (c) => c.id == item.caseId,
          orElse: () => CaseModel(id: '', title: '', description: '', status: 'OPEN', clientId: ''),
        );
        final matches = item.location.toLowerCase().contains(q) ||
            (item.description?.toLowerCase().contains(q) ?? false) ||
            caseObj.title.toLowerCase().contains(q);
        if (!matches) return false;
      }
      return true;
    }).toList();

    return Scaffold(
      appBar: Navigator.canPop(context)
          ? AppBar(
              title: const Text('Court Dates Schedule'),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.pop(context),
              ),
            )
          : null,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddCourtDateDialog(dashboard.cases),
        icon: const Icon(Icons.add_task, color: Colors.white),
        label: const Text('+ Schedule / Request Court Date', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: AppTheme.secondary,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  onChanged: (v) => setState(() => _searchQuery = v),
                  decoration: InputDecoration(
                    hintText: 'Search court dates by court, case, activity...',
                    prefixIcon: const Icon(Icons.search, color: AppTheme.secondary),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.border),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      ActionChip(
                        avatar: const Icon(Icons.calendar_month, size: 14),
                        label: Text(_selectedMonth == 'ALL' ? 'All Months' : _selectedMonth),
                        onPressed: () {
                          setState(() {
                            _selectedMonth = _selectedMonth == 'ALL'
                                ? "${DateTime.now().year}-${DateTime.now().month.toString().padLeft(2, '0')}"
                                : 'ALL';
                          });
                        },
                      ),
                      const SizedBox(width: 8),
                      Chip(
                        backgroundColor: AppTheme.accentLight,
                        label: Text(
                          '${filteredDates.length} Court Dates Scheduled',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: dashboard.isLoading
                ? const Center(child: CircularProgressIndicator())
                : filteredDates.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.event_busy, size: 54, color: AppTheme.textMuted),
                            const SizedBox(height: 12),
                            const Text(
                              'No upcoming court dates found.',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primary),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _selectedMonth != 'ALL' ? 'Try switching to All Months.' : 'Court dates will appear here once scheduled.',
                              style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filteredDates.length,
                        itemBuilder: (context, index) {
                          final item = filteredDates[index];
                          final caseObj = dashboard.cases.firstWhere(
                            (c) => c.id == item.caseId,
                            orElse: () => CaseModel(id: '', title: 'General Court Hearing', description: '', status: 'OPEN', clientId: ''),
                          );
                          final formattedDate = item.date.contains('T')
                              ? item.date.split('T').first
                              : item.date;

                          return Card(
                            elevation: 2,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            margin: const EdgeInsets.only(bottom: 12),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: Colors.amber.shade100,
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Icon(Icons.gavel, color: AppTheme.primary),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              item.location,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.primary),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              caseObj.title,
                                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.secondary),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppTheme.primary.withAlpha(20),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          '📅 $formattedDate',
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (item.description != null && item.description!.isNotEmpty) ...[
                                    const SizedBox(height: 12),
                                    Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Colors.grey.shade50,
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: Colors.grey.shade200),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.info_outline, size: 14, color: AppTheme.textMuted),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              item.description!,
                                              style: const TextStyle(fontSize: 12, color: AppTheme.textDark),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
