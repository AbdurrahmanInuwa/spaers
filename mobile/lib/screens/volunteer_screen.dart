import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../api/api.dart';
import '../models/volunteer.dart';
import '../theme.dart';
import '../widgets/buttons.dart';
import '../widgets/inputs.dart';
import '../widgets/toast.dart';

const _kFields = [
  'Medical / First Aid',
  'Fire & Rescue',
  'Search & Rescue',
  'Public Safety',
  'Disaster Relief',
  'Mental Health Support',
  'Hazmat / Environmental',
  'General',
];

class VolunteerScreen extends StatefulWidget {
  const VolunteerScreen({super.key});
  @override
  State<VolunteerScreen> createState() => _VolunteerScreenState();
}

class _VolunteerScreenState extends State<VolunteerScreen> {
  bool _hydrated = false;
  Volunteer? _v;
  String? _field;
  PlatformFile? _idFile;
  bool _agreed = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await Api.instance.get('/volunteers/me');
      if (res.statusCode != 200) return;
      final data = Api.instance.decode(res);
      final raw = data['volunteer'];
      if (raw is Map<String, dynamic>) {
        _v = Volunteer.fromJson(raw);
      }
    } finally {
      if (mounted) setState(() => _hydrated = true);
    }
  }

  Future<void> _pickFile() async {
    final res = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      withData: true,
    );
    final file = res?.files.first;
    if (file == null) return;
    setState(() => _idFile = file);
  }

  Future<void> _submit() async {
    if (_field == null) {
      showToast(context, 'Choose a field of emergency', error: true);
      return;
    }
    if (_idFile == null || _idFile!.bytes == null) {
      showToast(context, 'Upload a valid government-issued ID', error: true);
      return;
    }
    if (!_agreed) {
      showToast(context, 'Please acknowledge the terms', error: true);
      return;
    }
    setState(() => _submitting = true);
    try {
      String? idFileKey;
      try {
        final ext = (_idFile!.extension ?? '').toLowerCase();
        final ct = ext == 'pdf'
            ? 'application/pdf'
            : ext == 'png'
                ? 'image/png'
                : 'image/jpeg';
        idFileKey = await uploadToS3(
          category: 'volunteer-id',
          bytes: _idFile!.bytes!,
          fileName: _idFile!.name,
          contentType: ct,
        );
      } catch (e) {
        if (!mounted) return;
        showToast(context, 'Could not upload ID', error: true);
        return;
      }
      final res = await Api.instance.post('/volunteers/apply', body: {
        'field': _field,
        'idFileName': _idFile!.name,
        'idFileKey': idFileKey,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, data['error']?.toString() ?? 'Could not submit',
            error: true);
        return;
      }
      if (data['volunteer'] is Map<String, dynamic>) {
        setState(() =>
            _v = Volunteer.fromJson(Map<String, dynamic>.from(data['volunteer'])));
      }
      if (!mounted) return;
      showToast(context, 'Application submitted');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_hydrated) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Text('Loading…',
              style: TextStyle(color: SpaersColors.slate500)),
        ),
      );
    }

    if (_v != null && _v!.status != 'revoked') {
      final approved = _v!.status == 'approved';
      return SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Volunteer',
                style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: SpaersColors.slate900)),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: approved
                    ? SpaersColors.emerald50
                    : SpaersColors.amber50,
                borderRadius: BorderRadius.circular(SpaersRadius.lg),
                border: Border.all(
                    color: approved
                        ? SpaersColors.emerald200
                        : SpaersColors.amber200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    approved
                        ? 'You are an approved volunteer'
                        : 'Your application is under review',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: approved
                          ? SpaersColors.emerald800
                          : SpaersColors.amber800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    approved
                        ? 'Field: ${_v!.field}. We may contact you when an emergency in your field needs help.'
                        : "We'll notify you once it's been processed.",
                    style: TextStyle(
                      fontSize: 13,
                      color: approved
                          ? SpaersColors.emerald700
                          : SpaersColors.amber700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Volunteer',
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: SpaersColors.slate900)),
          const SizedBox(height: 4),
          const Text(
            'Help us keep your community safer. Become a trusted volunteer responder in your neighbourhood.',
            style: TextStyle(fontSize: 13, color: SpaersColors.slate600),
          ),
          if (_v?.status == 'revoked') ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: SpaersColors.red50,
                border: Border.all(color: SpaersColors.red200),
                borderRadius: BorderRadius.circular(SpaersRadius.md),
              ),
              child: Text(
                _v?.decisionNote == null
                    ? 'Your previous application was revoked. You may re-apply.'
                    : 'Your previous application was revoked. Reason: ${_v!.decisionNote}',
                style: const TextStyle(
                    fontSize: 12, color: SpaersColors.red800),
              ),
            ),
          ],
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(SpaersRadius.lg),
              border: Border.all(color: SpaersColors.slate200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SpaersDropdown<String>(
                  label: 'Field of emergency',
                  value: _field,
                  hint: 'Select a field…',
                  items: [
                    for (final f in _kFields)
                      DropdownMenuItem(value: f, child: Text(f))
                  ],
                  onChanged: (v) => setState(() => _field = v),
                ),
                const SizedBox(height: 14),
                const Padding(
                  padding: EdgeInsets.only(bottom: 4),
                  child: Text(
                    'Government-issued ID',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: SpaersColors.slate700),
                  ),
                ),
                InkWell(
                  onTap: _pickFile,
                  borderRadius: BorderRadius.circular(SpaersRadius.md),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 12),
                    decoration: BoxDecoration(
                      color: SpaersColors.slate50,
                      border: Border.all(
                          color: SpaersColors.slate300, width: 1.4),
                      borderRadius: BorderRadius.circular(SpaersRadius.md),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            _idFile == null
                                ? 'Upload (driver license, ID, passport)'
                                : _idFile!.name,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 13, color: SpaersColors.slate600),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius:
                                BorderRadius.circular(SpaersRadius.md),
                            border: Border.all(color: SpaersColors.slate200),
                          ),
                          child: const Text(
                            'BROWSE',
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: SpaersColors.slate600,
                                letterSpacing: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                CheckboxTile(
                  value: _agreed,
                  onChanged: (v) => setState(() => _agreed = v ?? false),
                  label: const Text(
                    'I confirm that the information I provide is true, that I am at least 18 years old, and that I agree to be contacted as a volunteer responder in emergencies through SPAERS.',
                    style: TextStyle(
                        fontSize: 13, color: SpaersColors.slate700),
                  ),
                ),
                const SizedBox(height: 18),
                PrimaryButton(
                  label: _submitting ? 'Submitting…' : 'Register as volunteer',
                  onPressed: _agreed ? _submit : null,
                  loading: _submitting,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
