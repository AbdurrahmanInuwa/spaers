import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/auth_provider.dart';
import '../theme.dart';
import '../utils/countries.dart';
import '../widgets/info_card.dart';
import '../widgets/toast.dart';
import 'change_password_screen.dart';
import 'delete_account_screen.dart';
import 'two_factor_screen.dart';

const _kMaxAvatarBytes = 2 * 1024 * 1024;

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String? _avatarUrl;
  bool _hydratedAvatar = false;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _resolveAvatar();
  }

  @override
  void didUpdateWidget(covariant ProfileScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    _resolveAvatar();
  }

  Future<void> _resolveAvatar() async {
    final user = context.read<AuthProvider>().user;
    final key = user?.avatarKey;
    if (key == null) {
      setState(() {
        _avatarUrl = null;
        _hydratedAvatar = true;
      });
      return;
    }
    final url = await getSignedDownloadUrl(key);
    if (!mounted) return;
    setState(() {
      _avatarUrl = url;
      _hydratedAvatar = true;
    });
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    if (bytes.length > _kMaxAvatarBytes) {
      if (!mounted) return;
      showToast(context, 'Image must be under 2 MB', error: true);
      return;
    }
    setState(() => _uploading = true);
    // Capture provider + user before any awaits so we don't reuse BuildContext.
    if (!mounted) return;
    final auth = context.read<AuthProvider>();
    final user = auth.user!;
    try {
      final ext = picked.name.split('.').last.toLowerCase();
      final ct = ext == 'png' ? 'image/png' : 'image/jpeg';
      final key = await uploadToS3(
        category: 'avatar',
        bytes: bytes,
        fileName: picked.name,
        contentType: ct,
        ownerId: user.id,
      );
      final res = await Api.instance
          .patch('/citizens/me/avatar', body: {'avatarKey': key});
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, 'Could not save avatar', error: true);
        return;
      }
      auth.patch(user.copyWith(avatarKey: key));
      await _resolveAvatar();
      if (!mounted) return;
      showToast(context, 'Photo updated');
    } catch (e) {
      if (!mounted) return;
      showToast(context, 'Upload failed', error: true);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _removeAvatar() async {
    final res =
        await Api.instance.patch('/citizens/me/avatar', body: {'avatarKey': null});
    if (res.statusCode < 200 || res.statusCode >= 300) {
      if (!mounted) return;
      showToast(context, 'Could not remove avatar', error: true);
      return;
    }
    if (!mounted) return;
    final user = context.read<AuthProvider>().user!;
    context.read<AuthProvider>().patch(user.copyWith(clearAvatarKey: true));
    setState(() => _avatarUrl = null);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    if (user == null || !_hydratedAvatar) return const SizedBox.shrink();

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Stack(
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: SpaersColors.brand,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x1F000000),
                        blurRadius: 12,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: _avatarUrl != null
                      ? Image.network(_avatarUrl!, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _initialsAvatar(user.initials))
                      : _initialsAvatar(user.initials),
                ),
                Positioned(
                  right: 4,
                  bottom: 4,
                  child: Material(
                    color: SpaersColors.brand,
                    shape: const CircleBorder(),
                    elevation: 2,
                    child: InkWell(
                      onTap: _uploading ? null : _pickAvatar,
                      customBorder: const CircleBorder(),
                      child: const SizedBox(
                        width: 36,
                        height: 36,
                        child: Icon(Icons.photo_camera,
                            size: 18, color: Colors.white),
                      ),
                    ),
                  ),
                ),
                if (_uploading)
                  Positioned.fill(
                    child: Container(
                      decoration: const BoxDecoration(
                          color: Colors.black54, shape: BoxShape.circle),
                      alignment: Alignment.center,
                      child: const SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(Colors.white),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              '${user.firstName} ${user.lastName}',
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: SpaersColors.slate900,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Center(
            child: Text(user.email,
                style: const TextStyle(
                    fontSize: 13, color: SpaersColors.slate500)),
          ),
          if (user.spaersId != null) ...[
            const SizedBox(height: 12),
            Center(child: _idChip(user.spaersId!)),
          ],
          if (_avatarUrl != null) ...[
            const SizedBox(height: 8),
            Center(
              child: TextButton(
                onPressed: _removeAvatar,
                child: const Text('Remove photo',
                    style: TextStyle(
                        fontSize: 12, color: SpaersColors.slate400)),
              ),
            ),
          ],
          const SizedBox(height: 24),
          SectionCard(
            title: 'Personal',
            accent: SpaersColors.brand,
            tiles: [
              DetailTile(
                  label: 'Name', value: '${user.firstName} ${user.lastName}'),
              DetailTile(label: 'Email', value: user.email),
              DetailTile(
                  label: 'Phone',
                  value: formatPhone(user.phone, user.country)),
              DetailTile(
                  label: 'Age',
                  value:
                      user.ageYears != null ? '${user.ageYears}' : '—'),
            ],
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Security',
            accent: SpaersColors.slate500,
            action: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) =>
                      ChangePasswordScreen(email: user.email),
                ),
              ),
              style: TextButton.styleFrom(
                foregroundColor: Colors.white,
                backgroundColor: SpaersColors.brand,
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 4),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(SpaersRadius.md),
                ),
              ),
              child: const Text('Change password',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1)),
            ),
            tiles: [
              const DetailTile(label: 'Password', value: '••••••••'),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'TWO-FACTOR AUTH',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: SpaersColors.slate400,
                        letterSpacing: 1.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          user.twoFactorEnabled ? 'Enabled' : 'Disabled',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: user.twoFactorEnabled
                                ? SpaersColors.emerald600
                                : SpaersColors.slate500,
                          ),
                        ),
                        const Spacer(),
                        OutlinedButton(
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => TwoFactorScreen(
                                  currentlyEnabled: user.twoFactorEnabled),
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: SpaersColors.slate700,
                            side: const BorderSide(
                                color: SpaersColors.slate300),
                            shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(SpaersRadius.md),
                            ),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 4),
                          ),
                          child: Text(
                            user.twoFactorEnabled ? 'Disable' : 'Enable',
                            style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Medical',
            accent: SpaersColors.emerald500,
            tiles: [
              DetailTile(
                label: 'Blood group',
                value: user.bloodGroup ?? '—',
                highlight: user.bloodGroup != null,
              ),
              DetailTile(label: 'Allergies', value: user.allergies ?? '—'),
              DetailTile(
                  label: 'Chronic condition',
                  value: user.chronicCondition ?? '—'),
              DetailTile(
                  label: 'Implanted device',
                  value: user.implantDevice ? 'Yes' : 'No'),
            ],
          ),
          const SizedBox(height: 24),
          // Danger zone
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(SpaersRadius.xl),
              border: Border.all(color: SpaersColors.rose200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
                  decoration: const BoxDecoration(
                    color: SpaersColors.rose50,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(SpaersRadius.xl),
                      topRight: Radius.circular(SpaersRadius.xl),
                    ),
                  ),
                  child: Row(
                    children: const [
                      CircleAvatar(
                          radius: 4,
                          backgroundColor: SpaersColors.rose500),
                      SizedBox(width: 8),
                      Text('DANGER ZONE',
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: SpaersColors.rose700,
                              letterSpacing: 1.5)),
                    ],
                  ),
                ),
                Padding(
                  padding:
                      const EdgeInsets.fromLTRB(20, 12, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Delete account',
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: SpaersColors.slate900)),
                      const SizedBox(height: 4),
                      const Text(
                        'Permanently remove your SPAERS account, medical profile, and family membership. This cannot be undone.',
                        style: TextStyle(
                            fontSize: 12, color: SpaersColors.slate500),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(
                              builder: (_) => const DeleteAccountScreen()),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: SpaersColors.rose700,
                          side: const BorderSide(
                              color: SpaersColors.rose200),
                          shape: RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(SpaersRadius.md),
                          ),
                        ),
                        child: const Text('Delete account',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _initialsAvatar(String initials) {
    return Container(
      color: SpaersColors.brand,
      alignment: Alignment.center,
      child: Text(
        initials,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 36,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }

  Widget _idChip(String spaersId) {
    return InkWell(
      onTap: () async {
        await Clipboard.setData(ClipboardData(text: spaersId));
        if (!mounted) return;
        showToast(context, 'SPAERS ID copied');
      },
      borderRadius: BorderRadius.circular(40),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: SpaersColors.brand.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(40),
          border: Border.all(
              color: SpaersColors.brand.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('ID',
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: SpaersColors.brand,
                    letterSpacing: 1.4)),
            const SizedBox(width: 6),
            Text(spaersId,
                style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: SpaersColors.brand)),
            const SizedBox(width: 6),
            const Icon(Icons.content_copy,
                size: 12, color: SpaersColors.brand),
          ],
        ),
      ),
    );
  }
}
