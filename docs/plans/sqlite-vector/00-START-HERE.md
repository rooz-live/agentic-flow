# SQLiteVector - Start Here 🚀

**Ultra-fast SQLite vector database for agentic systems**

> Transform the internet into a multi-threaded reasoning fabric with a few CLI commands

---

## 📖 Quick Navigation

### New to SQLiteVector?
👉 **Start Here**: [README.md](./README.md) - Project overview, features, and quick start

### Want to Get Started?
👉 **Quick Start**: [QUICKSTART.md](./QUICKSTART.md) - 5-minute tutorial with code examples

### Planning Implementation?
👉 **Implementation Plan**: [SQLITE_VECTOR_PLAN.md](./SQLITE_VECTOR_PLAN.md) - Complete 10-week roadmap

### Executive Summary?
👉 **Summary**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Timeline, decisions, risks

### Technical Deep Dive?
👉 **Architecture**: [sqlite-vector-db/ARCHITECTURE_ANALYSIS.md](./sqlite-vector-db/ARCHITECTURE_ANALYSIS.md) - Technical analysis (74KB)

### QUIC Integration?
👉 **QUIC Strategy**: [INTEGRATION_WITH_QUIC.md](./INTEGRATION_WITH_QUIC.md) - Leverage Agentic Flow QUIC

### Project Status?
👉 **Status**: [PROJECT_COMPLETE.md](./PROJECT_COMPLETE.md) - Planning complete, ready for implementation

---

## 🎯 What is SQLiteVector?

SQLiteVector is a **portable, lightweight, memory-efficient** SQLite vector database optimized for agentic systems:

- 🚀 **Sub-millisecond queries** for 100k vectors
- 💾 **<10MB memory** per shard (typical)
- 🌐 **Cross-platform**: Rust + WASM (Linux, macOS, Windows, browser)
- ⚡ **QUIC sync**: Real-time shard synchronization
- 🧠 **ReasoningBank**: Pattern matching, experience curation
- 📦 **Dual distribution**: `npx sqlite-vector` + `npx sqlite-vector`

---

## 📦 Installation (After v1.0.0 Release)

### NPM/NPX
```bash
npx sqlite-vector
# or
npx sqlite-vector
```

### Rust Crate
```bash
npx sqlite-vector
```

---

## 🚀 Quick Example

### TypeScript/JavaScript
```typescript
import { SqliteVectorDB, Vector } from 'sqlite-vector';

const db = await SqliteVectorDB.new({ memoryMode: true });

await db.insertBatch([
  new Vector([0.1, 0.2, 0.3], { doc: "First" }),
  new Vector([0.4, 0.5, 0.6], { doc: "Second" })
]);

const results = await db.search(
  new Vector([0.15, 0.25, 0.35]),
  5,
  "cosine",
  0.7
);
```

### Rust
```rust
use sqlite_vector::{SqliteVectorDB, Vector, Config};

let mut db = SqliteVectorDB::new(Config::default())?;

db.insert_batch(vec![
    Vector::new(vec![0.1, 0.2, 0.3], Some(json!({"doc": "First"}))),
    Vector::new(vec![0.4, 0.5, 0.6], Some(json!({"doc": "Second"}))),
])?;

let results = db.search(
    &Vector::new(vec![0.15, 0.25, 0.35], None),
    5,
    SimilarityMetric::Cosine,
    Some(0.7)
)?;
```

---

## 📊 Project Status

- **Phase**: Planning Complete ✅
- **Timeline**: 10 weeks to v1.0.0
- **Team**: 2-4 developers required
- **Budget**: $0 (leverages free OSS infrastructure)
- **Risk**: Low-Medium (all risks mitigated)

**Next Phase**: Implementation (pending stakeholder approval)

---

## 📚 Documentation Map

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](./README.md) | Project overview | Everyone |
| [QUICKSTART.md](./QUICKSTART.md) | 5-minute tutorial | Developers |
| [SQLITE_VECTOR_PLAN.md](./SQLITE_VECTOR_PLAN.md) | Implementation plan | Engineering team |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Executive summary | Leadership |
| [INTEGRATION_WITH_QUIC.md](./INTEGRATION_WITH_QUIC.md) | QUIC integration | Architects |
| [PROJECT_COMPLETE.md](./PROJECT_COMPLETE.md) | Planning summary | Stakeholders |
| [sqlite-vector-db/](./sqlite-vector-db/) | Deep technical analysis | Specialists |

---

## ⏭️ Next Steps

### For Stakeholders
1. Review [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
2. Approve timeline and resource allocation
3. Assign development team

### For Engineering Team
1. Review [SQLITE_VECTOR_PLAN.md](./SQLITE_VECTOR_PLAN.md)
2. Study [ARCHITECTURE_ANALYSIS.md](./sqlite-vector-db/ARCHITECTURE_ANALYSIS.md)
3. Review [INTEGRATION_WITH_QUIC.md](./INTEGRATION_WITH_QUIC.md)
4. Prepare for Week 1 kickoff

### For Developers
1. Read [README.md](./README.md) for overview
2. Try [QUICKSTART.md](./QUICKSTART.md) examples
3. Explore API documentation (coming in implementation)

---

## 🤝 Contributing

We welcome contributions! Areas of focus:
- Performance optimization (SIMD, indexing)
- Cross-platform testing
- WASM size reduction
- ReasoningBank features
- Documentation and examples

---

## 📄 License

Licensed under either of:
- Apache License, Version 2.0
- MIT license

at your option.

---

**Built with ❤️ by the Agentic Flow Team**

*Transform the internet into a multi-threaded reasoning fabric* 🚀
