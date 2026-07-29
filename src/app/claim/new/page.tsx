'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Category = { id: string; name: string };

function ClaimForm() {
  const params = useSearchParams();
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState<'phone' | 'code' | 'business'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    layer: 'place' as 'place' | 'service_area',
    about: '',
    sizeM: 200 as 100 | 200 | 400,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  async function requestCode() {
    setLoading(true);
    setError(null);
    await fetch('/api/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    setStep('code');
  }

  async function verifyCode() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    setLoading(false);
    if (!res.ok) {
      setError('Неверный код');
      return;
    }
    const data = await res.json();
    setUserId(data.userId);
    setStep('business');
  }

  async function submitClaim() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const res = await fetch('/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerId: userId,
        lat,
        lng,
        sizeM: form.sizeM,
        categoryId: form.categoryId,
        layer: form.layer,
        name: form.name,
        phone,
        about: form.about,
      }),
    });
    setLoading(false);
    if (res.status === 409) {
      setError('Эта категория в этой клетке уже занята. Выберите другую категорию или клетку.');
      return;
    }
    if (!res.ok) {
      setError('Не получилось создать заявку');
      return;
    }
    const data = await res.json();

    const checkoutRes = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimId: data.claim.id }),
    });
    const checkout = await checkoutRes.json();
    if (checkout.url) window.location.href = checkout.url;
  }

  if (!lat || !lng) {
    return <p style={{ padding: 24 }}>Клетка не выбрана. Вернитесь на карту и тапните по клетке.</p>;
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
      <h1>Занять клетку</h1>
      <p style={{ color: '#666' }}>
        Координаты: {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>

      {step === 'phone' && (
        <>
          <input
            placeholder="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ width: '100%', padding: 10, marginBottom: 8 }}
          />
          <button disabled={loading || !phone} onClick={requestCode}>
            Получить код
          </button>
        </>
      )}

      {step === 'code' && (
        <>
          <input
            placeholder="Код из СМС"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ width: '100%', padding: 10, marginBottom: 8 }}
          />
          <button disabled={loading || !code} onClick={verifyCode}>
            Подтвердить
          </button>
        </>
      )}

      {step === 'business' && (
        <>
          <input
            placeholder="Название бизнеса"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ width: '100%', padding: 10, marginBottom: 8 }}
          />
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            style={{ width: '100%', padding: 10, marginBottom: 8 }}
          >
            <option value="">Выберите категорию</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={form.layer}
            onChange={(e) => setForm({ ...form, layer: e.target.value as 'place' | 'service_area' })}
            style={{ width: '100%', padding: 10, marginBottom: 8 }}
          >
            <option value="place">Место (есть адрес)</option>
            <option value="service_area">Выезд по району (без адреса)</option>
          </select>
          <textarea
            placeholder="Короткое описание"
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
            style={{ width: '100%', padding: 10, marginBottom: 8 }}
          />
          <button disabled={loading || !form.name || !form.categoryId} onClick={submitClaim}>
            Занять клетку и оплатить
          </button>
        </>
      )}

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  );
}

export default function ClaimNewPage() {
  return (
    <Suspense fallback={null}>
      <ClaimForm />
    </Suspense>
  );
}
