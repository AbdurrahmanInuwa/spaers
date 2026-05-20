import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/auth_provider.dart';
import '../models/family.dart';
import '../models/user.dart';
import '../theme.dart';
import '../utils/countries.dart';
import '../widgets/buttons.dart';
import '../widgets/info_card.dart';
import '../widgets/inputs.dart';
import '../widgets/toast.dart';

class FamilyScreen extends StatefulWidget {
  const FamilyScreen({super.key});
  @override
  State<FamilyScreen> createState() => _FamilyScreenState();
}

class _FamilyScreenState extends State<FamilyScreen> {
  bool _loading = true;
  FamilyState _state = FamilyState();
  bool _ack1 = false;
  bool _ack2 = false;
  bool _ackSubmitting = false;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    try {
      final res = await Api.instance.get('/family/me');
      if (res.statusCode != 200) return;
      final data = Api.instance.decode(res);
      final ackRaw = data['ackAt']?.toString();
      final fam = data['family'];
      final members = data['members'];
      final list = <FamilyMember>[];
      if (members is List) {
        for (final m in members) {
          if (m is Map<String, dynamic>) {
            list.add(FamilyMember.fromJson(m));
          }
        }
      }
      setState(() {
        _state = FamilyState(
          ackAt: ackRaw == null ? null : DateTime.tryParse(ackRaw),
          familyId: fam is Map ? fam['id']?.toString() : null,
          creatorId: fam is Map ? fam['creatorId']?.toString() : null,
          members: list,
        );
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _persistAck() async {
    setState(() => _ackSubmitting = true);
    try {
      final res = await Api.instance.post('/family/ack');
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, 'Could not save acknowledgment', error: true);
        return;
      }
      await _refresh();
    } finally {
      if (mounted) setState(() => _ackSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    if (user == null) return const SizedBox.shrink();
    if (_loading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Text('Loading…',
              style: TextStyle(color: SpaersColors.slate500)),
        ),
      );
    }
    if (_state.ackAt == null) return _ackGate();
    return _familyView(user);
  }

  Widget _ackGate() {
    final canContinue = _ack1 && _ack2;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Family',
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: SpaersColors.slate900)),
          const SizedBox(height: 4),
          const Text('Please review and acknowledge before continuing.',
              style: TextStyle(fontSize: 13, color: SpaersColors.slate500)),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(SpaersRadius.lg),
              border: Border.all(color: SpaersColors.slate200),
            ),
            child: Column(
              children: [
                CheckboxTile(
                  value: _ack1,
                  onChanged: (v) => setState(() => _ack1 = v ?? false),
                  label: const Text(
                    'You and all other members above 18 will be notified of any emergency triggered by another member of the family.',
                    style: TextStyle(
                        fontSize: 13, color: SpaersColors.slate700),
                  ),
                ),
                const SizedBox(height: 12),
                CheckboxTile(
                  value: _ack2,
                  onChanged: (v) => setState(() => _ack2 = v ?? false),
                  label: const Text(
                    'I confirm that the bio information of any person under 18 in my care may be shared with responding authorities and law enforcement in the event of an emergency.',
                    style: TextStyle(
                        fontSize: 13, color: SpaersColors.slate700),
                  ),
                ),
                const SizedBox(height: 18),
                PrimaryButton(
                  label: _ackSubmitting ? 'Saving…' : 'I acknowledge',
                  onPressed: canContinue ? _persistAck : null,
                  loading: _ackSubmitting,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _familyView(SpaersUser user) {
    final isCreator = _state.creatorId != null && _state.creatorId == user.id;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Family',
                        style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: SpaersColors.slate900)),
                    const SizedBox(height: 4),
                    Text(
                      _state.members.isEmpty
                          ? 'Add your first family member.'
                          : '${_state.members.length} member${_state.members.length == 1 ? '' : 's'} in your family.',
                      style: const TextStyle(
                          fontSize: 13, color: SpaersColors.slate500),
                    ),
                  ],
                ),
              ),
              if (isCreator && _state.members.length > 1)
                OutlinedButton(
                  onPressed: _openCallConfig,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: SpaersColors.slate700,
                    side: const BorderSide(color: SpaersColors.slate300),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(SpaersRadius.md),
                    ),
                  ),
                  child: const Text('Call alerts',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2)),
                ),
            ],
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 0.82,
            children: [
              _memberCard(_selfMember(user), isSelf: true),
              for (final m in _state.members.where((m) => m.id != user.id))
                _memberCard(m),
              _addCard(),
            ],
          ),
        ],
      ),
    );
  }

  FamilyMember _selfMember(SpaersUser user) {
    final inList = _state.members.where((m) => m.id == user.id);
    if (inList.isNotEmpty) return inList.first;
    return FamilyMember(
      id: user.id,
      spaersId: user.spaersId,
      firstName: user.firstName,
      lastName: user.lastName,
      dob: user.dob,
      email: user.email,
      phone: user.phone,
      country: user.country,
      bloodGroup: user.bloodGroup,
      allergies: user.allergies,
      chronicCondition: user.chronicCondition,
      implantDevice: user.implantDevice,
    );
  }

  Widget _memberCard(FamilyMember member, {bool isSelf = false}) {
    return InkWell(
      onTap: () => _openDetails(member, isSelf: isSelf),
      borderRadius: BorderRadius.circular(SpaersRadius.xl),
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(SpaersRadius.xl),
              border: Border.all(color: SpaersColors.slate200),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: SpaersColors.brand.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    member.initials,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: SpaersColors.brand,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${member.firstName} ${member.lastName}',
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: SpaersColors.slate900),
                ),
                const SizedBox(height: 2),
                Text(
                  isSelf
                      ? 'You'
                      : (member.ageYears != null
                          ? '${member.ageYears} yrs${member.bloodGroup != null ? ' · ${member.bloodGroup}' : ''}'
                          : (member.bloodGroup ?? '')),
                  style: const TextStyle(
                      fontSize: 11, color: SpaersColors.slate500),
                ),
                if (isSelf) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: SpaersColors.emerald50,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'YOU',
                      style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: SpaersColors.emerald700,
                          letterSpacing: 1.2),
                    ),
                  ),
                ]
              ],
            ),
          ),
          if (!isSelf)
            Positioned(
              right: 6,
              top: 6,
              child: IconButton(
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.close, size: 16),
                color: SpaersColors.slate400,
                onPressed: () => _openDelete(member),
              ),
            ),
        ],
      ),
    );
  }

  Widget _addCard() {
    return InkWell(
      onTap: _openAdd,
      borderRadius: BorderRadius.circular(SpaersRadius.xl),
      child: DottedBorderBox(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.add, size: 36, color: SpaersColors.slate400),
            SizedBox(height: 8),
            Text('ADD MEMBER',
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: SpaersColors.slate400,
                    letterSpacing: 1.2)),
          ],
        ),
      ),
    );
  }

  Future<void> _openAdd() async {
    await showDialog(
      context: context,
      builder: (_) => _AddMemberDialog(onAdded: (members) {
        setState(() => _state = FamilyState(
              ackAt: _state.ackAt,
              familyId: _state.familyId,
              creatorId: _state.creatorId,
              members: members,
            ));
        showToast(context, 'Family member added');
      }),
    );
  }

  Future<void> _openDelete(FamilyMember member) async {
    await showDialog(
      context: context,
      builder: (_) => _DeleteMemberDialog(
          member: member,
          onRemoved: (members) {
            setState(() => _state = FamilyState(
                  ackAt: _state.ackAt,
                  familyId: _state.familyId,
                  creatorId: _state.creatorId,
                  members: members,
                ));
            showToast(context,
                '${member.firstName} ${member.lastName} removed');
          }),
    );
  }

  Future<void> _openDetails(FamilyMember member, {required bool isSelf}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _MemberDetailsSheet(member: member),
    );
  }

  Future<void> _openCallConfig() async {
    await showDialog(
      context: context,
      builder: (_) => _CallConfigDialog(
        members: _state.members,
        currentUserId: context.read<AuthProvider>().user!.id,
        onSaved: (members) {
          setState(() => _state = FamilyState(
                ackAt: _state.ackAt,
                familyId: _state.familyId,
                creatorId: _state.creatorId,
                members: members,
              ));
          showToast(context, 'Call alerts updated');
        },
      ),
    );
  }
}

