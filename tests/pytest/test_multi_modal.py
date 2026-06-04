from src.embeddings.multi_modal import LogBERTEncoder, MultiModalEmbedder


def test_log_bert_encoder_initialization():
    """Test that LogBERTEncoder loads patterns and FQDN registries."""
    encoder = LogBERTEncoder()
    assert hasattr(encoder, 'known_patterns')
    assert hasattr(encoder, 'known_fqdns')
    assert hasattr(encoder, 'known_paths')

    # Should at least find billing.bhopti.com and crm.bhopti.com
    assert 'billing.bhopti.com' in encoder.known_fqdns
    assert 'crm.bhopti.com' in encoder.known_fqdns

    # Should find safe-degrade and guardrail-lock patterns
    assert 'safe-degrade' in encoder.known_patterns
    assert 'guardrail-lock' in encoder.known_patterns


def test_log_bert_encoder_feature_extraction():
    """Test that LogBERTEncoder extracts log features under constraints."""
    encoder = LogBERTEncoder()

    logs = [
        "[INFO] Initiating safe-degrade fallback for billing.bhopti.com",
        "[ERROR] Connection failed to crm.bhopti.com/health",
        "[WARN] Stripe webhook received at /webhooks/stripe"
    ]

    features = encoder._extract_features(logs)

    assert 'safe-degrade' in features.matched_patterns
    assert 'billing.bhopti.com' in features.matched_fqdns
    assert 'crm.bhopti.com' in features.matched_fqdns
    assert '/webhooks/stripe' in features.matched_paths
    assert '/health' in features.matched_paths


def test_log_bert_encoder_deterministic_embeddings():
    """Test that LogBERTEncoder produces deterministic embeddings."""
    encoder = LogBERTEncoder(embedding_dim=64)

    logs_a = [
        "[INFO] safe-degrade triggered for billing.bhopti.com"
    ]
    logs_b = [
        "[INFO] safe-degrade triggered for billing.bhopti.com"
    ]
    logs_c = [
        "[ERROR] guardrail-lock triggered for crm.bhopti.com"
    ]

    emb_a = encoder.encode(logs_a)
    emb_b = encoder.encode(logs_b)
    emb_c = encoder.encode(logs_c)

    assert len(emb_a) == 64
    assert emb_a == emb_b
    assert emb_a != emb_c


def test_multi_modal_embedder_integration():
    """Test integration with MultiModalEmbedder."""
    embedder = MultiModalEmbedder(output_dim=128)

    code_changes = "def handle_stripe_webhook(): pass"
    logs = ["[INFO] stripe_webhook_path parsed from fqdn_registry.yaml"]
    metrics = {"cpu_percent": [10.0, 15.0]}

    fused = embedder.embed_incident(code_changes, logs, metrics)
    assert len(fused) == 128
    assert all(isinstance(x, float) for x in fused)
