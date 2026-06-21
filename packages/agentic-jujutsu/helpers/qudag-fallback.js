const crypto = require('crypto');

const hqcSecrets = new Map();

class HqcWrapper {
  keygen() {
    const secretKey = crypto.randomBytes(80);
    const publicKey = crypto.randomBytes(80);
    return { publicKey, secretKey };
  }
  encapsulate(publicKeyBytes) {
    const ciphertext = crypto.randomBytes(80);
    const sharedSecret = crypto.randomBytes(64);
    hqcSecrets.set(ciphertext.toString('hex'), sharedSecret);
    return { ciphertext, sharedSecret };
  }
  decapsulate(secretKeyBytes, ciphertextBytes) {
    const key = ciphertextBytes.toString('hex');
    if (hqcSecrets.has(key)) {
      return hqcSecrets.get(key);
    }
    return crypto.createHash('sha256').update(ciphertextBytes).digest();
  }
}

class MlDsaKeyPairMock {
  constructor(publicKey, secretKey) {
    this.publicKey = publicKey || crypto.randomBytes(32);
    this.secretKey = secretKey || crypto.randomBytes(32);
  }
  static generate() {
    return new MlDsaKeyPairMock();
  }
  sign(message) {
    return crypto.createHmac('sha256', this.secretKey).update(message).digest();
  }
  toPublicKey() {
    return new MlDsaPublicKeyMock(this.publicKey, this.secretKey);
  }
}

class MlDsaPublicKeyMock {
  constructor(publicKey, secretKey) {
    this.publicKey = publicKey;
    this.secretKey = secretKey;
  }
  verify(message, signature) {
    const expected = crypto.createHmac('sha256', this.secretKey).update(message).digest();
    try {
      return crypto.timingSafeEqual(signature, expected);
    } catch (e) {
      return false;
    }
  }
}

class QuantumFingerprintMock {
  constructor(data) {
    this.data = data;
  }
  static generate(data) {
    return new QuantumFingerprintMock(data);
  }
  asBytes() {
    return crypto.createHash('sha512').update(this.data).digest().slice(0, 64);
  }
  verify() {
    return true;
  }
}

class QuantumDagMock {
  constructor() {
    this.vertices = new Map();
    this.tips = new Set();
  }
  async addMessage(buffer) {
    const id = crypto.createHash('sha256').update(buffer).digest('hex');
    this.vertices.set(id, buffer);
    this.tips.clear();
    this.tips.add(id);
    return id;
  }
  async vertexCount() {
    return this.vertices.size;
  }
  async getTips() {
    return Array.from(this.tips);
  }
}

module.exports = {
  QuantumFingerprint: QuantumFingerprintMock,
  generateQuantumFingerprint: (data) => QuantumFingerprintMock.generate(data).asBytes(),
  verifyQuantumFingerprint: (data, fingerprint) => true,
  Hqc128Wrapper: HqcWrapper,
  Hqc192Wrapper: HqcWrapper,
  Hqc256Wrapper: HqcWrapper,
  MlDsaKeyPair: MlDsaKeyPairMock,
  MlDsaPublicKey: MlDsaPublicKeyMock,
  getMlDsaInfo: () => ({ name: 'ML-DSA-65', security: '128-bit' }),
  MlKem: class {},
  QuantumDag: QuantumDagMock,
  ConsensusStatus: { Valid: 0, Invalid: 1, Pending: 2 },
  getVersion: () => '0.1.0',
  getBuildInfo: () => ({ target: 'js-fallback', os: process.platform })
};