class DottedBorderBox extends StatelessWidget {
  final Widget child;
  const DottedBorderBox({super.key, required this.child});
  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DashedBorderPainter(),
      child: Container(
        padding: const EdgeInsets.all(16),
        alignment: Alignment.center,
        child: child,
      ),
    );
  }
}

class _DashedBorderPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = SpaersColors.slate300
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final rect = RRect.fromRectAndRadius(
      Offset.zero & size,
      const Radius.circular(SpaersRadius.xl),
    );
    final path = Path()..addRRect(rect);
    const dashWidth = 6.0;
    const dashSpace = 4.0;
    for (final m in path.computeMetrics()) {
      double dist = 0;
      while (dist < m.length) {
        final extract = m.extractPath(dist, dist + dashWidth);
        canvas.drawPath(extract, p);
        dist += dashWidth + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(_) => false;
}

// ─── Add member dialog ─────────────────────────────────────────────────

class _AddMemberDialog extends StatefulWidget {
  final ValueChanged<List<FamilyMember>> onAdded;
  const _AddMemberDialog({required this.onAdded});
  @override
  State<_AddMemberDialog> createState() => _AddMemberDialogState();
}

class _AddMemberDialogState extends State<_AddMemberDialog> {
  final _ctrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final id = _ctrl.text.trim();
    if (!RegExp(r'^\d{10}$').hasMatch(id)) {
      setState(() => _error = 'SPAERS ID must be 10 digits');
      return;
    }
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final res = await Api.instance.post('/family/me/members', body: {
        'spaersId': id,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        setState(() => _error = data['error']?.toString() ?? 'Could not add');
        return;
      }
      final raw = data['members'] as List? ?? const [];
      final list = [
        for (final m in raw)
          if (m is Map<String, dynamic>) FamilyMember.fromJson(m)
      ];
      if (mounted) {
        Navigator.of(context).pop();
        widget.onAdded(list);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Family Member'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
              'Enter the SPAERS ID of the person you want to add.',
              style: TextStyle(
                  fontSize: 12, color: SpaersColors.slate500)),
          const SizedBox(height: 12),
          TextField(
            controller: _ctrl,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(10),
            ],
            autofocus: true,
            decoration: const InputDecoration(hintText: 'e.g. 4272028775'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: SpaersColors.red50,
                border: Border.all(color: SpaersColors.red200),
                borderRadius: BorderRadius.circular(SpaersRadius.md),
              ),
              child: Text(_error!,
                  style: const TextStyle(
                      color: SpaersColors.red700, fontSize: 12)),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel')),
        FilledButton(
          onPressed: _loading ? null : _add,
          style: FilledButton.styleFrom(backgroundColor: SpaersColors.brand),
          child: Text(_loading ? 'Adding…' : 'Add'),
        ),
      ],
    );
  }
}

