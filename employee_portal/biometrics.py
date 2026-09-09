"""Backend biometric boundary for the later AWS Rekognition integration.

The current PIN flow never collects face images. Production implementations
must enroll consented users and fail closed unless liveness and identity both
pass the configured thresholds.
"""
class BiometricProvider:
    name='not-configured'
    def enroll(self,*_): raise RuntimeError('Biometric provider is not configured.')
    def verify_liveness_and_identity(self,*_): raise RuntimeError('Biometric provider is not configured.')
