import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/auth_provider.dart';
import '../theme.dart';
import '../utils/geometry.dart';
import '../utils/location.dart';
import '../widgets/buttons.dart';
import '../widgets/inputs.dart';
import '../widgets/toast.dart';

/// "File a report" — the slow-path counterpart to the panic SOS button.
/// Citizen picks a type, writes a description, sets priority, optionally
/// toggles anonymous, attaches a single photo, and submits. The created
/// report fans out to institutions in coverage but NOT family/volunteers.
class NewReportScreen extends StatefulWidget {
  const NewReportScreen({super.key});
  @override
  State<NewReportScreen> createState() => _NewReportScreenState();
}

const _kTypes = ['Shooting', 'Medical', 'Assault', 'Fire', 'Flooding'];
const _kPriorities = ['low', 'medium', 'high', 'critical'];
const int _kMinDesc = 10;
const int _kMaxDesc = 1000;
const int _kMaxPhotoBytes = 5 * 1024 * 1024;
const int _kMaxVideoBytes = 30 * 1024 * 1024;

class _NewReportScreenState extends State<NewReportScreen> {
  String? _type;
  String _priority = 'medium';
  bool _anonymous = false;
  final _description = TextEditingController();

  // Location state — fetched silently on mount. The user can refresh via the
  // chip; a future iteration can add map-pick.
  LatLngPoint? _location;
  String? _address;
  bool _locationBusy = false;
  String? _locationError;

  // Single attachment per report. Either a photo OR a video.
  XFile? _photo;
  int? _photoBytes;
  String _mediaType = 'image'; // 'image' | 'video'

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _description.addListener(() => setState(() {}));
    _fetchLocation();
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _fetchLocation() async {
    if (_locationBusy) return;
    setState(() {
      _locationBusy = true;
      _locationError = null;
    });
    try {
      final res = await getCurrentLocation();
      if (!mounted) return;
      setState(() {
        _location = res.point;
        _locationBusy = false;
      });
      // Best-effort reverse geocode for display. The backend geocodes again
      // server-side at create time — this is purely for the user to confirm
      // they're filing the report at the right place.
      _fetchAddressFor(res.point);
    } on LocationDeniedException catch (e) {
      if (!mounted) return;
      setState(() {
        _locationError = e.message;
        _locationBusy = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _locationError = 'Could not get your location.';
        _locationBusy = false;
      });
    }
  }

  Future<void> _fetchAddressFor(LatLngPoint p) async {
    // Soft-fail: backend exposes /ai/place-name. If unavailable, skip.
    try {
      final res = await Api.instance.post('/ai/place-name', body: {
        'lat': p.lat,
        'lng': p.lng,
      });
      if (res.statusCode != 200) return;
      final data = Api.instance.decode(res);
      final name = data['name']?.toString();
      if (name != null && name.isNotEmpty && mounted) {
        setState(() => _address = name);
      }
    } catch (_) {}
  }