// ─── Delete member dialog ──────────────────────────────────────────────

class _DeleteMemberDialog extends StatefulWidget {
  final FamilyMember member;
  final ValueChanged<List<FamilyMember>> onRemoved;
  const _DeleteMemberDialog(
      {required this.member, required this.onRemoved});
  @override
  State<_DeleteMemberDialog> createState() => _DeleteMemberDialogState();
}

class _DeleteMemberDialogState extends State<_DeleteMemberDialog> {
  final _ctrl = TextEditingController();
  bool _submitting = false;
  static const _required = 'Delete member.';

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    setState(() => _submitting = true);
    try {
      final res =
          await Api.instance.delete('/family/me/members/${widget.member.id}');
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      final raw = data['members'] as List? ?? const [];
      final list = [
        for (final m in raw)
          if (m is Map<String, dynamic>) FamilyMember.fromJson(m)
      ];
      if (mounted) {
        Navigator.of(context).pop();
        widget.onRemoved(list);
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canDelete = _ctrl.text == _required;
    return AlertDialog(
      title: const Text('Remove member'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text.rich(
            TextSpan(
              text: 'To remove ',
              style: const TextStyle(
                  fontSize: 13, color: SpaersColors.slate600),
              children: [
                TextSpan(
                  text:
                      '${widget.member.firstName} ${widget.member.lastName}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: SpaersColors.slate800),
                ),
                const TextSpan(text: ', type '),
                TextSpan(
                  text: _required,
                  style: const TextStyle(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w700,
                      backgroundColor: SpaersColors.slate100),
                ),
                const TextSpan(text: ' below.'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _ctrl,
            autofocus: true,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(hintText: _required),
          ),
        ],
      ),
      actions: [
        TextButton(
            onPressed:
                _submitting ? null : () => Navigator.of(context).pop(),
            child: const Text('Cancel')),
        FilledButton(
          onPressed: !canDelete || _submitting ? null : _delete,
          style: FilledButton.styleFrom(backgroundColor: SpaersColors.brand),
          child: Text(_submitting ? 'Removing…' : 'Delete'),
        ),
      ],
    );
  }
}

// ─── Member details bottom sheet ───────────────────────────────────────

class _MemberDetailsSheet extends StatelessWidget {
  final FamilyMember member;
  const _MemberDetailsSheet({required this.member});
  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, scroll) => Container(
        decoration: const BoxDecoration(
          color: SpaersColors.slate50,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: ListView(
          controller: scroll,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: SpaersColors.slate200,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: Container(
                width: 96,
                height: 96,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: SpaersColors.brand,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  member.initials,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(
                '${member.firstName} ${member.lastName}',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: SpaersColors.slate900,
                ),
              ),
            ),
            if (member.email != null) ...[
              const SizedBox(height: 4),
              Center(
                child: Text(member.email!,
                    style: const TextStyle(
                        fontSize: 13, color: SpaersColors.slate500)),
              ),
            ],
            if (member.spaersId != null) ...[
              const SizedBox(height: 10),
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 6),
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
                      Text(member.spaersId!,
                          style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 12,
                              color: SpaersColors.brand,
                              fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            SectionCard(
              title: 'Personal',
              accent: SpaersColors.brand,
              tiles: [
                DetailTile(
                    label: 'Name',
                    value: '${member.firstName} ${member.lastName}'),
                DetailTile(label: 'Email', value: member.email ?? '—'),
                DetailTile(
                    label: 'Phone',
                    value: formatPhone(member.phone, member.country)),
                DetailTile(
                    label: 'Age',
                    value: member.ageYears != null
                        ? '${member.ageYears}'
                        : '—'),
              ],
            ),
            const SizedBox(height: 12),
            SectionCard(
              title: 'Medical',
              accent: SpaersColors.emerald500,
              tiles: [
                DetailTile(
                  label: 'Blood group',
                  value: member.bloodGroup ?? '—',
                  highlight: member.bloodGroup != null,
                ),
                DetailTile(
                    label: 'Allergies',
                    value: member.allergies ?? '—'),
                DetailTile(
                    label: 'Chronic condition',
                    value: member.chronicCondition ?? '—'),
                DetailTile(
                    label: 'Implanted device',
                    value: member.implantDevice ? 'Yes' : 'No'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Call config dialog ────────────────────────────────────────────────

class _CallConfigDialog extends StatefulWidget {
  final List<FamilyMember> members;
  final String currentUserId;
  final ValueChanged<List<FamilyMember>> onSaved;
  const _CallConfigDialog({
    required this.members,
    required this.currentUserId,
    required this.onSaved,
  });
  @override
  State<_CallConfigDialog> createState() => _CallConfigDialogState();
}

class _CallConfigDialogState extends State<_CallConfigDialog> {
  late Set<String> _selected;
  bool _saving = false;
  static const _max = 2;

  @override
  void initState() {
    super.initState();
    _selected = {
      for (final m in widget.members)
        if (m.familyCallEligible && m.id != widget.currentUserId) m.id
    };
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final res = await Api.instance.patch('/family/me/call-config', body: {
        'memberIds': _selected.toList(),
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      final raw = data['members'] as List? ?? const [];
      final list = [
        for (final m in raw)
          if (m is Map<String, dynamic>) FamilyMember.fromJson(m)
      ];
      if (mounted) {
        Navigator.of(context).pop();
        widget.onSaved(list);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final candidates =
        widget.members.where((m) => m.id != widget.currentUserId).toList();
    return AlertDialog(
      title: const Text('Call alerts'),
      content: SizedBox(
        width: 380,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Pick up to $_max family members to receive a phone call (in addition to SMS + email) when anyone triggers an SOS.',
              style: const TextStyle(
                  fontSize: 12, color: SpaersColors.slate500),
            ),
            const SizedBox(height: 8),
            Text(
              '${_selected.length} / $_max selected',
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: SpaersColors.slate500,
                  letterSpacing: 1.4),
            ),
            const SizedBox(height: 8),
            if (candidates.isEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: SpaersColors.slate50,
                  borderRadius: BorderRadius.circular(SpaersRadius.md),
                ),
                child: const Text(
                    'No other family members yet. Add one first.',
                    style: TextStyle(
                        fontStyle: FontStyle.italic,
                        color: SpaersColors.slate500)),
              )
            else
              for (final m in candidates) _row(m),
          ],
        ),
      ),
      actions: [
        TextButton(
            onPressed: _saving ? null : () => Navigator.of(context).pop(),
            child: const Text('Cancel')),
        FilledButton(
          onPressed: _saving ? null : _save,
          style: FilledButton.styleFrom(backgroundColor: SpaersColors.brand),
          child: Text(_saving ? 'Saving…' : 'Save'),
        ),
      ],
    );
  }

  Widget _row(FamilyMember m) {
    final checked = _selected.contains(m.id);
    final disabled = !checked && _selected.length >= _max;
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: checked
            ? SpaersColors.red50
            : (disabled ? SpaersColors.slate50 : Colors.white),
        border: Border.all(
            color: checked ? SpaersColors.brand : SpaersColors.slate200),
        borderRadius: BorderRadius.circular(SpaersRadius.md),
      ),
      child: Opacity(
        opacity: disabled ? 0.6 : 1,
        child: Row(
          children: [
            Checkbox(
              value: checked,
              onChanged: disabled
                  ? null
                  : (_) => setState(() {
                        if (checked) {
                          _selected.remove(m.id);
                        } else if (_selected.length < _max) {
                          _selected.add(m.id);
                        }
                      }),
              activeColor: SpaersColors.brand,
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${m.firstName} ${m.lastName}',
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: SpaersColors.slate900)),
                  if (m.spaersId != null)
                    Text(m.spaersId!,
                        style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 10,
                            letterSpacing: 1.4,
                            color: SpaersColors.slate400)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
