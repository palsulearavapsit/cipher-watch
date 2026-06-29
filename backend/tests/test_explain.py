"""Explanation layer: templater, cache, orchestration, and the no-hallucination
property (the reason names every tripped feature and invents none)."""

from datetime import datetime, timezone

from sentinel.engine.verdict import TrippedFeature, Verdict
from sentinel.explain import Explainer, ExplanationCache, GeminiClient, Templater, signature


TS = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _verdict(tripped, risk=90, source="transaction", is_anomaly=True):
    return Verdict(
        entity_id="user_1", source=source, timestamp=TS, is_anomaly=is_anomaly,
        risk_score=risk, stat_score=0.95, iforest_score=0.4, tripped_features=tuple(tripped),
    )


def _spike_verdict():
    return _verdict([
        TrippedFeature("count_in_window", 30, 3, "10.0σ above baseline", 1.0),
        TrippedFeature("amount", 600.0, 50.0, "9.2σ above baseline", 1.0),
    ])


def _geo_verdict():
    return _verdict(
        [TrippedFeature("geo", "XX", None, "new value not seen before", 0.7)],
        risk=70, source="auth",
    )


# ---- Templater ----
def test_templater_renders_spike_bullets():
    text = Templater().render(_spike_verdict())
    assert "Threat detected" in text and "90/100" in text
    assert "Transaction volume" in text and "30" in text
    assert "Transaction amount" in text and "600.0" in text


def test_templater_renders_geo_novelty():
    text = Templater().render(_geo_verdict())
    assert "Geographic location" in text and "XX" in text
    assert "new value not seen before" in text


def test_templater_no_tripped_features():
    text = Templater().render(_verdict([], risk=0, is_anomaly=False))
    assert "No anomaly" in text


# ---- no hallucination (golden-eval property) ----
def test_explanation_mentions_every_tripped_feature_and_no_other():
    text = Templater().render(_spike_verdict())
    # Names every tripped feature...
    assert "Transaction volume" in text
    assert "Transaction amount" in text
    # ...and introduces no feature that wasn't tripped.
    for absent in ("Geographic location", "Source IP", "Database deletes", "Login outcome"):
        assert absent not in text


# ---- cache ----
def test_cache_signature_groups_same_shape():
    a = _spike_verdict()
    b = _spike_verdict()
    assert signature(a) == signature(b)
    assert signature(a) != signature(_geo_verdict())


def test_cache_put_get_prime():
    cache = ExplanationCache()
    v = _spike_verdict()
    assert cache.get(v) is None
    cache.prime(v, "pre-generated reason")
    assert cache.get(v) == "pre-generated reason"
    assert len(cache) == 1


# ---- explainer orchestration ----
def test_explainer_skips_non_anomaly():
    assert Explainer().explain(_verdict([], risk=10, is_anomaly=False)) is None


def test_explainer_template_fallback_by_default():
    exp = Explainer().explain(_spike_verdict())
    assert exp is not None and exp.source == "template"
    assert "Transaction volume" in exp.text


def test_explainer_cache_hit_beats_template():
    cache = ExplanationCache()
    v = _spike_verdict()
    cache.prime(v, "cached reason")
    exp = Explainer(cache=cache).explain(v)
    assert exp.source == "cache" and exp.text == "cached reason"


def test_explainer_uses_gemini_when_enabled_and_caches():
    class _FakeGemini:
        available = True

        def try_explain(self, verdict):
            return "gemini reason"

    cache = ExplanationCache()
    explainer = Explainer(cache=cache, gemini=_FakeGemini(), use_gemini=True)
    v = _spike_verdict()
    exp = explainer.explain(v)
    assert exp.source == "gemini" and exp.text == "gemini reason"
    # subsequent identical anomaly serves from the warmed cache
    assert cache.get(v) == "gemini reason"


# ---- Gemini client (no key / SDK absent) ----
def test_gemini_unavailable_without_key():
    client = GeminiClient(api_key=None)
    assert client.available is False
    assert client.try_explain(_spike_verdict()) is None


def test_gemini_prompt_includes_only_tripped_features():
    prompt = GeminiClient().build_prompt(_spike_verdict())
    assert "count_in_window" in prompt and "amount" in prompt
    assert "geo" not in prompt  # not a tripped feature in this verdict
    assert "Do not" in prompt   # the no-hallucination instruction
