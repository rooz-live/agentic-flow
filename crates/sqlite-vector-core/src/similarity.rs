use crate::error::{Result, VectorError};

/// Compute cosine similarity between two vectors
///
/// Returns similarity in range [-1, 1] where:
/// - 1.0 = identical vectors
/// - 0.0 = orthogonal vectors
/// - -1.0 = opposite vectors
#[inline]
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> Result<f32> {
    if a.len() != b.len() {
        return Err(VectorError::DimensionMismatch {
            expected: a.len(),
            actual: b.len(),
        });
    }

    // Use SIMD-optimized implementation when available
    #[cfg(all(target_arch = "x86_64", target_feature = "avx2"))]
    {
        unsafe { Ok(cosine_similarity_avx2(a, b)) }
    }

    #[cfg(all(not(all(target_arch = "x86_64", target_feature = "avx2")), target_arch = "aarch64", target_feature = "neon"))]
    {
        unsafe { Ok(cosine_similarity_neon(a, b)) }
    }

    #[cfg(not(any(
        all(target_arch = "x86_64", target_feature = "avx2"),
        all(target_arch = "aarch64", target_feature = "neon")
    )))]
    {
        Ok(cosine_similarity_optimized(a, b))
    }
}

/// AVX2-optimized cosine similarity for x86_64
#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2")]
#[inline]
unsafe fn cosine_similarity_avx2(a: &[f32], b: &[f32]) -> f32 {
    #[cfg(target_arch = "x86_64")]
    use std::arch::x86_64::*;

    let len = a.len();
    let chunks = len / 8;

    let mut dot = _mm256_setzero_ps();
    let mut norm_a = _mm256_setzero_ps();
    let mut norm_b = _mm256_setzero_ps();

    // Process 8 floats at a time with AVX2
    for i in 0..chunks {
        let offset = i * 8;
        let va = _mm256_loadu_ps(a.as_ptr().add(offset));
        let vb = _mm256_loadu_ps(b.as_ptr().add(offset));

        // Dot product: dot += a * b
        dot = _mm256_fmadd_ps(va, vb, dot);

        // Norm A: norm_a += a * a
        norm_a = _mm256_fmadd_ps(va, va, norm_a);

        // Norm B: norm_b += b * b
        norm_b = _mm256_fmadd_ps(vb, vb, norm_b);
    }

    // Horizontal sum of 8 floats
    let mut dot_sum = horizontal_sum_avx2(dot);
    let mut norm_a_sum = horizontal_sum_avx2(norm_a);
    let mut norm_b_sum = horizontal_sum_avx2(norm_b);

    // Handle remainder with scalar operations
    for i in chunks * 8..len {
        let va = a[i];
        let vb = b[i];
        dot_sum += va * vb;
        norm_a_sum += va * va;
        norm_b_sum += vb * vb;
    }

    if norm_a_sum == 0.0 || norm_b_sum == 0.0 {
        return 0.0;
    }

    dot_sum / (norm_a_sum.sqrt() * norm_b_sum.sqrt())
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2")]
#[inline]
unsafe fn horizontal_sum_avx2(v: std::arch::x86_64::__m256) -> f32 {
    #[cfg(target_arch = "x86_64")]
    use std::arch::x86_64::*;

    // Add high and low 128-bit lanes
    let hi = _mm256_extractf128_ps(v, 1);
    let lo = _mm256_castps256_ps128(v);
    let sum_128 = _mm_add_ps(hi, lo);

    // Horizontal add within 128-bit
    let shuf = _mm_movehdup_ps(sum_128);
    let sums = _mm_add_ps(sum_128, shuf);
    let shuf = _mm_movehl_ps(shuf, sums);
    let sums = _mm_add_ss(sums, shuf);

    _mm_cvtss_f32(sums)
}

/// NEON-optimized cosine similarity for ARM
#[cfg(target_arch = "aarch64")]
#[target_feature(enable = "neon")]
#[inline]
unsafe fn cosine_similarity_neon(a: &[f32], b: &[f32]) -> f32 {
    #[cfg(target_arch = "aarch64")]
    use std::arch::aarch64::*;

    let len = a.len();
    let chunks = len / 4;

    let mut dot = vdupq_n_f32(0.0);
    let mut norm_a = vdupq_n_f32(0.0);
    let mut norm_b = vdupq_n_f32(0.0);

    // Process 4 floats at a time with NEON
    for i in 0..chunks {
        let offset = i * 4;
        let va = vld1q_f32(a.as_ptr().add(offset));
        let vb = vld1q_f32(b.as_ptr().add(offset));

        // Fused multiply-add
        dot = vmlaq_f32(dot, va, vb);
        norm_a = vmlaq_f32(norm_a, va, va);
        norm_b = vmlaq_f32(norm_b, vb, vb);
    }

    // Horizontal sum
    let mut dot_sum = vaddvq_f32(dot);
    let mut norm_a_sum = vaddvq_f32(norm_a);
    let mut norm_b_sum = vaddvq_f32(norm_b);

    // Handle remainder
    for i in chunks * 4..len {
        let va = a[i];
        let vb = b[i];
        dot_sum += va * vb;
        norm_a_sum += va * va;
        norm_b_sum += vb * vb;
    }

    if norm_a_sum == 0.0 || norm_b_sum == 0.0 {
        return 0.0;
    }

    dot_sum / (norm_a_sum.sqrt() * norm_b_sum.sqrt())
}

/// Optimized implementation with auto-vectorization hints
/// The compiler (LLVM) will auto-vectorize this with AVX2/NEON when available
#[inline]
fn cosine_similarity_optimized(a: &[f32], b: &[f32]) -> f32 {
    let len = a.len();

    // Process in chunks of 8 for better auto-vectorization
    let chunks = len / 8;

    let mut dot = 0.0f32;
    let mut norm_a = 0.0f32;
    let mut norm_b = 0.0f32;

    // Main loop - compiler will auto-vectorize this
    for i in 0..chunks * 8 {
        let va = a[i];
        let vb = b[i];
        dot += va * vb;
        norm_a += va * va;
        norm_b += vb * vb;
    }

    // Handle remainder
    for i in chunks * 8..len {
        let va = a[i];
        let vb = b[i];
        dot += va * vb;
        norm_a += va * va;
        norm_b += vb * vb;
    }

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot / (norm_a.sqrt() * norm_b.sqrt())
}

/// Scalar implementation (reference)
#[inline]
fn cosine_similarity_scalar(a: &[f32], b: &[f32]) -> f32 {
    let mut dot = 0.0f32;
    let mut norm_a = 0.0f32;
    let mut norm_b = 0.0f32;

    for i in 0..a.len() {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot / (norm_a.sqrt() * norm_b.sqrt())
}

/// Compute vector norm (L2 norm)
#[inline]
pub fn vector_norm(v: &[f32]) -> f32 {
    let mut sum = 0.0f32;
    for &x in v {
        sum += x * x;
    }
    sum.sqrt()
}

/// Normalize vector in-place to unit length
#[inline]
pub fn normalize_vector(v: &mut [f32]) {
    let norm = vector_norm(v);
    if norm > 0.0 {
        for x in v.iter_mut() {
            *x /= norm;
        }
    }
}

/// Serialize f32 vector to bytes (little-endian)
#[inline]
pub fn serialize_vector(v: &[f32]) -> Vec<u8> {
    bytemuck::cast_slice(v).to_vec()
}

/// Deserialize f32 vector from bytes (little-endian)
#[inline]
pub fn deserialize_vector(bytes: &[u8]) -> Result<Vec<f32>> {
    if bytes.len() % 4 != 0 {
        return Err(VectorError::InvalidVector(
            "Byte length must be multiple of 4".to_string()
        ));
    }

    Ok(bytemuck::cast_slice(bytes).to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![1.0, 2.0, 3.0];
        let sim = cosine_similarity(&a, &b).unwrap();
        assert!((sim - 1.0).abs() < 1e-6);

        let c = vec![1.0, 0.0, 0.0];
        let d = vec![0.0, 1.0, 0.0];
        let sim = cosine_similarity(&c, &d).unwrap();
        assert!(sim.abs() < 1e-6);
    }

    #[test]
    fn test_vector_norm() {
        let v = vec![3.0, 4.0];
        assert!((vector_norm(&v) - 5.0).abs() < 1e-6);
    }

    #[test]
    fn test_normalize() {
        let mut v = vec![3.0, 4.0];
        normalize_vector(&mut v);
        assert!((vector_norm(&v) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_serialization() {
        let v = vec![1.0, 2.0, 3.0];
        let bytes = serialize_vector(&v);
        let v2 = deserialize_vector(&bytes).unwrap();
        assert_eq!(v, v2);
    }
}