  Future<void> _pickPhoto({required ImageSource src}) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: src,
      maxWidth: 2048,
      maxHeight: 2048,
      imageQuality: 85,
    );
    if (picked == null) return;
    final bytes = await picked.length();
    if (bytes > _kMaxPhotoBytes) {
      if (!mounted) return;
      showToast(context, 'Photo must be under 5 MB', error: true);
      return;
    }
    setState(() {
      _photo = picked;
      _photoBytes = bytes;
      _mediaType = 'image';
    });
  }

  Future<void> _pickVideo({required ImageSource src}) async {
    final picker = ImagePicker();
    final picked = await picker.pickVideo(
      source: src,
      maxDuration: const Duration(seconds: 60),
    );
    if (picked == null) return;
    final bytes = await picked.length();
    if (bytes > _kMaxVideoBytes) {
      if (!mounted) return;
      showToast(context, 'Video must be under 30 MB', error: true);
      return;
    }
    setState(() {
      _photo = picked;
      _photoBytes = bytes;
      _mediaType = 'video';
    });
  }

  void _clearMedia() {
    setState(() {
      _photo = null;
      _photoBytes = null;
    });
  }

  String? get _descError {
    final n = _description.text.trim().length;
    if (n == 0) return null;
    if (n < _kMinDesc) {
      return 'Add at least ${_kMinDesc - n} more character${_kMinDesc - n == 1 ? '' : 's'}.';
    }
    if (n > _kMaxDesc) return 'Maximum $_kMaxDesc characters.';
    return null;
  }

  bool get _canSubmit {
    if (_submitting) return false;
    if (_type == null) return false;
    final n = _description.text.trim().length;
    if (n < _kMinDesc || n > _kMaxDesc) return false;
    if (_location == null) return false;
    return true;
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    // Read provider before any awaits so we don't reuse context across gaps.
    final auth = context.read<AuthProvider>();
    setState(() => _submitting = true);
    try {
      // 1. Upload the chosen media (photo OR video) via the S3 sign flow.
      final attachmentKeys = <String>[];
      if (_photo != null) {
        try {
          final bytes = await _photo!.readAsBytes();
          final ext = _photo!.name.split('.').last.toLowerCase();
          String ct;
          if (_mediaType == 'video') {
            ct = ext == 'mov'
                ? 'video/quicktime'
                : ext == 'webm'
                    ? 'video/webm'
                    : 'video/mp4';
          } else {
            ct = ext == 'png'
                ? 'image/png'
                : ext == 'webp'
                    ? 'image/webp'
                    : 'image/jpeg';
          }
          final key = await uploadToS3(
            category: 'report-media',
            bytes: bytes,
            fileName: _photo!.name,
            contentType: ct,
            ownerId: auth.user?.id,
          );
          attachmentKeys.add(key);
        } catch (e) {
          if (!mounted) return;
          showToast(
            context,
            _mediaType == 'video'
                ? 'Video upload failed — submitting without it'
                : 'Photo upload failed — submitting without it',
            error: true,
          );
        }
      }

      // 2. POST the report.
      final res = await Api.instance.post('/emergencies/report', body: {
        'type': _type,
        'description': _description.text.trim(),
        'priority': _priority,
        'anonymous': _anonymous,
        'lat': _location!.lat,
        'lng': _location!.lng,
        if (attachmentKeys.isNotEmpty) 'attachmentKeys': attachmentKeys,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, data['error']?.toString() ?? 'Could not submit report',
            error: true);
        return;
      }
      if (!mounted) return;
      final n = (data['notifiedInstitutions'] as num?)?.toInt() ?? 0;
      showToast(
        context,
        n > 0 ? 'Report sent to $n institution${n == 1 ? '' : 's'}'
              : 'Report filed',
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      showToast(context, 'Network error', error: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SpaersColors.slate50,
      appBar: AppBar(
        title: const Text('Report an incident'),
        elevation: 0,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            const Text(
              'File a report',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: SpaersColors.slate900,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'For witness reports or non-life-threatening situations. '
              'Use the SOS button instead if you are in immediate danger.',
              style: TextStyle(fontSize: 13, color: SpaersColors.slate500),
            ),
            const SizedBox(height: 18),

            _section('Emergency type', _typeChips()),
            const SizedBox(height: 18),
            _section('Description', _descField()),
            const SizedBox(height: 18),
            _section('Priority', _priorityChips()),
            const SizedBox(height: 18),
            _section('Photo or video (optional)', _photoBlock()),
            const SizedBox(height: 18),
            _section('Location', _locationBlock()),
            const SizedBox(height: 18),
            _section('Privacy', _anonymousToggle()),
            const SizedBox(height: 24),
            PrimaryButton(
              label: _submitting ? 'Sending…' : 'Submit report',
              loading: _submitting,
              onPressed: _canSubmit ? _submit : null,
            ),
            const SizedBox(height: 8),
            const Center(
              child: Text(
                'You can cancel a pending report from My Reports.',
                style: TextStyle(fontSize: 11, color: SpaersColors.slate400),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─ sections ──────────────────────────────────────────────────────────

  Widget _section(String title, Widget child) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title.toUpperCase(),
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: SpaersColors.slate500,
            letterSpacing: 1.4,
          ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }

  Widget _typeChips() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final t in _kTypes)
          _Chip(
            label: t,
            selected: _type == t,
            onTap: () => setState(() => _type = t),
          ),
      ],
    );
  }

  Widget _descField() {
    final used = _description.text.length;
    final err = _descError;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        SpaersTextField(
          label: '',
          controller: _description,
          hint: 'What is happening? Where? Anything important responders should know.',
          maxLines: 5,
          minLines: 3,
          maxLength: _kMaxDesc,
          textCapitalization: TextCapitalization.sentences,
          errorText: err,
        ),
        const SizedBox(height: 4),
        Text(
          '$used / $_kMaxDesc',
          style: TextStyle(
            fontSize: 11,
            color: used > _kMaxDesc
                ? SpaersColors.rose700
                : SpaersColors.slate400,
          ),
        ),
      ],
    );
  }

  Widget _priorityChips() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final p in _kPriorities)
          _Chip(
            label: _priorityLabel(p),
            selected: _priority == p,
            onTap: () => setState(() => _priority = p),
            color: _priorityColor(p),
          ),
      ],
    );
  }

  Widget _photoBlock() {
    if (_photo == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: _OutlineAction(
                  icon: Icons.photo_library_outlined,
                  label: 'Photo',
                  onTap: () => _pickPhoto(src: ImageSource.gallery),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _OutlineAction(
                  icon: Icons.photo_camera_outlined,
                  label: 'Camera',
                  onTap: () => _pickPhoto(src: ImageSource.camera),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _OutlineAction(
                  icon: Icons.video_library_outlined,
                  label: 'Video',
                  onTap: () => _pickVideo(src: ImageSource.gallery),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _OutlineAction(
                  icon: Icons.videocam_outlined,
                  label: 'Record',
                  onTap: () => _pickVideo(src: ImageSource.camera),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Photo up to 5 MB · Video up to 30 MB · single attachment per report.',
            style: TextStyle(fontSize: 11, color: SpaersColors.slate400),
          ),
        ],
      );
    }
    final kb = ((_photoBytes ?? 0) / 1024).round();
    final isVideo = _mediaType == 'video';
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: SpaersColors.slate200),
        borderRadius: BorderRadius.circular(SpaersRadius.lg),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(SpaersRadius.md),
            child: SizedBox(
              width: 64,
              height: 64,
              child: isVideo
                  ? Container(
                      color: SpaersColors.slate900,
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.play_circle_outline,
                        color: Colors.white,
                        size: 28,
                      ),
                    )
                  : Image.file(
                      File(_photo!.path),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: SpaersColors.slate100,
                        child: const Icon(Icons.broken_image,
                            color: SpaersColors.slate400),
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _photo!.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: SpaersColors.slate800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$kb KB · ${_mediaType.toUpperCase()}',
                  style: const TextStyle(
                      fontSize: 11, color: SpaersColors.slate500),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: _clearMedia,
            icon: const Icon(Icons.close, size: 18,
                color: SpaersColors.slate500),
            tooltip: 'Remove attachment',
          ),
        ],
      ),
    );
  }

  Widget _locationBlock() {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: SpaersColors.slate200),
        borderRadius: BorderRadius.circular(SpaersRadius.lg),
      ),
      child: Row(
        children: [
          const Icon(Icons.place_outlined,
              size: 18, color: SpaersColors.slate500),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _location == null
                      ? (_locationError ?? 'Locating…')
                      : (_address ?? 'Current location'),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: _location == null
                        ? SpaersColors.slate500
                        : SpaersColors.slate800,
                  ),
                ),
                if (_location != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    '${_location!.lat.toStringAsFixed(5)}, ${_location!.lng.toStringAsFixed(5)}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontFamily: 'monospace',
                      color: SpaersColors.slate400,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (_locationBusy)
            const Padding(
              padding: EdgeInsets.all(8),
              child: SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(SpaersColors.brand),
                ),
              ),
            )
          else
            IconButton(
              onPressed: _fetchLocation,
              tooltip: 'Refresh location',
              icon: const Icon(Icons.refresh,
                  size: 18, color: SpaersColors.slate500),
            ),
        ],
      ),
    );
  }

  Widget _anonymousToggle() {
    return InkWell(
      borderRadius: BorderRadius.circular(SpaersRadius.lg),
      onTap: () => setState(() => _anonymous = !_anonymous),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: SpaersColors.slate200),
          borderRadius: BorderRadius.circular(SpaersRadius.lg),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'Report anonymously',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: SpaersColors.slate800,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Institutions see the report without your name. '
                    'You can still see it in My Reports.',
                    style: TextStyle(
                        fontSize: 11, color: SpaersColors.slate500),
                  ),
                ],
              ),
            ),
            Switch(
              value: _anonymous,
              onChanged: (v) => setState(() => _anonymous = v),
              activeThumbColor: SpaersColors.brand,
            ),
          ],
        ),
      ),
    );
  }

  String _priorityLabel(String p) {
    switch (p) {
      case 'critical':
        return 'Critical';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
    }
    return p;
  }

  Color _priorityColor(String p) {
    switch (p) {
      case 'critical':
        return SpaersColors.brand;
      case 'high':
        return SpaersColors.rose600;
      case 'medium':
        return SpaersColors.amber800;
      case 'low':
        return SpaersColors.slate500;
    }
    return SpaersColors.slate500;
  }
}

// ─ small primitives ───────────────────────────────────────────────────

class _Chip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color? color;
  const _Chip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.color,
  });
  @override
  Widget build(BuildContext context) {
    final activeColor = color ?? SpaersColors.brand;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(SpaersRadius.md),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          padding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: selected ? activeColor : Colors.white,
            border: Border.all(
              color: selected ? activeColor : SpaersColors.slate200,
            ),
            borderRadius: BorderRadius.circular(SpaersRadius.md),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : SpaersColors.slate700,
            ),
          ),
        ),
      ),
    );
  }
}

class _OutlineAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _OutlineAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(SpaersRadius.lg),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(
              color: SpaersColors.slate200,
              style: BorderStyle.solid,
              width: 1.4),
          borderRadius: BorderRadius.circular(SpaersRadius.lg),
        ),
        child: Column(
          children: [
            Icon(icon, size: 22, color: SpaersColors.slate500),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: SpaersColors.slate700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
