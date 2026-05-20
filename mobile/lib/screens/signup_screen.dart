import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../api/api.dart';
import '../theme.dart';
import '../utils/countries.dart';
import '../widgets/buttons.dart';
import '../widgets/inputs.dart';
import '../widgets/otp_input.dart';
import '../widgets/toast.dart';

const _kBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const _kMinAge = 13;

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});
  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  String? _pendingEmail;

  @override
  Widget build(BuildContext context) {
    if (_pendingEmail != null) {
      return _SignupOtpScreen(
        email: _pendingEmail!,
        onBack: () => setState(() => _pendingEmail = null),
      );
    }
    return _CitizenForm(onPending: (email) {
      setState(() => _pendingEmail = email);
      showToast(context, 'Verification code sent');
    });
  }
}

class _CitizenForm extends StatefulWidget {
  final ValueChanged<String> onPending;
  const _CitizenForm({required this.onPending});
  @override
  State<_CitizenForm> createState() => _CitizenFormState();
}

class _CitizenFormState extends State<_CitizenForm> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _allergies = TextEditingController();
  final _chronic = TextEditingController();

  DateTime? _dob;
  String? _country;
  String? _bloodGroup;
  bool _hasAllergies = false;
  bool _hasChronic = false;
  bool _implant = false;
  bool _submitting = false;

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    _allergies.dispose();
    _chronic.dispose();
    super.dispose();
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final maxAllowed = DateTime(now.year - _kMinAge, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: _dob ?? DateTime(now.year - 25, now.month, now.day),
      firstDate: DateTime(1900),
      lastDate: maxAllowed,
      helpText: 'Date of birth',
    );
    if (picked != null) setState(() => _dob = picked);
  }

  int? _ageFromDob(DateTime d) {
    final now = DateTime.now();
    var a = now.year - d.year;
    final m = now.month - d.month;
    if (m < 0 || (m == 0 && now.day < d.day)) a--;
    return a;
  }

  Future<void> _submit() async {
    if (_password.text != _confirmPassword.text) {
      showToast(context, 'Passwords do not match', error: true);
      return;
    }
    if (_password.text.length < 6) {
      showToast(context, 'Password must be at least 6 characters',
          error: true);
      return;
    }
    if (_dob == null) {
      showToast(context, 'Please enter a valid date of birth', error: true);
      return;
    }
    final age = _ageFromDob(_dob!);
    if (age != null && age < _kMinAge) {
      showToast(context,
          'You must be at least $_kMinAge years old to create an account.',
          error: true);
      return;
    }
    setState(() => _submitting = true);
    try {
      final res = await Api.instance.post('/citizens/signup', body: {
        'firstName': _firstName.text.trim(),
        'lastName': _lastName.text.trim(),
        'dob': DateFormat('yyyy-MM-dd').format(_dob!),
        'email': _email.text.trim().toLowerCase(),
        'phone': _phone.text.trim(),
        'country': _country?.toUpperCase(),
        'bloodGroup': _bloodGroup,
        'hasAllergies': _hasAllergies,
        'allergies': _hasAllergies ? _allergies.text.trim() : null,
        'hasChronicCondition': _hasChronic,
        'chronicCondition': _hasChronic ? _chronic.text.trim() : null,
        'implantDevice': _implant,
        'password': _password.text,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context,
            data['error']?.toString() ?? 'Failed to create account',
            error: true);
        return;
      }
      widget.onPending(_email.text.trim().toLowerCase());
    } catch (e) {
      if (!mounted) return;
      showToast(context, 'Network error. Is the server running?',
          error: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dial = dialCodeFor(_country);
    final dateLabel = _dob == null
        ? 'Select date'
        : DateFormat('MMM d, yyyy').format(_dob!);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create account'),
        leading: BackButton(onPressed: () => Navigator.of(context).pop()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 540),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Citizen Account',
                style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: SpaersColors.slate900),
              ),
              const SizedBox(height: 4),
              const Text(
                'Personal account for individuals seeking and offering help.',
                style:
                    TextStyle(fontSize: 13, color: SpaersColors.slate500),
              ),
              const SizedBox(height: 18),
              SpaersTextField(
                  label: 'First name',
                  controller: _firstName,
                  textCapitalization: TextCapitalization.words,
                  autofillHint: 'givenName'),
              const SizedBox(height: 14),
              SpaersTextField(
                  label: 'Last name',
                  controller: _lastName,
                  textCapitalization: TextCapitalization.words,
                  autofillHint: 'familyName'),
              const SizedBox(height: 14),
              GestureDetector(
                onTap: _pickDob,
                child: AbsorbPointer(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(bottom: 4),
                        child: Text('Date of birth',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: SpaersColors.slate700)),
                      ),
                      InputDecorator(
                        decoration: const InputDecoration(),
                        child: Text(
                          dateLabel,
                          style: TextStyle(
                              fontSize: 14,
                              color: _dob == null
                                  ? SpaersColors.slate400
                                  : SpaersColors.slate900),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              SpaersTextField(
                  label: 'Email',
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHint: 'email'),
              const SizedBox(height: 14),
              SpaersDropdown<String>(
                label: 'Country',
                value: _country,
                hint: 'Select country…',
                items: [
                  for (final c in sortedCountries)
                    DropdownMenuItem(value: c.code, child: Text(c.name)),
                ],
                onChanged: (v) => setState(() => _country = v),
              ),
              const SizedBox(height: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(bottom: 4),
                    child: Text('Phone number',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: SpaersColors.slate700)),
                  ),
                  Row(
                    children: [
                      Container(
                        height: 42,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: SpaersColors.slate50,
                          border: Border.all(color: SpaersColors.slate300),
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(SpaersRadius.md),
                            bottomLeft: Radius.circular(SpaersRadius.md),
                          ),
                        ),
                        child: Text(
                          dial == null ? '—' : '+$dial',
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: SpaersColors.slate600),
                        ),
                      ),
                      Expanded(
                        child: TextField(
                          controller: _phone,
                          enabled: dial != null,
                          keyboardType: TextInputType.phone,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                          decoration: InputDecoration(
                            hintText: dial == null
                                ? 'Select a country first'
                                : '700 000 000',
                            border: OutlineInputBorder(
                              borderRadius: const BorderRadius.only(
                                topRight: Radius.circular(SpaersRadius.md),
                                bottomRight: Radius.circular(SpaersRadius.md),
                              ),
                              borderSide: BorderSide(
                                  color: SpaersColors.slate300, width: 1),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: const BorderRadius.only(
                                topRight: Radius.circular(SpaersRadius.md),
                                bottomRight: Radius.circular(SpaersRadius.md),
                              ),
                              borderSide: BorderSide(
                                  color: SpaersColors.slate300, width: 1),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 14),
              SpaersDropdown<String>(
                label: 'Blood group',
                value: _bloodGroup,
                hint: 'Select…',
                items: [
                  for (final g in _kBloodGroups)
                    DropdownMenuItem(value: g, child: Text(g)),
                ],
                onChanged: (v) => setState(() => _bloodGroup = v),
              ),
              const SizedBox(height: 14),
              CheckboxTile(
                value: _hasAllergies,
                onChanged: (v) => setState(() => _hasAllergies = v ?? false),
                label: const Text('Allergies',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: SpaersColors.slate500,
                        letterSpacing: 1.4)),
              ),
              if (_hasAllergies) ...[
                const SizedBox(height: 8),
                SpaersTextField(
                  label: 'List your allergies',
                  controller: _allergies,
                  hint: 'penicillin, peanuts',
                  maxLines: 2,
                ),
              ],
              const SizedBox(height: 14),
              CheckboxTile(
                value: _hasChronic,
                onChanged: (v) => setState(() => _hasChronic = v ?? false),
                label: const Text('Chronic condition',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: SpaersColors.slate500,
                        letterSpacing: 1.4)),
              ),
              if (_hasChronic) ...[
                const SizedBox(height: 8),
                SpaersTextField(
                  label: 'Describe',
                  controller: _chronic,
                  hint: 'asthma, diabetes',
                  maxLines: 2,
                ),
              ],
              const SizedBox(height: 14),
              CheckboxListTile(
                value: _implant,
                onChanged: (v) => setState(() => _implant = v ?? false),
                title: const Text(
                  'I have an implanted medical device',
                  style: TextStyle(
                      fontSize: 14, color: SpaersColors.slate700),
                ),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                activeColor: SpaersColors.brand,
                dense: true,
              ),
              const SizedBox(height: 14),
              SpaersTextField(
                  label: 'Password',
                  controller: _password,
                  obscureText: true,
                  autofillHint: 'newPassword'),
              const SizedBox(height: 14),
              SpaersTextField(
                  label: 'Confirm password',
                  controller: _confirmPassword,
                  obscureText: true,
                  autofillHint: 'newPassword'),
              const SizedBox(height: 22),
              PrimaryButton(
                label: _submitting ? 'Creating account…' : 'Create account',
                onPressed: _submit,
                loading: _submitting,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SignupOtpScreen extends StatefulWidget {
  final String email;
  final VoidCallback onBack;
  const _SignupOtpScreen({required this.email, required this.onBack});

  @override
  State<_SignupOtpScreen> createState() => _SignupOtpScreenState();
}

class _SignupOtpScreenState extends State<_SignupOtpScreen> {
  String _code = '';
  bool _submitting = false;
  int _cooldown = 0;
  bool _resending = false;

  Future<void> _verify() async {
    if (_code.length < 6 || _submitting) return;
    setState(() => _submitting = true);
    try {
      final res = await Api.instance.post('/auth/verify-otp', body: {
        'role': 'citizen',
        'email': widget.email,
        'code': _code,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context,
            data['error']?.toString() ?? 'Verification failed',
            error: true);
        return;
      }
      if (!mounted) return;
      showToast(context, 'Email verified');
      Navigator.of(context).pushNamedAndRemoveUntil('/signin', (_) => false);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _resend() async {
    if (_cooldown > 0 || _resending) return;
    setState(() => _resending = true);
    try {
      final res = await Api.instance.post('/auth/resend-otp', body: {
        'role': 'citizen',
        'email': widget.email,
        'purpose': 'signup',
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        final retry = data['retryInS'] as num?;
        if (retry != null) setState(() => _cooldown = retry.toInt());
        showToast(context, data['error']?.toString() ?? 'Could not resend',
            error: true);
        return;
      }
      setState(() => _cooldown = 60);
      _tickDown();
      if (!mounted) return;
      showToast(context, 'New code sent');
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  Future<void> _tickDown() async {
    while (mounted && _cooldown > 0) {
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) setState(() => _cooldown -= 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verify your email'),
        leading: BackButton(onPressed: widget.onBack),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(SpaersRadius.lg),
              border: Border.all(color: SpaersColors.slate200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text.rich(
                  TextSpan(
                    text: 'We sent a 6-digit code to ',
                    style: const TextStyle(
                        fontSize: 14, color: SpaersColors.slate600),
                    children: [
                      TextSpan(
                        text: widget.email,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: SpaersColors.slate800),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                const Text('The code expires in 10 minutes.',
                    style: TextStyle(
                        fontSize: 12, color: SpaersColors.slate500)),
                const SizedBox(height: 18),
                OtpInput(onChanged: (v) => setState(() => _code = v)),
                const SizedBox(height: 18),
                PrimaryButton(
                  label: _submitting ? 'Verifying…' : 'Verify & continue',
                  onPressed: _code.length == 6 ? _verify : null,
                  loading: _submitting,
                ),
                const SizedBox(height: 12),
                Center(
                  child: _cooldown > 0
                      ? Text('Resend in ${_cooldown}s',
                          style: const TextStyle(
                              fontSize: 12, color: SpaersColors.slate400))
                      : TextButton(
                          onPressed: _resending ? null : _resend,
                          child: Text(
                            _resending ? 'Sending…' : 'Resend code',
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: SpaersColors.brand),
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
